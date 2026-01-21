import React, { useState } from 'react';
import { ArrowLeft, MapPin, Star, Users, Camera, Home, DollarSign, CheckSquare, FileText, FolderOpen, ChevronRight, Plus, MessageSquare, ClipboardList, Receipt, Settings, X, Video, Play } from 'lucide-react';
import { MobileProjectVideo } from '@/mobile/hooks/useMobileVideos';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface TeamMember {
  id: string;
  user_id: string;
  initials?: string;
}

interface ProjectHeaderProps {
  project: any;
  photos: any[];
  videos?: MobileProjectVideo[];
  teamCount?: number;
  teamMembers?: TeamMember[];
  onEdit?: (field: string, value: any) => void;
  onSeeAllPhotos?: () => void;
  onPhotoClick?: (index: number) => void;
  onPaymentsClick?: () => void;
  onClientClick?: () => void;
  onTeamClick?: () => void;
  onTasksClick?: () => void;
  onReportsClick?: () => void;
  onFilesClick?: () => void;
  // Action bar props
  onPlusClick?: () => void;
  onCameraClick?: () => void;
  onChatClick?: () => void;
  // Quick action creation props
  onCreateReportClick?: () => void;
  onUploadFileClick?: () => void;
  onUploadVideoClick?: () => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  photos,
  videos = [],
  teamCount = 0,
  teamMembers = [],
  onSeeAllPhotos,
  onPhotoClick,
  onPaymentsClick,
  onClientClick,
  onTeamClick,
  onTasksClick,
  onReportsClick,
  onFilesClick,
  onPlusClick,
  onCameraClick,
  onChatClick,
  onCreateReportClick,
  onUploadFileClick,
  onUploadVideoClick
}) => {
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const getInitials = (userId: string) => {
    // Generate initials from user_id (first 2 chars uppercase)
    return userId.substring(0, 2).toUpperCase();
  };
  const navigate = useNavigate();
  const heroPhoto = photos.find(p => p.is_highlighted_after) || photos[0];
  
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

  const handleQuickAction = (action: (() => void) | undefined) => {
    setShowQuickActions(false);
    if (action) {
      action();
    }
  };

  return (
    <div className="relative">
      {/* Hero Image Background */}
      {heroPhoto && (
        <div className="absolute inset-0 w-full h-48 overflow-hidden">
          <img src={heroPhoto.photo_url} alt="Project hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-background/20" />
        </div>
      )}

      {/* Header Content */}
      <div className="relative z-10 p-4 pb-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/projects')} className="bg-background/80 backdrop-blur-sm border border-border/50">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Project Info Card */}
        <Card className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-card">
          <CardContent className="p-6">
            {/* Project Name */}
            <div className="mb-3">
              <h1 className="text-xl font-semibold text-foreground">{project.name}</h1>
            </div>

            {/* Address - Clickable to open in Maps */}
            {project.address && (
              <button 
                onClick={() => {
                  const encodedAddress = encodeURIComponent(project.address);
                  // Check if iOS (will open Apple Maps) or Android/other (Google Maps)
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  const mapsUrl = isIOS 
                    ? `maps://maps.apple.com/?q=${encodedAddress}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                  window.open(mapsUrl, '_blank');
                }}
                className="flex items-start space-x-2 mb-2 group text-left"
              >
                <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-primary group-hover:underline">{project.address}</span>
              </button>
            )}

            {/* Client Name with House Icon */}
            {project.client_name && (
              <button 
                onClick={onClientClick}
                className="flex items-center space-x-2 mb-2 group"
              >
                <Home className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium group-hover:underline">{project.client_name}</span>
                <ChevronRight className="w-3 h-3 text-primary opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Team Members with Initials */}
            {teamMembers.length > 0 && (
              <button 
                onClick={onTeamClick}
                className="flex items-center space-x-2 mb-2 group"
              >
                <Users className="w-4 h-4 text-primary" />
                <div className="flex -space-x-1">
                  {teamMembers.slice(0, 5).map((member, index) => (
                    <Avatar key={member.id || index} className="w-6 h-6 border-2 border-background ring-1 ring-primary/20">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                        {member.initials || getInitials(member.user_id)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {teamMembers.length > 5 && (
                    <Avatar className="w-6 h-6 border-2 border-background ring-1 ring-primary/20">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                        +{teamMembers.length - 5}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <ChevronRight className="w-3 h-3 text-primary opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* Payments */}
            <button 
              onClick={onPaymentsClick}
              className="flex items-center space-x-2 mb-4 group"
            >
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium group-hover:underline">Payments</span>
              <ChevronRight className="w-3 h-3 text-primary opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Quick Stats */}
            <div className="flex items-center justify-around pt-4 border-t border-border/50">
              <div className="flex flex-col items-center px-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1.5">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <span className="text-base font-semibold text-foreground">{photos.length + videos.length}</span>
                <p className="text-xs text-muted-foreground">Media</p>
              </div>
              
              <div className="w-px h-12 bg-border/50" />
              
              <div className="flex flex-col items-center px-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-1.5">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <span className="text-base font-semibold text-foreground">
                  {project.rating ? project.rating.toFixed(1) : '--'}
                </span>
                <p className="text-xs text-muted-foreground">Rating</p>
              </div>
              
              <div className="w-px h-12 bg-border/50" />
              
              <div className="flex flex-col items-center px-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-1.5">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-base font-semibold text-foreground">{teamCount}</span>
                <p className="text-xs text-muted-foreground">Team</p>
              </div>
            </div>

            {/* Media Thumbnails (Photos + Videos) */}
            {(photos.length > 0 || videos.length > 0) && (() => {
              // Combine photos and videos into a unified media array, sorted by date
              const allMedia = [
                ...photos.map(p => ({ ...p, type: 'photo' as const, url: p.photo_url })),
                ...videos.map(v => ({ ...v, type: 'video' as const, url: v.video_url }))
              ].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
              
              const totalMedia = allMedia.length;
              
              return (
                <div className="pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Media</span>
                    {onSeeAllPhotos && totalMedia > 4 && (
                      <button 
                        onClick={onSeeAllPhotos}
                        className="text-xs text-primary hover:underline"
                      >
                        See all ({totalMedia})
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {allMedia.slice(0, 4).map((media, index) => (
                      <button
                        key={media.id || index}
                        onClick={() => onSeeAllPhotos?.()}
                        className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors relative"
                      >
                        {media.type === 'photo' ? (
                          <img 
                            src={media.url} 
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            <video 
                              src={media.url} 
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                            {/* Play icon overlay for videos */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-4 h-4 text-foreground ml-0.5" />
                              </div>
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Status and Updated */}
            <div className="flex items-center space-x-4 pt-4 border-t border-border/50">
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
              
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <span>Updated {formatDistanceToNow(new Date(project.updated_at), {
                  addSuffix: true
                })}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border/50 space-y-1.5">
              {onTasksClick && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onTasksClick} 
                  className="w-full text-xs h-9"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                  Tasks
                </Button>
              )}
              {onReportsClick && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onReportsClick} 
                  className="w-full text-xs h-9"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Reports
                </Button>
              )}
              {onFilesClick && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onFilesClick} 
                  className="w-full text-xs h-9"
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                  Files
                </Button>
              )}
            </div>

            {/* Quick Action Bar */}
            {(onPlusClick || onCameraClick || onChatClick) && (
              <div className="flex justify-center pt-4 border-t border-border/50">
                <div className="flex items-center gap-2 bg-primary rounded-full px-4 py-2 shadow-lg">
                  {(onPlusClick || onTasksClick || onReportsClick || onFilesClick) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowQuickActions(true)}
                      className="h-12 w-12 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  )}
                  {onCameraClick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onCameraClick}
                      className="h-12 w-12 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      <Camera className="h-6 w-6" />
                    </Button>
                  )}
                  {onChatClick && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onChatClick}
                      className="h-12 w-12 rounded-full text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      <MessageSquare className="h-6 w-6" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Bottom Sheet */}
      <Sheet open={showQuickActions} onOpenChange={setShowQuickActions}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
            <Button variant="ghost" size="icon" onClick={() => setShowQuickActions(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 pb-6">
            {onCameraClick && (
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction(onCameraClick)}
              >
                <Camera className="h-6 w-6 text-primary" />
                <span>Upload Photos</span>
              </Button>
            )}
            {onUploadVideoClick && (
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction(onUploadVideoClick)}
              >
                <Video className="h-6 w-6 text-primary" />
                <span>Upload Video</span>
              </Button>
            )}
            {onUploadFileClick && (
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction(onUploadFileClick)}
              >
                <FolderOpen className="h-6 w-6 text-primary" />
                <span>Upload File</span>
              </Button>
            )}
            {onTasksClick && (
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction(onTasksClick)}
              >
                <CheckSquare className="h-6 w-6 text-primary" />
                <span>Create Task</span>
              </Button>
            )}
            {onCreateReportClick && (
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction(onCreateReportClick)}
              >
                <ClipboardList className="h-6 w-6 text-primary" />
                <span>Create Report</span>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
