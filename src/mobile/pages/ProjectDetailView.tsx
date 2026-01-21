import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, MessageSquare, Users, Camera, Settings, Trash2, CheckSquare, ChevronDown, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useMobileProject } from '@/mobile/hooks/useMobileProjects';
import { useMobilePhotos, useMobilePhotoDelete, useMobilePhotoUpdate } from '@/mobile/hooks/useMobilePhotos';
import { useMobileVideos, useMobileVideoDelete } from '@/mobile/hooks/useMobileVideos';
import { useMobileProjectTeam, useMobileCustomerInfo } from '@/mobile/hooks/useMobileProjectDetails';
import { useAuth } from '@/contexts/AuthContext';
import { useMobilePermissions } from '../hooks/useMobilePermissions';
import { useTeamMember } from '@/hooks/useTeamMember';
import { ProjectHeader } from '@/mobile/components/ProjectHeader';
import { ProjectPhotoGallery } from '@/mobile/components/ProjectPhotoGallery';
import { ProjectPhotoCaptureModal } from '@/mobile/components/ProjectPhotoCaptureModal';
import { ProjectVideoCaptureModal } from '@/mobile/components/ProjectVideoCaptureModal';
import { ProjectSettingsModal } from '@/mobile/components/ProjectSettingsModal';
import { TeamManagementModal } from '@/mobile/components/TeamManagementModal';
import { ProjectChatModal } from '@/mobile/components/ProjectChatModal';
import { ProjectTasksModal } from '@/mobile/components/ProjectTasksModal';

import { ProjectInvoicesModal } from '@/mobile/components/ProjectInvoicesModal';
import { CreateReportModal } from '@/mobile/components/CreateReportModal';
import { UploadFileModal } from '@/mobile/components/UploadFileModal';
import { ProjectDocumentsModal } from '@/mobile/components/ProjectDocumentsModal';
import { DEFAULT_LABELS } from '@/mobile/constants/labels';
export const ProjectDetailView: React.FC = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    projectPermissions
  } = useMobilePermissions(id);
  const {
    getDisplayName,
    getInitials
  } = useTeamMember();
  const [showPhotoCaptureModal, setShowPhotoCaptureModal] = useState(false);
  const [showVideoCaptureModal, setShowVideoCaptureModal] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showProjectChat, setShowProjectChat] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const [initialPhotoIndex, setInitialPhotoIndex] = useState<number | null>(null);
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError
  } = useMobileProject(id || '');
  const {
    data: photos = []
  } = useMobilePhotos(id || '');
  const {
    data: videos = []
  } = useMobileVideos(id || '');
  const {
    data: teamAssignments = []
  } = useMobileProjectTeam(id || '');
  const {
    data: customerInfo
  } = useMobileCustomerInfo(project?.customer_email);
  const deletePhotoMutation = useMobilePhotoDelete();
  const updatePhotoMutation = useMobilePhotoUpdate();
  const deleteVideoMutation = useMobileVideoDelete();
  const canEdit = projectPermissions.canEdit;
  const canDelete = projectPermissions.canDelete;
  const handleDeletePhoto = async (photoId: string) => {
    try {
      await deletePhotoMutation.mutateAsync(photoId);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  const handleUpdatePhoto = async (photoId: string, file: File) => {
    try {
      await updatePhotoMutation.mutateAsync({ photoId, file });
    } catch (error) {
      console.error('Failed to update photo:', error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteVideoMutation.mutateAsync(videoId);
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };
  if (projectLoading) {
    return <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading project...</p>
      </div>;
  }
  if (projectError || !project) {
    return <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-destructive">Failed to load project</p>
        <Button onClick={() => navigate('/mobile/projects')}>
          Back to Projects
        </Button>
      </div>;
  }
  const handleProjectEdit = (field: string, value: any) => {
    // Open project settings modal for editing
    setShowProjectSettings(true);
  };
  return <div className="flex flex-col h-full bg-muted/30 overflow-y-auto">
      {/* Enhanced Header with integrated action bar */}
      <ProjectHeader 
        project={project} 
        photos={photos} 
        videos={videos}
        teamCount={teamAssignments.length}
        teamMembers={teamAssignments}
        onEdit={handleProjectEdit} 
        onSeeAllPhotos={() => {
          setInitialPhotoIndex(null);
          setShowPhotoGallery(true);
        }} 
        onPhotoClick={index => {
          setInitialPhotoIndex(index);
          setShowPhotoGallery(true);
        }}
        onPaymentsClick={() => setShowInvoices(true)}
        onClientClick={() => setShowProjectSettings(true)}
        onTeamClick={() => setShowTeamManagement(true)}
        onTasksClick={() => setShowTasks(true)}
        onReportsClick={() => setShowReportsModal(true)}
        onFilesClick={() => setShowFilesModal(true)}
        onPlusClick={() => setShowProjectSettings(true)}
        onCameraClick={() => setShowPhotoCaptureModal(true)}
        onChatClick={() => setShowProjectChat(true)}
        onCreateReportClick={() => setShowCreateReport(true)}
        onUploadFileClick={() => setShowUploadFile(true)}
        onUploadVideoClick={() => setShowVideoCaptureModal(true)}
      />

      {/* Photo Gallery Dialog */}
      <Dialog open={showPhotoGallery} onOpenChange={setShowPhotoGallery}>
        <DialogContent className="max-w-md h-auto max-h-[70vh] p-0 bg-background">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Project Photos</DialogTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPhotoGallery(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <ProjectPhotoGallery 
              projectId={id || ''} 
              photos={photos} 
              videos={videos}
              onDeletePhoto={handleDeletePhoto} 
              onDeleteVideo={handleDeleteVideo}
              onUpdatePhoto={handleUpdatePhoto}
              initialPhotoIndex={initialPhotoIndex} 
              onTakePhoto={() => {
                setShowPhotoGallery(false);
                setShowPhotoCaptureModal(true);
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      {id && <>
          <ProjectPhotoCaptureModal isOpen={showPhotoCaptureModal} onClose={() => setShowPhotoCaptureModal(false)} projectId={id} />
          
          <ProjectVideoCaptureModal isOpen={showVideoCaptureModal} onClose={() => setShowVideoCaptureModal(false)} projectId={id} />
          
          <ProjectSettingsModal isOpen={showProjectSettings} onClose={() => setShowProjectSettings(false)} project={project} />
          
          <TeamManagementModal isOpen={showTeamManagement} onClose={() => setShowTeamManagement(false)} projectId={id} currentTeam={teamAssignments} />
          
          <ProjectChatModal isOpen={showProjectChat} onClose={() => setShowProjectChat(false)} projectId={id} projectName={project?.name || 'Project'} />
          
          <ProjectTasksModal isOpen={showTasks} onClose={() => setShowTasks(false)} projectId={id} projectName={project?.name || 'Project'} />
          
          <ProjectInvoicesModal 
            isOpen={showInvoices} 
            onClose={() => setShowInvoices(false)} 
            projectId={id} 
            projectName={project?.name || 'Project'}
            clientName={project?.client_name}
            clientEmail={project?.customer_email}
            address={project?.address}
          />
          
          <CreateReportModal
            isOpen={showCreateReport}
            onClose={() => setShowCreateReport(false)}
            projectId={id}
            projectName={project?.name || 'Project'}
          />
          
          <UploadFileModal
            isOpen={showUploadFile}
            onClose={() => setShowUploadFile(false)}
            projectId={id}
          />
          
          <ProjectDocumentsModal
            isOpen={showReportsModal}
            onClose={() => setShowReportsModal(false)}
            projectId={id}
            category="reports"
            title="Reports"
          />
          
          <ProjectDocumentsModal
            isOpen={showFilesModal}
            onClose={() => setShowFilesModal(false)}
            projectId={id}
            category="files"
            title="Files"
          />
        </>}
    </div>;
};