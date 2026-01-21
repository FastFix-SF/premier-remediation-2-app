import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Hook for fetching work activities
export const useMobileWorkActivities = (projectId: string) => {
  return useQuery({
    queryKey: ['mobile-work-activities', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('work_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
};

// Hook for fetching job schedules
export const useMobileJobSchedules = (projectId: string) => {
  return useQuery({
    queryKey: ['mobile-job-schedules', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_schedules')
        .select('*')
        .eq('project_id', projectId)
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
};

// Hook for fetching project status updates
export const useMobileProjectStatusUpdates = (projectId: string) => {
  return useQuery({
    queryKey: ['mobile-project-status-updates', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_status_updates')
        .select(`
          *,
          profiles:user_id (
            display_name
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
};

// Hook for fetching customer information from leads
export const useMobileCustomerInfo = (customerEmail?: string) => {
  return useQuery({
    queryKey: ['mobile-customer-info', customerEmail],
    queryFn: async () => {
      if (!customerEmail) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('email', customerEmail)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!customerEmail,
  });
};

// Hook for fetching project team assignments
export const useMobileProjectTeam = (projectId: string) => {
  return useQuery({
    queryKey: ['mobile-project-team', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_team_assignments')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
};

// Hook for generating AI summary
export const useMobileProjectAISummary = (projectId: string, projectData?: any) => {
  return useQuery({
    queryKey: ['mobile-project-ai-summary', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: `Please provide a comprehensive AI summary for project ${projectData?.name || projectId}. 
          Include project health status, key insights, potential issues, progress analysis, and recommendations.
          Project Status: ${projectData?.status}
          Customer: ${projectData?.customer_email || 'Not specified'}
          Address: ${projectData?.address || 'Not specified'}
          
          Generate a professional summary focusing on project status, progress, and any actionable insights.`
        }
      });

      if (error) throw error;
      return data?.response || 'Unable to generate AI summary at this time.';
    },
    enabled: !!projectId && !!projectData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};