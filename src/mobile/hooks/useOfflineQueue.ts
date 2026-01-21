import { useState, useEffect } from 'react';
import { offlineQueue } from '@/lib/offline-queue';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useOfflineQueue = () => {
  const [queueCounts, setQueueCounts] = useState({ photos: 0, notes: 0, total: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const updateQueueCounts = async () => {
    try {
      const counts = await offlineQueue.getQueueCounts();
      setQueueCounts(counts);
    } catch (error) {
      console.error('Failed to get queue counts:', error);
    }
  };

  const processPhotoQueue = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const pendingPhotos = await offlineQueue.getPendingPhotos();
      
      for (const photo of pendingPhotos) {
        try {
          await offlineQueue.updatePhotoStatus(photo.id, 'uploading');
          
          // Create file path
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${photo.projectId}/${fileName}`;
          
          // Upload to Supabase Storage with proper path structure
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('project-photos')
            .upload(filePath, photo.file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('project-photos')
            .getPublicUrl(filePath);

          // Save to database with all required fields
          const { error: dbError } = await supabase
            .from('project_photos')
            .insert({
              project_id: photo.projectId,
              photo_url: publicUrl,
              caption: photo.note || null,
              is_visible_to_customer: false,
              uploaded_by: (await supabase.auth.getUser()).data.user?.id,
              display_order: 0,
              photo_tag: null,
              is_highlighted_before: false,
              is_highlighted_after: false,
              file_size: photo.file.size,
            });

          if (dbError) {
            // Clean up uploaded file on database error
            await supabase.storage
              .from('project-photos')
              .remove([filePath]);
            throw dbError;
          }

          await offlineQueue.updatePhotoStatus(photo.id, 'completed');
          
        } catch (error) {
          console.error(`Failed to upload photo ${photo.id}:`, error);
          await offlineQueue.updatePhotoStatus(photo.id, 'failed');
        }
      }

      // Clean up completed items
      await offlineQueue.clearCompleted();
      await updateQueueCounts();

      if (pendingPhotos.length > 0) {
        toast({
          title: 'Photos Synced',
          description: `Successfully uploaded ${pendingPhotos.filter(p => p.status !== 'failed').length} photos.`,
        });
      }
      
    } catch (error) {
      console.error('Failed to process photo queue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const processNoteQueue = async () => {
    // TODO: Implement note syncing when notes feature is added
    console.log('Note queue processing not yet implemented');
  };

  const processQueue = async () => {
    if (!navigator.onLine) return;
    
    await Promise.all([
      processPhotoQueue(),
      processNoteQueue()
    ]);
  };

  // Auto-process queue when online
  useEffect(() => {
    const handleOnline = () => {
      setTimeout(() => processQueue(), 1000); // Delay to ensure connection is stable
    };

    window.addEventListener('online', handleOnline);
    
    // Process queue on mount if online
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Update queue counts regularly
  useEffect(() => {
    updateQueueCounts();
    const interval = setInterval(updateQueueCounts, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    queueCounts,
    isProcessing,
    processQueue,
    updateQueueCounts,
  };
};