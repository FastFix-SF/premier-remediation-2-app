import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';

const POSITION_STORAGE_KEY = 'customerFeedbackButtonPosition';

interface CustomerFeedbackButtonProps {
  /** Business ID to associate feedback with */
  businessId?: string;
  /** Business name for display */
  businessName?: string;
  /** Custom mascot image URL */
  mascotImage?: string;
  /** Whether feedback is enabled (for limiting to 3 rounds) */
  enabled?: boolean;
}

/**
 * Customer-facing feedback button for business websites.
 * Allows business owners to provide feedback on their website during the review period.
 *
 * Features:
 * - Draggable positioning
 * - Element selection with screenshot capture
 * - Feedback submission to admin_feedback table
 *
 * Usage in App.tsx or layout:
 * <CustomerFeedbackButton businessId="xxx" businessName="Premier Remediation" />
 */
export const CustomerFeedbackButton: React.FC<CustomerFeedbackButtonProps> = ({
  businessId,
  businessName = 'Your Business',
  mascotImage,
  enabled = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    selector: string;
    text: string;
    position: { x: number; y: number; width: number; height: number };
    pageRoute?: string;
    pageUrl?: string;
  } | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const location = useLocation();

  // Draggable position state
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return { x: window.innerWidth - 100, y: window.innerHeight - 120 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  // Don't render if feedback is disabled
  if (!enabled) return null;

  // Save position to localStorage when it changes
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  // Handle window resize to keep button in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 80),
        y: Math.min(prev.y, window.innerHeight - 100)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const newX = Math.max(0, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Touch drag handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      const newX = Math.max(0, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragStartRef.current.posY + deltaY));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // Handle element selection
  useEffect(() => {
    if (!isSelectionMode) {
      // Clean up any remaining outlines when selection mode ends
      document.querySelectorAll('[style*="outline"]').forEach((el) => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.cursor = '';
      });
      return;
    }

    const handleElementClick = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;

      // Remove outline from clicked element
      target.style.outline = '';
      target.style.cursor = '';

      const rect = target.getBoundingClientRect();

      // Capture element information with page route
      const elementInfo = {
        selector: target.tagName.toLowerCase() + (target.className ? `.${target.className.split(' ').join('.')}` : ''),
        text: target.textContent?.slice(0, 100) || '',
        position: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        },
        pageRoute: location.pathname,
        pageUrl: window.location.href
      };

      // Capture screenshot with element highlighted and cropped to element area
      try {
        // Temporarily add highlight to the element
        target.style.outline = '3px solid red';
        target.style.boxShadow = '0 0 10px rgba(255,0,0,0.5)';

        const scale = 1;
        const padding = 100;

        const fullCanvas = await html2canvas(document.body, {
          useCORS: true,
          logging: false,
          scale: scale,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
        });

        // Remove highlight
        target.style.outline = '';
        target.style.boxShadow = '';

        // Calculate crop bounds with padding
        const cropX = Math.max(0, (rect.left - padding) * scale);
        const cropY = Math.max(0, (rect.top + window.scrollY - padding) * scale);
        const cropWidth = Math.min((rect.width + padding * 2) * scale, fullCanvas.width - cropX);
        const cropHeight = Math.min((rect.height + padding * 2) * scale, fullCanvas.height - cropY);

        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        const ctx = croppedCanvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(fullCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
          const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
          setScreenshotDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to capture screenshot:', err);
      }

      setSelectedElement(elementInfo);
      setIsSelectionMode(false);
      setIsOpen(true);

      toast({
        title: "Element selected",
        description: "Now describe what needs to be fixed or improved",
      });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.style.outline = '2px solid hsl(var(--primary))';
      target.style.cursor = 'crosshair';
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      target.style.outline = '';
      target.style.cursor = '';
    };

    document.addEventListener('click', handleElementClick, true);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

    return () => {
      document.removeEventListener('click', handleElementClick, true);
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mouseout', handleMouseOut, true);

      // Clean up all outlines on unmount
      document.querySelectorAll('[style*="outline"]').forEach((el) => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.cursor = '';
      });
    };
  }, [isSelectionMode, toast, location.pathname]);

  const handleButtonClick = () => {
    setIsSelectionMode(true);
    toast({
      title: "Selection mode active",
      description: "Click on any element you want to provide feedback about",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.trim()) {
      toast({
        title: "Error",
        description: "Please enter your feedback",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      // Upload screenshot if available
      if (screenshotDataUrl) {
        const blob = await fetch(screenshotDataUrl).then(r => r.blob());
        const fileName = `customer-feedback-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('feedback-screenshots')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('feedback-screenshots')
            .getPublicUrl(fileName);
          screenshotUrl = urlData.publicUrl;
        }
      }

      // Submit to admin_feedback table with source = 'customer_website'
      const { error } = await supabase
        .from('admin_feedback' as any)
        .insert({
          user_id: null, // Customer feedback doesn't have a user
          feedback_text: `[${businessName} Website Feedback]\n\n${feedback.trim()}`,
          selected_element: selectedElement ? JSON.stringify({
            ...selectedElement,
            source: 'customer_website',
            businessId: businessId
          }) : null,
          screenshot_url: screenshotUrl,
        });

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted. We'll review it shortly.",
      });

      setFeedback('');
      setSelectedElement(null);
      setScreenshotDataUrl(null);
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setSelectedElement(null);
    setScreenshotDataUrl(null);
    setFeedback('');
  };

  return (
    <>
      {/* Floating Feedback Button - Draggable */}
      <div
        ref={dragRef}
        className="fixed z-[1100] flex flex-col items-end gap-2 select-none"
        style={{
          left: position.x,
          top: position.y,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        data-component="CustomerFeedbackButton"
      >
        <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-md pointer-events-none">
          Give Feedback
        </div>
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={(e) => {
            if (!isDragging) {
              handleButtonClick();
            }
          }}
          className="w-14 h-14 bg-primary hover:bg-primary/90 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 border-2 border-white"
          aria-label="Give feedback - drag to reposition"
        >
          {mascotImage ? (
            <img
              src={mascotImage}
              alt="Feedback"
              className="w-10 h-10 object-contain pointer-events-none rounded-full"
            />
          ) : (
            <MessageSquare className="w-6 h-6 text-white" />
          )}
        </button>
      </div>

      {/* Selection Mode Overlay */}
      {isSelectionMode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1200] animate-fade-in">
          <div className="bg-primary text-primary-foreground rounded-lg shadow-xl px-6 py-3 flex items-center gap-4">
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm font-medium">
              Click on any element to provide feedback
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIsSelectionMode(false);
                toast({
                  title: "Cancelled",
                  description: "Selection mode cancelled",
                });
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Website Feedback
            </DialogTitle>
            <DialogDescription>
              Help us improve your website by sharing what you'd like changed
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedElement && (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  <p className="font-medium">Selected element</p>
                  {selectedElement.text && (
                    <p className="text-xs text-muted-foreground break-words">
                      "{selectedElement.text}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Page: {selectedElement.pageRoute}
                  </p>
                </div>

                {screenshotDataUrl && (
                  <div className="rounded-md overflow-hidden border">
                    <img
                      src={screenshotDataUrl}
                      alt="Screenshot of selected element"
                      className="w-full h-auto max-h-48 object-contain bg-muted"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-sm">
                What would you like to change?
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe what you'd like changed, added, or improved..."
                className="min-h-[100px] sm:min-h-[120px] resize-none text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !feedback.trim()}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? 'Sending...' : 'Submit Feedback'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomerFeedbackButton;
