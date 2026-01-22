import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ImageIcon, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface GenerationResult {
  name: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  imageUrl?: string;
  error?: string;
}

const services = [
  { name: "Water Damage Mitigation", slug: "water-damage-mitigation", description: "Swift response to water events for commercial properties" },
  { name: "Mold Remediation", slug: "mold-remediation", description: "Comprehensive mold removal with verification support" },
  { name: "Fire & Smoke Damage Cleanup", slug: "fire-smoke-damage-cleanup", description: "Thorough cleanup after fire events" },
  { name: "Asbestos & Lead Abatement", slug: "asbestos-lead-abatement", description: "Compliant hazardous material removal" },
  { name: "Clearance & Verification Support", slug: "clearance-verification-support", description: "Post-remediation verification" },
  { name: "Commercial Property Remediation", slug: "commercial-property-remediation", description: "High-rise, hotel, and retail services" },
  { name: "Multifamily Property Remediation", slug: "multifamily-property-remediation", description: "Apartment complex solutions" }
];

const areas = [
  { name: "San Francisco", slug: "san-francisco", fullName: "San Francisco, California" },
  { name: "Oakland", slug: "oakland", fullName: "Oakland, California" },
  { name: "Berkeley", slug: "berkeley", fullName: "Berkeley, California" },
  { name: "San Jose", slug: "san-jose", fullName: "San Jose, California" },
  { name: "Alameda County", slug: "alameda-county", fullName: "Alameda County, California" },
  { name: "Contra Costa County", slug: "contra-costa-county", fullName: "Contra Costa County, California" }
];

export const HeroImageGenerator: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [serviceResults, setServiceResults] = useState<GenerationResult[]>(
    services.map(s => ({ name: s.name, status: 'pending' }))
  );
  const [areaResults, setAreaResults] = useState<GenerationResult[]>(
    areas.map(a => ({ name: a.name, status: 'pending' }))
  );
  const [progress, setProgress] = useState(0);

  const generateServiceImage = async (service: typeof services[0], index: number) => {
    setServiceResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'generating' };
      return updated;
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-hero-image', {
        body: {
          type: 'construction',
          prompt: `${service.name} - ${service.description}. Professional commercial property remediation service.`
        }
      });

      if (error) throw error;

      const imageUrl = data?.imageUrl || data?.url;
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

  const generateAreaImage = async (area: typeof areas[0], index: number) => {
    setAreaResults(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'generating' };
      return updated;
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-hero-image', {
        body: {
          type: 'city',
          prompt: area.fullName
        }
      });

      if (error) throw error;

      const imageUrl = data?.imageUrl || data?.url;
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

    const total = services.length + areas.length;
    let completed = 0;

    toast.info('Starting image generation...');

    // Generate service images
    for (let i = 0; i < services.length; i++) {
      await generateServiceImage(services[i], i);
      completed++;
      setProgress(Math.round((completed / total) * 100));
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Generate area images
    for (let i = 0; i < areas.length; i++) {
      await generateAreaImage(areas[i], i);
      completed++;
      setProgress(Math.round((completed / total) * 100));
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    setIsGenerating(false);
    toast.success('Image generation complete!');
  };

  const getStatusIcon = (status: GenerationResult['status']) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <ImageIcon className="w-4 h-4 text-gray-400" />;
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
          Generate professional hero images for all services and areas using Gemini AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={generateAllImages}
            disabled={isGenerating}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate All Images
              </>
            )}
          </Button>
          {isGenerating && (
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">{progress}% complete</p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Services */}
          <div>
            <h3 className="font-semibold mb-3">Services ({serviceResults.filter(r => r.status === 'success').length}/{services.length})</h3>
            <div className="space-y-2">
              {serviceResults.map((result, index) => (
                <div key={services[index].slug} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  {getStatusIcon(result.status)}
                  <span className="text-sm flex-1">{result.name}</span>
                  {result.status === 'success' && (
                    <Badge variant="outline" className="text-xs">Done</Badge>
                  )}
                  {result.status === 'error' && (
                    <Badge variant="destructive" className="text-xs">Failed</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Areas */}
          <div>
            <h3 className="font-semibold mb-3">Areas ({areaResults.filter(r => r.status === 'success').length}/{areas.length})</h3>
            <div className="space-y-2">
              {areaResults.map((result, index) => (
                <div key={areas[index].slug} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  {getStatusIcon(result.status)}
                  <span className="text-sm flex-1">{result.name}</span>
                  {result.status === 'success' && (
                    <Badge variant="outline" className="text-xs">Done</Badge>
                  )}
                  {result.status === 'error' && (
                    <Badge variant="destructive" className="text-xs">Failed</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Generated URLs */}
        {(serviceResults.some(r => r.imageUrl) || areaResults.some(r => r.imageUrl)) && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Generated Image URLs</h3>
            <pre className="text-xs overflow-auto max-h-48">
              {JSON.stringify({
                services: Object.fromEntries(
                  serviceResults
                    .filter(r => r.imageUrl)
                    .map((r, i) => [services[i].slug, r.imageUrl])
                ),
                areas: Object.fromEntries(
                  areaResults
                    .filter(r => r.imageUrl)
                    .map((r, i) => [areas[i].slug, r.imageUrl])
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
