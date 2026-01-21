import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface AddSubmittalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export const AddSubmittalDialog: React.FC<AddSubmittalDialogProps> = ({
  open,
  onOpenChange,
  projectId,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    submittal_type: '',
    spec_section: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Use project_documents table with submittal category
      const { error } = await supabase
        .from('project_documents')
        .insert([{
          project_id: projectId,
          name: formData.title.trim(),
          file_url: '',
          category: 'submittal',
          description: formData.description.trim() || null,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Submittal created successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['project-document-counts'] });
      queryClient.invalidateQueries({ queryKey: ['project-document-items'] });
      setFormData({ title: '', description: '', submittal_type: '', spec_section: '' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating submittal:', error);
      toast({
        title: "Error",
        description: "Failed to create submittal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Submittal</DialogTitle>
          <DialogDescription>
            Create a new submittal for review and approval
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Roofing Material Samples"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Submittal Type</Label>
              <Select 
                value={formData.submittal_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, submittal_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product-data">Product Data</SelectItem>
                  <SelectItem value="shop-drawings">Shop Drawings</SelectItem>
                  <SelectItem value="samples">Samples</SelectItem>
                  <SelectItem value="certificates">Certificates</SelectItem>
                  <SelectItem value="manufacturer-instructions">Manufacturer Instructions</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Spec Section</Label>
              <Input
                value={formData.spec_section}
                onChange={(e) => setFormData(prev => ({ ...prev, spec_section: e.target.value }))}
                placeholder="e.g., 07 31 00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of the submittal..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Submittal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
