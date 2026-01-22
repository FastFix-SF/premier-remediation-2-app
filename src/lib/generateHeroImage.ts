import { supabase } from '@/integrations/supabase/client';

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
}

interface GenerateHeroImageResult {
  heroImageUrl: string;
  originalUrl?: string;
  error?: string;
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
    const { data, error } = await supabase.functions.invoke('generate-hero-image', {
      body: params
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
