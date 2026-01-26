import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Loader2, CheckCircle, XCircle, Sparkles, RefreshCw, AlertTriangle, ChevronDown, ChevronRight, MapPin, Building2, Upload, Eye, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useServices, useAreas, useBusiness } from '@/hooks/useBusinessConfig';

interface GenerationResult {
  name: string;
  slug: string;
  status: 'pending' | 'generating' | 'success' | 'error' | 'has_image';
  imageUrl?: string;
  error?: string;
  cityName?: string; // For neighborhoods
}

export const HeroImageGenerator: React.FC = () => {
  const configServices = useServices();
  const configAreas = useAreas();
  const business = useBusiness();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [serviceResults, setServiceResults] = useState<GenerationResult[]>([]);
  const [areaResults, setAreaResults] = useState<GenerationResult[]>([]);
  const [neighborhoodResults, setNeighborhoodResults] = useState<GenerationResult[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [backfillResponse, setBackfillResponse] = useState<any>(null);
  const [includeNeighborhoods, setIncludeNeighborhoods] = useState(true);
  const [forceRegenerate, setForceRegenerate] = useState(false);

  // Image management state
  const [selectedImage, setSelectedImage] = useState<GenerationResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize results from config
  useEffect(() => {
    setServiceResults(
      configServices.map(s => ({
        name: s.name,
        slug: s.slug,
        status: s.image ? 'has_image' : 'pending',
        imageUrl: s.image || undefined
      }))
    );
  }, [configServices]);

  useEffect(() => {
    setAreaResults(
      configAreas.map(a => ({
        name: a.name,
        slug: a.slug,
        status: a.image ? 'has_image' : 'pending',
        imageUrl: a.image || undefined
      }))
    );

    // Extract neighborhoods from all areas
    const allNeighborhoods: GenerationResult[] = [];
    configAreas.forEach(area => {
      if (area.neighborhoods && Array.isArray(area.neighborhoods)) {
        area.neighborhoods.forEach(n => {
          const name = typeof n === 'string' ? n : n.name;
          const slug = typeof n === 'string' ? n.toLowerCase().replace(/\s+/g, '-') : n.slug;
          const image = typeof n === 'object' ? n.image : undefined;
          allNeighborhoods.push({
            name,
            slug: `${area.slug}-${slug}`,
            status: image ? 'has_image' : 'pending',
            imageUrl: image,
            cityName: area.name
          });
        });
      }
    });
    setNeighborhoodResults(allNeighborhoods);
  }, [configAreas]);

  // Group neighborhoods by city for display
  const neighborhoodsByCity = useMemo(() => {
    const grouped: Record<string, GenerationResult[]> = {};
    neighborhoodResults.forEach(n => {
      const city = n.cityName || 'Unknown';
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push(n);
    });
    return grouped;
  }, [neighborhoodResults]);

  const toggleAreaExpanded = (areaName: string) => {
    setExpandedAreas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(areaName)) {
        newSet.delete(areaName);
      } else {
        newSet.add(areaName);
      }
      return newSet;
    });
  };

  // Handle manual image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedImage) return;

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `service-hero-${selectedImage.slug}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('business-media')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('business-media')
        .getPublicUrl(fileName);

      const newImageUrl = publicUrlData.publicUrl;

      // Update the service in GitHub via edge function
      const { error: updateError } = await supabase.functions.invoke('update-service-image', {
        body: {
          serviceSlug: selectedImage.slug,
          imageUrl: newImageUrl
        }
      });

      if (updateError) {
        console.warn('Failed to update GitHub, but image was uploaded:', updateError);
        toast.warning('Image uploaded but GitHub sync failed. You may need to update manually.');
      } else {
        toast.success('Image uploaded and synced to GitHub!');
      }

      // Update local state
      setServiceResults(prev => prev.map(r =>
        r.slug === selectedImage.slug
          ? { ...r, status: 'success', imageUrl: newImageUrl }
          : r
      ));

      setPreviewDialogOpen(false);
      setSelectedImage(null);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Open preview dialog for a service
  const openImagePreview = (result: GenerationResult) => {
    setSelectedImage(result);
    setPreviewDialogOpen(true);
  };

  // Use the new backfill function that updates GitHub directly
  const backfillMissingImages = async () => {
    setIsBackfilling(true);
    setBackfillResponse(null);

    const typesToProcess = ['services', 'areas'];
    if (includeNeighborhoods) {
      typesToProcess.push('neighborhoods');
    }

    toast.info(`Starting backfill process for ${typesToProcess.join(', ')}... This may take several minutes.`);

    try {
      // Get business logo URL for watermarking
      const logoUrl = business.logoDark || business.logo;

      const { data, error } = await supabase.functions.invoke('backfill-hero-images', {
        body: {
          types: typesToProcess,
          dryRun: false,
          logoUrl, // Pass logo for watermarking
          forceRegenerate, // Force regenerate even if images exist
          businessName: business.name // Pass business name for branding
        }
      });

      if (error) throw error;

      setBackfillResponse(data);

      if (data.success) {
        const neighborhoodMsg = includeNeighborhoods && data.summary.neighborhoodsSuccess
          ? ` and ${data.summary.neighborhoodsSuccess} neighborhood images`
          : '';
        toast.success(`Generated ${data.summary.servicesSuccess} service images, ${data.summary.areasSuccess} area images${neighborhoodMsg}! Vercel will auto-deploy.`);

        // Update local state to reflect changes
        if (data.results?.services) {
          setServiceResults(prev => prev.map(r => {
            const result = data.results.services.find((s: any) => s.name === r.name);
            if (result?.status === 'success') {
              return { ...r, status: 'success', imageUrl: result.imageUrl };
            }
            return r;
          }));
        }
        if (data.results?.areas) {
          setAreaResults(prev => prev.map(r => {
            const result = data.results.areas.find((a: any) => a.name === r.name);
            if (result?.status === 'success') {
              return { ...r, status: 'success', imageUrl: result.imageUrl };
            }
            return r;
          }));
        }
      } else {
        toast.error('Some images failed to generate. Check console for details.');
      }
    } catch (err) {
      console.error('Backfill error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to backfill images');
    } finally {
      setIsBackfilling(false);
    }
  };

  // Generate single service image (using correct parameters now)
  const generateServiceImage = async (service: GenerationResult, index: number) => {
    setServiceResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'generating' };
      return updated;
    });

    const configService = configServices.find(s => s.slug === service.slug);

    try {
      const logoUrl = business.logoDark || business.logo;
      const { data, error } = await supabase.functions.invoke('generate-hero-image', {
        body: {
          type: 'service',
          data: {
            name: configService?.name || service.name,
            shortDescription: configService?.shortDescription || '',
            icon: configService?.icon
          },
          saveToStorage: true,
          businessName: business.name,
          logoUrl,
          addWatermarkLogo: true
        }
      });

      if (error) throw error;

      const imageUrl = data?.heroImageUrl || data?.imageUrl;
      setServiceResults(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'success', imageUrl };
        return updated;
      });

      return imageUrl;
    } catch (err) {
      setServiceResults(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        };
        return updated;
      });
      return null;
    }
  };

  // Generate single area image (using correct parameters now)
  const generateAreaImage = async (area: GenerationResult, index: number) => {
    setAreaResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'generating' };
      return updated;
    });

    const configArea = configAreas.find(a => a.slug === area.slug);

    try {
      const logoUrl = business.logoDark || business.logo;
      const { data, error } = await supabase.functions.invoke('generate-hero-image', {
        body: {
          type: 'area',
          data: {
            name: configArea?.name || area.name,
            fullName: configArea?.fullName || `${area.name}, California`
          },
          saveToStorage: true,
          logoUrl,
          addWatermarkLogo: true
        }
      });

      if (error) throw error;

      const imageUrl = data?.heroImageUrl || data?.imageUrl;
      setAreaResults(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status: 'success', imageUrl };
        return updated;
      });

      return imageUrl;
    } catch (err) {
      setAreaResults(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error'
        };
        return updated;
      });
      return null;
    }
  };

  const generateAllImages = async () => {
    setIsGenerating(true);
    setProgress(0);

    const pendingServices = serviceResults.filter(s => s.status === 'pending');
    const pendingAreas = areaResults.filter(a => a.status === 'pending');
    const total = pendingServices.length + pendingAreas.length;

    if (total === 0) {
      toast.info('All images already generated!');
      setIsGenerating(false);
      return;
    }

    let completed = 0;

    toast.info(`Starting image generation for ${total} items...`);

    // Generate service images
    for (const service of pendingServices) {
      const index = serviceResults.findIndex(s => s.slug === service.slug);
      await generateServiceImage(service, index);
      completed++;
      setProgress(Math.round((completed / total) * 100));
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Generate area images
    for (const area of pendingAreas) {
      const index = areaResults.findIndex(a => a.slug === area.slug);
      await generateAreaImage(area, index);
      completed++;
      setProgress(Math.round((completed / total) * 100));
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    setIsGenerating(false);
    toast.success('Image generation complete!');
  };

  const missingServiceImages = serviceResults.filter(s => s.status === 'pending').length;
  const missingAreaImages = areaResults.filter(a => a.status === 'pending').length;

  const getStatusIcon = (status: GenerationResult['status']) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
      case 'has_image':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <ImageIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: GenerationResult['status']) => {
    switch (status) {
      case 'has_image':
        return <Badge variant="outline" className="text-xs bg-green-50">Has Image</Badge>;
      case 'success':
        return <Badge variant="outline" className="text-xs bg-green-100">Generated</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      case 'generating':
        return <Badge variant="secondary" className="text-xs">Generating...</Badge>;
      default:
        return <Badge variant="outline" className="text-xs text-orange-600">Missing</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Hero Image Generator
        </CardTitle>
        <CardDescription>
          Generate professional hero images for all services and areas using Gemini AI.
          Images are uploaded to Supabase Storage and JSON files are updated via GitHub.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Summary */}
        {(missingServiceImages > 0 || missingAreaImages > 0) && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertTitle>Missing Images Detected</AlertTitle>
            <AlertDescription>
              {missingServiceImages} services and {missingAreaImages} areas are missing hero images.
              Use the "Backfill Missing Images" button to generate and automatically update GitHub.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <Button
            onClick={backfillMissingImages}
            disabled={isBackfilling || isGenerating}
            size="lg"
            variant="default"
          >
            {isBackfilling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Backfilling...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Backfill Missing Images
              </>
            )}
          </Button>

          <Button
            onClick={generateAllImages}
            disabled={isGenerating || isBackfilling}
            size="lg"
            variant="outline"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate All (Local Only)
              </>
            )}
          </Button>

          {(isGenerating || isBackfilling) && (
            <div className="flex-1 min-w-[200px]">
              <Progress value={isBackfilling ? 50 : progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {isBackfilling ? 'Processing... This may take several minutes' : `${progress}% complete`}
              </p>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeNeighborhoods}
              onChange={(e) => setIncludeNeighborhoods(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include neighborhood images
          </label>
          <span className="text-sm text-muted-foreground">
            ({neighborhoodResults.length} neighborhoods across {Object.keys(neighborhoodsByCity).length} cities)
          </span>
          <div className="w-px h-4 bg-border" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-orange-600 font-medium">Force regenerate ALL images</span>
          </label>
          {forceRegenerate && (
            <span className="text-xs text-orange-500">
              ⚠️ This will regenerate all images, replacing existing ones
            </span>
          )}
        </div>

        {/* Backfill Response */}
        {backfillResponse && (
          <Alert variant={backfillResponse.success ? 'default' : 'destructive'}>
            <CheckCircle className="w-4 h-4" />
            <AlertTitle>Backfill Complete</AlertTitle>
            <AlertDescription>
              Services: {backfillResponse.summary?.servicesSuccess || 0} generated, {(backfillResponse.summary?.servicesProcessed || 0) - (backfillResponse.summary?.servicesSuccess || 0)} skipped/failed
              <br />
              Areas: {backfillResponse.summary?.areasSuccess || 0} generated, {(backfillResponse.summary?.areasProcessed || 0) - (backfillResponse.summary?.areasSuccess || 0)} skipped/failed
              {backfillResponse.summary?.neighborhoodsProcessed > 0 && (
                <>
                  <br />
                  Neighborhoods: {backfillResponse.summary?.neighborhoodsSuccess || 0} generated, {(backfillResponse.summary?.neighborhoodsProcessed || 0) - (backfillResponse.summary?.neighborhoodsSuccess || 0)} skipped/failed
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Services with image thumbnails */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Services ({serviceResults.filter(r => r.status === 'success' || r.status === 'has_image').length}/{serviceResults.length})
            </h3>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {serviceResults.map((result) => (
                <div key={result.slug} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                  {/* Image thumbnail */}
                  <div
                    className="w-16 h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary"
                    onClick={() => openImagePreview(result)}
                  >
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl}
                        alt={result.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{result.name}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {getStatusIcon(result.status)}
                      {getStatusBadge(result.status)}
                    </div>
                  </div>

                  {/* Edit/Upload button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openImagePreview(result)}
                    className="flex-shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {serviceResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No services found in config</p>
              )}
            </div>
          </div>

          {/* Areas with expandable neighborhoods */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Areas & Neighborhoods ({areaResults.filter(r => r.status === 'success' || r.status === 'has_image').length}/{areaResults.length} areas, {neighborhoodResults.length} neighborhoods)
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {areaResults.map((result) => {
                const cityNeighborhoods = neighborhoodsByCity[result.name] || [];
                const hasNeighborhoods = cityNeighborhoods.length > 0;
                const isExpanded = expandedAreas.has(result.name);

                return (
                  <div key={result.slug}>
                    <div
                      className={`flex items-center gap-2 p-2 bg-muted/50 rounded-lg ${hasNeighborhoods ? 'cursor-pointer hover:bg-muted' : ''}`}
                      onClick={() => hasNeighborhoods && toggleAreaExpanded(result.name)}
                    >
                      {hasNeighborhoods && (
                        isExpanded
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      {getStatusIcon(result.status)}
                      <span className="text-sm flex-1 truncate font-medium">{result.name}</span>
                      {hasNeighborhoods && (
                        <span className="text-xs text-muted-foreground">{cityNeighborhoods.length} neighborhoods</span>
                      )}
                      {getStatusBadge(result.status)}
                    </div>

                    {/* Expandable neighborhoods list */}
                    {isExpanded && hasNeighborhoods && (
                      <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-3">
                        {cityNeighborhoods.map((neighborhood) => (
                          <div key={neighborhood.slug} className="flex items-center gap-2 p-1.5 bg-muted/30 rounded text-sm">
                            {getStatusIcon(neighborhood.status)}
                            <span className="flex-1 truncate">{neighborhood.name}</span>
                            {getStatusBadge(neighborhood.status)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {areaResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No areas found in config. Add areas to areas.json first.</p>
              )}
            </div>
          </div>
        </div>

        {/* Generated URLs Display */}
        {(serviceResults.some(r => r.imageUrl) || areaResults.some(r => r.imageUrl)) && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Current Image URLs</h3>
            <pre className="text-xs overflow-auto max-h-48">
              {JSON.stringify({
                services: Object.fromEntries(
                  serviceResults
                    .filter(r => r.imageUrl)
                    .map((r) => [r.slug, r.imageUrl])
                ),
                areas: Object.fromEntries(
                  areaResults
                    .filter(r => r.imageUrl)
                    .map((r) => [r.slug, r.imageUrl])
                )
              }, null, 2)}
            </pre>
          </div>
        )}

        {/* Hidden file input for uploads */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Image Preview/Edit Dialog */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {selectedImage?.name} - Hero Image
              </DialogTitle>
              <DialogDescription>
                Preview, upload a new image, or regenerate with AI
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Current Image Preview */}
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {selectedImage?.imageUrl ? (
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-16 h-16 mb-2" />
                    <p>No image yet</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Image
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!selectedImage) return;
                    const index = serviceResults.findIndex(s => s.slug === selectedImage.slug);
                    if (index >= 0) {
                      setPreviewDialogOpen(false);
                      await generateServiceImage(selectedImage, index);
                      // Refresh selected image with new URL
                      const updated = serviceResults.find(s => s.slug === selectedImage.slug);
                      if (updated) setSelectedImage(updated);
                    }
                  }}
                  disabled={isGenerating || isUploading}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate with AI
                </Button>
              </div>

              {/* Tips */}
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Tips for best results</AlertTitle>
                <AlertDescription className="text-sm">
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>Use <strong>Nano Banana Gemini</strong> to generate perfect images with your logo</li>
                    <li>Prompt: "Add the second logo to all places where you see the first logo"</li>
                    <li>Upload the result here - it will sync to Supabase and GitHub automatically</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Current URL */}
              {selectedImage?.imageUrl && (
                <div className="text-xs text-muted-foreground break-all p-2 bg-muted rounded">
                  <strong>Current URL:</strong> {selectedImage.imageUrl}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default HeroImageGenerator;
