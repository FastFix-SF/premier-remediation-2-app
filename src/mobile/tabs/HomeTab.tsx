import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MessageCircle, Calendar, QrCode, Clock, ChevronDown, ChevronUp, Briefcase, ClipboardList, Users } from 'lucide-react';
import { AssignmentConfirmationDialog } from '@/mobile/components/AssignmentConfirmationDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AIReviewQRModal } from '@/components/AIReviewQRModal';
import { AIReviewProjectSelectModal } from '@/mobile/components/AIReviewProjectSelectModal';
import { cn } from '@/lib/utils';
import { useProjectUpdates } from '@/hooks/useProjectUpdates';
import { formatDistanceToNow, format, isToday, startOfDay, isFuture, isPast, subWeeks, addWeeks } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type ActivityItem = {
  id: string;
  type: 'shift_assigned' | 'shift_created' | 'project_assignment';
  title: string;
  subtitle?: string;
  date: Date;
  status?: string;
  navigateTo: string;
  icon: 'calendar' | 'clipboard' | 'briefcase';
  color: string;
};

export const HomeTab: React.FC = () => {
  const {
    user
  } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [moreAppsOpen, setMoreAppsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [showProjectSelectModal, setShowProjectSelectModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
    address: string;
    description?: string;
    project_type?: string;
    roof_type?: string;
  } | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{
    id: string;
    title: string;
    location: string;
    date: string;
    startTime: string;
    type: 'job' | 'task';
  } | null>(null);
  
  // Lock state to prevent dialog from re-appearing while processing
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);
  
  // Use localStorage (not sessionStorage) to persist across app restarts
  const [respondedAssignments, setRespondedAssignments] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('respondedAssignments');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const { updates, loading: updatesLoading } = useProjectUpdates(8);

  // Persist respondedAssignments to localStorage
  useEffect(() => {
    localStorage.setItem('respondedAssignments', JSON.stringify([...respondedAssignments]));
  }, [respondedAssignments]);

  // Calculate date range for filtering (2 weeks before and after today)
  const dateRangeKey = format(new Date(), 'yyyy-MM-dd');
  const twoWeeksAgo = subWeeks(startOfDay(new Date()), 2);
  const twoWeeksFromNow = addWeeks(startOfDay(new Date()), 2);

  // Fetch user's assigned shifts and tasks (within 2 weeks before and after today)
  const { data: myShifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['my-shifts', user?.id, dateRangeKey],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('Fetching shifts between:', twoWeeksAgo.toISOString(), 'and', twoWeeksFromNow.toISOString());
      
      const { data, error } = await supabase
        .from('job_schedules')
        .select('*')
        .gte('start_time', twoWeeksAgo.toISOString())
        .lte('start_time', twoWeeksFromNow.toISOString())
        .order('start_time');
      
      if (error) throw error;
      
      // Filter: tasks/shifts where current user is assigned
      const filtered = (data || []).filter(shift => {
        const assignedUsers = Array.isArray(shift.assigned_users) ? shift.assigned_users : [];
        return assignedUsers.some((u: any) => u.user_id === user.id);
      });
      
      console.log('Filtered shifts count:', filtered.length);
      return filtered;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0, // Don't cache results
  });

  // Fetch project assignments for the user (within 2 weeks before and after today)
  const { data: myProjectAssignments = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['my-project-assignments', user?.id, dateRangeKey],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('Fetching project assignments between:', twoWeeksAgo.toISOString(), 'and', twoWeeksFromNow.toISOString());
      
      const { data, error } = await supabase
        .from('project_team_assignments')
        .select(`
          id,
          role,
          assigned_at,
          assignment_status,
          responded_at,
          project:projects(id, name, status, address)
        `)
        .eq('user_id', user.id)
        .gte('assigned_at', twoWeeksAgo.toISOString())
        .lte('assigned_at', twoWeeksFromNow.toISOString())
        .order('assigned_at', { ascending: false });
      
      if (error) throw error;
      console.log('Project assignments count:', data?.length);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    gcTime: 0, // Don't cache results
  });

  // Combine all activities into a unified feed
  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Add assigned shifts
    myShifts.forEach(shift => {
      items.push({
        id: `shift-${shift.id}`,
        type: 'shift_assigned',
        title: shift.job_name,
        subtitle: shift.location || undefined,
        date: new Date(shift.start_time),
        status: shift.status,
        navigateTo: `/mobile/shift/${shift.id}`,
        icon: 'calendar',
        color: 'bg-blue-500',
      });
    });

    // Add project assignments
    myProjectAssignments.forEach((assignment: any) => {
      if (assignment.project) {
        items.push({
          id: `project-${assignment.id}`,
          type: 'project_assignment',
          title: assignment.project.name,
          subtitle: assignment.project.address || `${t('home.assignedTo')}: ${assignment.role || t('common.teamMember')}`,
          date: new Date(assignment.assigned_at),
          status: assignment.project.status,
          navigateTo: `/mobile/projects/${assignment.project.id}`,
          icon: 'briefcase',
          color: 'bg-emerald-500',
        });
      }
    });

    // Sort by date (upcoming first, then by date)
    return items.sort((a, b) => {
      const aFuture = isFuture(a.date);
      const bFuture = isFuture(b.date);
      if (aFuture && !bFuture) return -1;
      if (!aFuture && bFuture) return 1;
      return a.date.getTime() - b.date.getTime();
    });
  }, [myShifts, myProjectAssignments]);

  const isLoading = shiftsLoading || projectsLoading;

  // Check for pending assignments on load (blocks app until user responds)
  // Only runs when not currently processing an assignment (prevents re-triggering)
  useEffect(() => {
    // Skip if no user, already showing a dialog, or currently processing
    if (!user?.id || pendingAssignment || isProcessingAssignment) return;

    // Check for pending job assignments - look inside assigned_users array for this user
    const pendingJob = myShifts.find(shift => {
      // Skip if already responded to in this session (localStorage persisted)
      if (respondedAssignments.has(shift.id)) return false;
      
      const assignedUsers = Array.isArray(shift.assigned_users) ? shift.assigned_users : [];
      const userAssignment = assignedUsers.find((u: any) => {
        if (typeof u !== 'object' || u === null) return false;
        const usrId = u.user_id || u.id;
        return usrId === user.id;
      });
      
      // Only show popup if user's assignment_status is explicitly 'pending'
      if (!userAssignment) return false;
      const status = (userAssignment as any).assignment_status;
      return status === 'pending';
    });

    if (pendingJob) {
      setIsProcessingAssignment(true); // Lock to prevent re-triggering
      setPendingAssignment({
        id: pendingJob.id,
        title: pendingJob.job_name,
        location: pendingJob.location || '',
        date: pendingJob.start_time,
        startTime: new Date(pendingJob.start_time).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        }),
        type: 'job',
      });
      return;
    }

    // Then check for pending project assignments
    const pendingProject = myProjectAssignments.find(
      (assignment: any) => !respondedAssignments.has(assignment.id) && assignment.assignment_status === 'pending'
    );

    if (pendingProject?.project) {
      setIsProcessingAssignment(true); // Lock to prevent re-triggering
      setPendingAssignment({
        id: pendingProject.id,
        title: pendingProject.project.name,
        location: pendingProject.project.address || '',
        date: pendingProject.assigned_at,
        startTime: new Date(pendingProject.assigned_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        }),
        type: 'task',
      });
    }
  }, [myShifts, myProjectAssignments, user?.id, pendingAssignment, respondedAssignments, isProcessingAssignment]);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.goodMorning') || 'Good morning';
    if (hour < 17) return t('home.goodAfternoon') || 'Good afternoon';
    return t('home.goodEvening') || 'Good evening';
  };
  useEffect(() => {
    setMounted(true);
  }, []);
  const quickActions = [{
    title: t('home.projects'),
    description: `📸 ${t('home.photos')}`,
    icon: Camera,
    action: () => navigate('/mobile/projects'),
    gradient: 'from-cyan-500 to-blue-600',
    iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-500',
    hoverGradient: 'hover:from-cyan-50 hover:to-blue-50 dark:hover:from-cyan-950/20 dark:hover:to-blue-950/20',
    badge: null
  }, {
    title: t('nav.messages'),
    description: `💬 ${t('home.chatWithFriends')}`,
    icon: MessageCircle,
    action: () => navigate('/mobile/messages'),
    gradient: 'from-indigo-500 to-purple-600',
    iconBg: 'bg-gradient-to-br from-indigo-400 to-purple-500',
    hoverGradient: 'hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/20 dark:hover:to-purple-950/20',
    badge: 5
  }, {
    title: 'Clock In',
    description: `⏰ ${t('timeClock.clockIn')}`,
    icon: Clock,
    action: () => navigate('/mobile/time-clock-old'),
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    hoverGradient: 'hover:from-emerald-50 hover:to-teal-50 dark:hover:from-emerald-950/20 dark:hover:from-teal-950/20',
    badge: null
  }];
  return <div className="p-3 xs:p-4 space-y-4 xs:space-y-6 overflow-x-hidden">
      {/* Enhanced Welcome Section */}
      <div className={cn("space-y-1 xs:space-y-2 transition-all duration-700", mounted ? "animate-fade-up" : "opacity-0 translate-y-4")}>
        <h1 className="text-xl xs:text-2xl font-bold text-foreground">
          {getGreeting()}!
        </h1>
        <p className="text-sm xs:text-base text-muted-foreground animate-gentle-glow truncate">
          {user?.email}
        </p>
      </div>

      {/* My Assignments */}
      <Card className={cn("transition-all duration-700 hover:shadow-lg", mounted ? "animate-fade-up" : "opacity-0 translate-y-4")} style={{
      animationDelay: '200ms'
    }}>
        <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 animate-gentle-glow" />
                  <span>{t('home.myAssignments')}</span>
                </div>
                {scheduleOpen ? <ChevronUp className="w-4 h-4 transition-transform duration-200" /> : <ChevronDown className="w-4 h-4 transition-transform duration-200" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ) : activities.length === 0 ? (
              <>
                  <p className="text-sm text-muted-foreground">
                    {t('home.noAssignments')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('home.assignmentsTip')}
                  </p>
                </>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {activities.map((activity) => {
                    const isTodays = isToday(activity.date);
                    const isPastDate = isPast(activity.date) && !isTodays;
                    const isDraft = activity.status === 'draft';
                    
                    const IconComponent = activity.icon === 'calendar' ? Calendar 
                      : activity.icon === 'briefcase' ? Briefcase 
                      : ClipboardList;
                    
                    return (
                      <div
                        key={activity.id}
                        onClick={() => navigate(activity.navigateTo)}
                        className={cn(
                          "p-3 rounded-lg cursor-pointer transition-all relative group hover:scale-[1.02]",
                          isDraft 
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-400/30 border-dashed' 
                            : isPastDate
                            ? 'bg-muted/30 hover:bg-muted/50'
                            : 'bg-muted/50 hover:bg-muted'
                        )}
                      >
                        {isDraft && (
                          <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            DRAFT
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0",
                            activity.color,
                            isPastDate && "opacity-60"
                          )}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium text-foreground truncate",
                              isPastDate && "text-muted-foreground"
                            )}>
                              {activity.title}
                            </p>
                            {activity.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {activity.subtitle}
                              </p>
                            )}
                            <p className={cn(
                              "text-xs mt-1",
                              isTodays ? "text-primary font-medium" : "text-muted-foreground"
                            )}>
                              {isTodays ? `📍 ${t('home.today')}` : format(activity.date, 'EEE, MMM d')} • {format(activity.date, 'h:mm a')}
                            </p>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground rotate-[-90deg] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Enhanced Quick Actions */}
      <div className={cn("space-y-3 transition-all duration-700", mounted ? "animate-fade-up" : "opacity-0 translate-y-4")} style={{
      animationDelay: '400ms'
    }}>
        <h2 className="text-lg font-semibold text-foreground">{t('home.quickActions')}</h2>
        <div className="space-y-3">
          {quickActions.map((action, index) => {
          const Icon = action.icon;
          return <Button 
            key={action.title} 
            variant="outline" 
            onClick={action.action} 
            className={cn(
              "group w-full h-auto p-4 justify-start space-x-4",
              "transition-all duration-300 ease-out",
              "hover:scale-105 hover:shadow-lg active:scale-95",
              `bg-gradient-to-br ${action.gradient}/90`,
              "border-0 shadow-sm rounded-xl",
              mounted ? "animate-fade-up" : "opacity-0 translate-y-4"
            )} 
            style={{
              animationDelay: `${600 + index * 100}ms`
            }}
          >
            <div className="relative">
              <div className={cn(
                "p-2 rounded-lg flex items-center justify-center",
                action.iconBg,
                "group-hover:scale-110 transition-all duration-300"
              )}>
                <Icon className="w-5 h-5 text-white animate-subtle-bounce hover:animate-gentle-glow transition-all duration-300" />
              </div>
              {action.badge && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-background animate-pulse">
                  {action.badge}
                </div>
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-medium text-white group-hover:text-white/90 transition-colors duration-300">
                {action.title}
              </div>
              <div className="text-sm text-white/80 group-hover:text-white/70 transition-colors duration-300">
                {action.description}
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-white/60 transition-all duration-300 group-hover:animate-soft-ripple" />
          </Button>;
        })}
        </div>
      </div>

      {/* More Apps Collapsible Section */}
      <div className={cn("transition-all duration-700", mounted ? "animate-fade-up" : "opacity-0 translate-y-4")} style={{
      animationDelay: '800ms'
    }}>
        <Collapsible open={moreAppsOpen} onOpenChange={setMoreAppsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground transition-colors duration-300">
              <span className="text-sm font-medium">{t('home.moreApps')}</span>
              {moreAppsOpen ? <ChevronUp className="w-4 h-4 transition-transform duration-200" /> : <ChevronDown className="w-4 h-4 transition-transform duration-200" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            <Button variant="outline" onClick={() => setShowProjectSelectModal(true)} className={cn("group w-full h-auto p-4 justify-start space-x-4", "transition-all duration-300 ease-out", "hover:scale-105 hover:shadow-lg active:scale-95", "bg-gradient-to-br from-orange-500/90 to-red-600/90", "hover:from-orange-400/30 hover:to-red-500/30", "border-0 shadow-sm")}>
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-400 to-red-500 group-hover:scale-110 transition-all duration-300">
                <QrCode className="w-5 h-5 text-white animate-subtle-bounce hover:animate-gentle-glow transition-all duration-300" />
              </div>
              <div className="text-left flex-1">
                <div className="font-medium group-hover:text-primary transition-colors duration-300">
                  {t('home.aiReview')}
                </div>
                <div className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors duration-300">{t('home.aiReviewDesc')}</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary/60 transition-all duration-300 group-hover:animate-soft-ripple" />
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Enhanced Recent Activity */}
      <Card className={cn("transition-all duration-700 hover:shadow-lg", mounted ? "animate-fade-up" : "opacity-0 translate-y-4")} style={{
      animationDelay: '900ms'
    }}>
        <Collapsible open={updatesOpen} onOpenChange={setUpdatesOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t('home.recentProjectUpdates')}</span>
                {updatesOpen ? <ChevronUp className="w-4 h-4 transition-transform duration-200" /> : <ChevronDown className="w-4 h-4 transition-transform duration-200" />}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {updatesLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-muted animate-gentle-pulse flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('home.loadingUpdates')}</p>
                  </div>
                </div>
              ) : updates.length === 0 ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-muted animate-gentle-pulse flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('home.noRecentActivity')}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {t('home.activityWillAppear')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {updates.map((update, index) => (
                    <div 
                      key={update.id} 
                      className="flex items-start space-x-3 group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                      onClick={() => update.projectId && navigate(`/mobile/projects`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                        {update.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {update.projectName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {update.description}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(update.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <AIReviewProjectSelectModal
        isOpen={showProjectSelectModal}
        onClose={() => setShowProjectSelectModal(false)}
        onSelectProject={(project) => {
          setSelectedProject(project);
          setShowProjectSelectModal(false);
          setShowQRModal(true);
        }}
      />

      <AIReviewQRModal 
        isOpen={showQRModal} 
        onClose={() => {
          setShowQRModal(false);
          setSelectedProject(null);
        }}
        selectedProject={selectedProject}
      />

      <AssignmentConfirmationDialog
        assignment={pendingAssignment}
        open={!!pendingAssignment}
        onOpenChange={(open) => {
          // Don't allow closing without action - user must confirm or reject
          if (!open && pendingAssignment) return;
          if (!open) setPendingAssignment(null);
        }}
        onConfirm={async () => {
          if (pendingAssignment) {
            // Add to responded set immediately to prevent re-showing
            setRespondedAssignments(prev => new Set(prev).add(pendingAssignment.id));
          }
          setPendingAssignment(null);
          
          // Wait for data to refresh before unlocking
          try {
            await Promise.all([refetchShifts(), refetchProjects()]);
          } finally {
            // Only unlock after refetch completes to prevent race conditions
            setIsProcessingAssignment(false);
          }
        }}
      />
    </div>;
};