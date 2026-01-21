import React, { useState, useRef } from 'react';
import { Camera, Upload, Edit, X, Check, ImagePlus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMobilePhotoUpload } from '@/mobile/hooks/useMobilePhotos';
import { MobilePhotoEditor } from '@/mobile/components/MobilePhotoEditor';
import { offlineQueue } from '@/lib/offline-queue';
import { useToast } from '@/hooks/use-toast';
interface ProjectPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}
type FlowStep = 'capture' | 'edit' | 'notes' | 'upload' | 'batch-upload';
interface SelectedPhoto {
  file: File;
  previewUrl: string;
}
export const ProjectPhotoCaptureModal: React.FC<ProjectPhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  projectId
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('capture');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Batch upload state
  const [batchFiles, setBatchFiles] = useState<SelectedPhoto[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const uploadPhotoMutation = useMobilePhotoUpload();

  // Single file selection (with edit option)
  const handleSingleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCurrentStep('notes');
    }
  };

  // Multiple file selection (batch upload, no edit)
  const handleMultiFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPhotos: SelectedPhoto[] = Array.from(files).map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }));
      setBatchFiles(newPhotos);
      setCurrentStep('batch-upload');
    }
  };
  const handleCaptureSingle = () => {
    fileInputRef.current?.click();
  };
  const handleSelectMultiple = () => {
    multiFileInputRef.current?.click();
  };
  const handleEditPhoto = () => {
    if (selectedFile) {
      setCurrentStep('edit');
    }
  };
  const handleSaveAnnotatedPhoto = (annotatedFile: File) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(annotatedFile);
    const url = URL.createObjectURL(annotatedFile);
    setPreviewUrl(url);
    setCurrentStep('notes');
  };
  const handleCancelEdit = () => {
    setCurrentStep('notes');
  };

  // Continue capturing after single photo upload - auto-trigger camera
  const handleContinueCapturing = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setNote('');
    setCurrentStep('capture');
    
    // Auto-trigger camera for next photo (increased delay for mobile browsers)
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input to allow same file selection
        fileInputRef.current.click();
      }
    }, 300);
  };

  // Single photo upload
  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      if (navigator.onLine) {
        await uploadPhotoMutation.mutateAsync({
          projectId,
          file: selectedFile,
          caption: note.trim() || undefined
        });
        toast({
          title: "Photo Uploaded",
          description: "Photo saved. Take another!"
        });
      } else {
        await offlineQueue.addPhotoToQueue(projectId, selectedFile, note);
        toast({
          title: "Photo Queued",
          description: "Photo queued. Take another!"
        });
      }
      handleContinueCapturing();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to process photo upload.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Batch upload
  const handleBatchUpload = async () => {
    if (batchFiles.length === 0) return;
    setIsUploading(true);
    setUploadedCount(0);
    setUploadProgress(0);
    const total = batchFiles.length;
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < batchFiles.length; i++) {
      const photo = batchFiles[i];
      try {
        if (navigator.onLine) {
          await uploadPhotoMutation.mutateAsync({
            projectId,
            file: photo.file
          });
        } else {
          await offlineQueue.addPhotoToQueue(projectId, photo.file, '');
        }
        successCount++;
      } catch (error) {
        console.error('Failed to upload photo:', error);
        failCount++;
      }
      setUploadedCount(i + 1);
      setUploadProgress(Math.round((i + 1) / total * 100));
    }
    if (failCount === 0) {
      toast({
        title: "Photos Uploaded",
        description: `${successCount} photo${successCount > 1 ? 's' : ''} saved to the project.`
      });
    } else {
      toast({
        title: "Upload Completed",
        description: `${successCount} uploaded, ${failCount} failed.`,
        variant: failCount === total ? "destructive" : "default"
      });
    }
    handleClose();
  };
  const handleClose = () => {
    // Clean up single photo
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Clean up batch photos
    batchFiles.forEach(photo => {
      URL.revokeObjectURL(photo.previewUrl);
    });
    setSelectedFile(null);
    setPreviewUrl('');
    setNote('');
    setBatchFiles([]);
    setCurrentStep('capture');
    setIsUploading(false);
    setUploadProgress(0);
    setUploadedCount(0);
    onClose();
  };
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setCurrentStep('capture');
  };
  const handleBackFromBatch = () => {
    batchFiles.forEach(photo => {
      URL.revokeObjectURL(photo.previewUrl);
    });
    setBatchFiles([]);
    setCurrentStep('capture');
  };

  // Photo Editor Step
  if (currentStep === 'edit' && selectedFile) {
    return <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="p-0 max-w-full h-screen max-h-screen border-0 rounded-none bg-background">
          <MobilePhotoEditor imageFile={selectedFile} onSave={handleSaveAnnotatedPhoto} onCancel={handleCancelEdit} />
        </DialogContent>
      </Dialog>;
  }
  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 max-w-full h-screen max-h-screen border-0 rounded-none bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {currentStep === 'capture' ? 'Add Photos' : currentStep === 'notes' ? 'Add Details' : currentStep === 'batch-upload' ? `Upload ${batchFiles.length} Photos` : 'Upload Photo'}
            </h2>
            <div className="w-16" />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {currentStep === 'capture' && <div className="space-y-6 h-full flex flex-col justify-center">
                <div className="text-center space-y-6">
                  {/* Single Photo - with edit option */}
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Camera className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Take or select a single photo to edit
                    </p>
                    <Button onClick={handleCaptureSingle} size="lg" className="min-h-[48px]">
                      <Camera className="w-5 h-5 mr-2" />
                      Single Photo
                    </Button>
                  </div>

                  <div className="text-muted-foreground text-sm">or</div>

                  {/* Multiple Photos - batch upload */}
                  <div className="border-2 border-dashed border-primary/25 rounded-lg p-8 text-center bg-primary/5">
                    <ImagePlus className="w-12 h-12 mx-auto mb-3 text-primary/60" />
                    <p className="text-muted-foreground mb-4">
                      Select multiple photos for quick upload
                    </p>
                    <Button onClick={handleSelectMultiple} size="lg" variant="outline" className="min-h-[48px]">
                      <ImagePlus className="w-5 h-5 mr-2" />
                      Uplooad Photos
                    </Button>
                  </div>
                </div>

                {/* Single file input */}
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleSingleFileSelect} className="hidden" />

                {/* Multiple file input */}
                <input ref={multiFileInputRef} type="file" accept="image/*" multiple onChange={handleMultiFileSelect} className="hidden" />
              </div>}

            {currentStep === 'notes' && selectedFile && <div className="space-y-6">
                {/* Photo Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Photo Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative w-full rounded-lg overflow-hidden" style={{
                  aspectRatio: '16/9'
                }}>
                      <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover rounded-lg border" />
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={handleRetake} className="flex-1">
                        Retake
                      </Button>
                      <Button variant="outline" onClick={handleEditPhoto} className="flex-1">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Add Notes (Optional)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea placeholder="Add notes about this photo..." value={note} onChange={e => setNote(e.target.value)} rows={4} className="resize-none" />
                  </CardContent>
                </Card>

                {/* Upload Button */}
                <Button onClick={handleUpload} disabled={isUploading} className="w-full" size="lg">
                  {isUploading ? <>Uploading...</> : <>
                      <Upload className="w-4 h-4 mr-2" />
                      Save Photo
                    </>}
                </Button>
              </div>}

            {currentStep === 'batch-upload' && batchFiles.length > 0 && <div className="space-y-6">
                {/* Photo Grid Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Selected Photos ({batchFiles.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {batchFiles.map((photo, index) => <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                          <img src={photo.previewUrl} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        </div>)}
                    </div>
                  </CardContent>
                </Card>

                {/* Info */}
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground text-center">
                      These photos will be uploaded without editing. You can edit them later from the gallery.
                    </p>
                  </CardContent>
                </Card>

                {/* Progress */}
                {isUploading && <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadedCount} / {batchFiles.length}</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </CardContent>
                  </Card>}

                {/* Actions */}
                <div className="space-y-3">
                  <Button onClick={handleBatchUpload} disabled={isUploading} className="w-full" size="lg">
                    {isUploading ? <>Uploading {uploadedCount}/{batchFiles.length}...</> : <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload All Photos
                      </>}
                  </Button>
                  
                  {!isUploading && <Button variant="outline" onClick={handleBackFromBatch} className="w-full">
                      Back
                    </Button>}
                </div>
              </div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};