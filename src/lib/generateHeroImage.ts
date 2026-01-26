import { supabase } from '@/integrations/supabase/client';
import businessConfig from '@/config/business.json';

interface ServiceData {
  name: string;
  shortDescription: string;
  icon?: string;
}

interface AreaData {
  name: string;
  fullName: string;
  population?: string;
}

interface GenerateHeroImageParams {
  type: 'service' | 'area';
  data: ServiceData | AreaData;
  recordId?: string;
  saveToStorage?: boolean;
  /** URL of the business logo to use as watermark */
  logoUrl?: string;
  /** Whether to add the logo as a watermark (default: true if logoUrl is provided) */
  addWatermarkLogo?: boolean;
}

interface GenerateHeroImageResult {
  heroImageUrl: string;
  originalUrl?: string;
  error?: string;
}

/**
 * Get the business logo URL for watermarking
 * Prefers dark logo, falls back to regular logo
 */
function getBusinessLogoUrl(): string | undefined {
  const config = businessConfig as { logo?: string; logoDark?: string };

  // Prefer dark logo for watermarks (usually better contrast)
  const logoPath = config.logoDark || config.logo;

  if (!logoPath) return undefined;

  // If it's already an absolute URL, return it
  if (logoPath.startsWith('http')) {
    return logoPath;
  }

  // Otherwise, we need to construct the full URL
  // This assumes the logo is served from the same domain
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}${logoPath}`;
}

/**
 * Generate a hero image for a service or area using Gemini AI
 *
 * @param params - Generation parameters
 * @returns The generated image URL or error
 */
export async function generateHeroImage(
  params: GenerateHeroImageParams
): Promise<GenerateHeroImageResult> {
  try {
    // Auto-add logo URL and watermark flag if not specified
    const enhancedParams = {
      ...params,
      logoUrl: params.logoUrl || getBusinessLogoUrl(),
      addWatermarkLogo: params.addWatermarkLogo !== false // Default to true
    };

    const { data, error } = await supabase.functions.invoke('generate-hero-image', {
      body: enhancedParams
    });

    if (error) {
      console.error('Error generating hero image:', error);
      return { heroImageUrl: '', error: error.message };
    }

    return data as GenerateHeroImageResult;
  } catch (err) {
    console.error('Error calling generate-hero-image function:', err);
    return {
      heroImageUrl: '',
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
}

/**
 * Generate hero images for all services that don't have one
 */
export async function generateMissingServiceImages(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  // Fetch services without hero images
  const { data: services, error } = await supabase
    .from('services')
    .select('id, name, short_description, icon')
    .is('hero_image', null);

  if (error) {
    results.errors.push(`Failed to fetch services: ${error.message}`);
    return results;
  }

  for (const service of services || []) {
    const result = await generateHeroImage({
      type: 'service',
      recordId: service.id,
      saveToStorage: true,
      data: {
        name: service.name,
        shortDescription: service.short_description || '',
        icon: service.icon
      }
    });

    if (result.error) {
      results.failed++;
      results.errors.push(`${service.name}: ${result.error}`);
    } else {
      results.success++;
    }

    // Rate limiting - wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Generate hero images for all areas that don't have one
 */
export async function generateMissingAreaImages(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  // Fetch areas without hero images
  const { data: areas, error } = await supabase
    .from('areas')
    .select('id, name, full_name, population')
    .is('hero_image', null);

  if (error) {
    results.errors.push(`Failed to fetch areas: ${error.message}`);
    return results;
  }

  for (const area of areas || []) {
    const result = await generateHeroImage({
      type: 'area',
      recordId: area.id,
      saveToStorage: true,
      data: {
        name: area.name,
        fullName: area.full_name || `${area.name}, California`,
        population: area.population
      }
    });

    if (result.error) {
      results.failed++;
      results.errors.push(`${area.name}: ${result.error}`);
    } else {
      results.success++;
    }

    // Rate limiting - wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Regenerate hero image for a specific service
 */
export async function regenerateServiceImage(
  serviceId: string,
  serviceData: ServiceData
): Promise<GenerateHeroImageResult> {
  return generateHeroImage({
    type: 'service',
    recordId: serviceId,
    saveToStorage: true,
    data: serviceData
  });
}

/**
 * Regenerate hero image for a specific area
 */
export async function regenerateAreaImage(
  areaId: string,
  areaData: AreaData
): Promise<GenerateHeroImageResult> {
  return generateHeroImage({
    type: 'area',
    recordId: areaId,
    saveToStorage: true,
    data: areaData
  });
}
