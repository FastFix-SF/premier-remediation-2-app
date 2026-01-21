
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

// Allowed admin phone numbers - these bypass all DB checks
const ALLOWED_ADMIN_PHONES = ['+15106196839'];
// Allowed admin user IDs - fallback if phone check fails
const ALLOWED_ADMIN_USER_IDS = ['73d1e0d1-4b28-46df-baea-441f922d991c'];

export const useAdminStatus = () => {
  const { user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: ['admin-status', user?.id],
    queryFn: async () => {
      if (!user) {
        return { isAdmin: false, isOwner: false, isLeader: false, user: null }
      }

      // Check if user's phone is in the allowed list - bypass all DB checks
      const userPhone = user.phone || '';
      console.log('useAdminStatus - checking user:', { id: user.id, phone: userPhone });

      if (ALLOWED_ADMIN_PHONES.includes(userPhone) || ALLOWED_ADMIN_USER_IDS.includes(user.id)) {
        console.log('Admin access granted for allowed user:', { phone: userPhone, id: user.id });
        return {
          isAdmin: true,
          isOwner: true,
          isLeader: false,
          user
        }
      }

      // Check if user is in admin_users table
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      // Check if user is owner or admin in team_directory (including secondary_role)
      const { data: teamMember } = await supabase
        .from('team_directory')
        .select('role, secondary_role, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      // Check both primary and secondary roles for admin/owner/leader status
      const isAdmin = !!adminUser ||
                      teamMember?.role === 'admin' ||
                      teamMember?.secondary_role === 'admin'
      const isOwner = teamMember?.role === 'owner' ||
                      teamMember?.secondary_role === 'owner'
      const isLeader = teamMember?.role === 'leader' ||
                       teamMember?.secondary_role === 'leader'

      console.log('Admin status check:', {
        userId: user.id,
        phone: user.phone,
        isAdmin,
        isOwner,
        isLeader,
        teamRole: teamMember?.role,
        secondaryRole: teamMember?.secondary_role,
        hasAdminRecord: !!adminUser,
        result: isAdmin || isOwner
      })

      return {
        isAdmin: isAdmin || isOwner,
        isOwner,
        isLeader,
        user
      }
    },
    enabled: !authLoading && !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1000,
  })
}
