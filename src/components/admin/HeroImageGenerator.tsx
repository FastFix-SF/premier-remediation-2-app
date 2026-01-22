import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Loader2, CheckCircle, XCircle, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useServices, useAreas } from '@/hooks/useBusinessConfig';

interface GenerationResult {
  name: string;
  slug: string;
  status: 'pending' | 'generating' | 'success' | 'error' | 'has_image';
  imageUrl?: string;
  error?: string;
}

export const HeroImageGenerator: React.FC = () => {
  const configServices = useServices();
  const configAreas = useAreas();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [serviceResults, setServiceResults] = useState<GenerationResult[]>([]);
  const [areaResults, setAreaResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [backfillResponse, setBackfillResponse] = useState<any>(null);

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
  }, [configAreas]);

  // Use the new backfill function that updates GitHub directly
  const backfillMissingImages = async () => {
    setIsBackfilling(true);
    setBackfillResponse(null);

    toast.info('Starting backfill process... This may take several minutes.');

    try {
      const { data, error } = await supabase.functions.invoke('backfill-hero-images', {
        body: {
          types: ['services', 'areas'],
          dryRun: false
        }
      });

      if (error) throw error;

      setBackfillResponse(data);

      if (data.success) {
        toast.success(`Generated ${data.summary.servicesSuccess} service images and ${data.summary.areasSuccess} area images! Vercel will auto-deploy.`);

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
      const { data, error } = await supabase.functions.invoke('generate-hero-image', {
        body: {
          type: 'service',
          data: {
            name: configService?.name || service.name,
            shortDescription: configService?.shortDescription || '',
            icon: configService?.icon
          },
          saveToStorage: true
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
      const { data, error } = await supabase.functions.invoke('generate-hero-image', {
        body: {
          type: 'area',
          data: {
            name: configArea?.name || area.name,
            fullName: configArea?.fullName || `${area.name}, California`
          },
          saveToStorage: true
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

        {/* Backfill Response */}
        {backfillResponse && (
          <Alert variant={backfillResponse.success ? 'default' : 'destructive'}>
            <CheckCircle className="w-4 h-4" />
            <AlertTitle>Backfill Complete</AlertTitle>
            <AlertDescription>
              Services: {backfillResponse.summary?.servicesSuccess || 0} generated, {backfillResponse.summary?.servicesProcessed - backfillResponse.summary?.servicesSuccess || 0} skipped/failed
              <br />
              Areas: {backfillResponse.summary?.areasSuccess || 0} generated, {backfillResponse.summary?.areasProcessed - backfillResponse.summary?.areasSuccess || 0} skipped/failed
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Services */}
          <div>
            <h3 className="font-semibold mb-3">
              Services ({serviceResults.filter(r => r.status === 'success' || r.status === 'has_image').length}/{serviceResults.length})
            </h3>
            <div className="space-y-2">
              {serviceResults.map((result) => (
                <div key={result.slug} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  {getStatusIcon(result.status)}
                  <span className="text-sm flex-1 truncate">{result.name}</span>
                  {getStatusBadge(result.status)}
                </div>
              ))}
              {serviceResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No services found in config</p>
              )}
            </div>
          </div>

          {/* Areas */}
          <div>
            <h3 className="font-semibold mb-3">
              Areas ({areaResults.filter(r => r.status === 'success' || r.status === 'has_image').length}/{areaResults.length})
            </h3>
            <div className="space-y-2">
              {areaResults.map((result) => (
                <div key={result.slug} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  {getStatusIcon(result.status)}
                  <span className="text-sm flex-1 truncate">{result.name}</span>
                  {getStatusBadge(result.status)}
                </div>
              ))}
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
      </CardContent>
    </Card>
  );
};

export default HeroImageGenerator;
