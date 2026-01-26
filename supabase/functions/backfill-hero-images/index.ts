import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addLogoWithAI, fetchLogoAsBase64 } from "../_shared/addLogoWithAI.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service image prompt - generate scene with placeholder branding that AI will replace with real logo
const getServicePrompt = (service: { name: string; shortDescription: string }, businessName?: string) => `
Create a hyper-realistic professional photograph showing ${service.name} work ACTIVELY IN PROGRESS:

PRIMARY FOCUS - THE ACTUAL WORK (70% of image):
- ${service.shortDescription}
- Show workers ACTIVELY PERFORMING ${service.name} - hands on equipment, solving the problem
- Professional equipment being USED: dehumidifiers running, air scrubbers operating, extraction hoses in use
- The remediation WORK AREA should be the CENTER of the image
- Show visible progress: protective sheeting, containment barriers, moisture meters, drying mats

SPECIFIC SCENE FOR ${service.name.toUpperCase()}:
- Workers in the FOREGROUND using professional ${service.name} equipment
- Clear view of the actual problem being addressed (water damage, mold, fire damage, etc.)
- Interior of a real home or commercial building showing the work happening
- 2-3 workers actively engaged - one operating equipment, one assessing, one documenting

WORK VAN WITH COMPANY BRANDING:
- White work van/truck parked in driveway or visible through window/door
- Van has a CIRCULAR LOGO on the side panel (any generic circular emblem is fine)
- Position the van so its side panel with logo is clearly visible
- The van's side panel should be well-lit and unobstructed

WORKER UNIFORMS WITH BRANDING:
- Workers wearing NAVY BLUE polo shirts or work shirts
- Shirts have a CIRCULAR LOGO on the chest or back
- Professional appearance with safety equipment (hard hats, gloves)

COMPOSITION (16:10 landscape):
- FOREGROUND (60%): Workers actively doing ${service.name}, equipment in use
- MIDDLE (25%): Work area showing the problem/solution
- BACKGROUND (15%): Branded van visible, property exterior

CRITICAL QUALITY:
- 8K ultra-high resolution, professional DSLR quality
- Sharp focus throughout the image
- Good lighting on workers, van, and logo areas

STYLE:
- Like a real marketing photo from ServiceMaster or SERVPRO
- Shows the VALUE and EXPERTISE of the service
- Documentary style - real work happening, not posed
- The circular logos should be clearly visible (they will be replaced with real branding)
`;

// City-specific landmarks for authentic local imagery
const cityLandmarks: Record<string, string> = {
  'oakland': 'Lake Merritt with its necklace of lights, the Oakland Tribune Tower, Fox Theater marquee, Jack London Square waterfront, downtown Oakland skyline with the Ordway Building',
  'san francisco': 'Golden Gate Bridge, Transamerica Pyramid, Painted Ladies Victorian homes, cable cars on hills, Coit Tower, Bay Bridge, Salesforce Tower',
  'san jose': 'Downtown San Jose skyline, San Jose City Hall rotunda, SAP Center, Santana Row architecture, Tech company campuses, palm tree-lined streets',
  'berkeley': 'UC Berkeley Campanile (Sather Tower), Berkeley Hills, Claremont Hotel, Fourth Street shopping district, Gourmet Ghetto restaurants, Telegraph Avenue',
  'contra costa': 'Mount Diablo in background, Walnut Creek downtown, Iron Horse Trail, rolling golden hills, BART stations, suburban town centers',
  'alameda': 'Alameda Island Victorian homes, Park Street shopping, Oakland Estuary waterfront, Alameda Theatre, beach areas, historic naval air station',
  'fremont': 'Mission San Jose, Lake Elizabeth, Fremont Hub, Niles Canyon, BART station, tech business parks',
  'walnut creek': 'Mount Diablo backdrop, Broadway Plaza, downtown restaurants and shops, Iron Horse Trail, Lesher Center for the Arts'
};

// Get landmarks for a city (fuzzy match)
const getLandmarksForCity = (cityName: string): string => {
  const normalizedName = cityName.toLowerCase();
  for (const [key, landmarks] of Object.entries(cityLandmarks)) {
    if (normalizedName.includes(key) || key.includes(normalizedName.split(' ')[0])) {
      return landmarks;
    }
  }
  return 'local downtown area, distinctive architecture, tree-lined streets, community gathering spaces';
};

// Area/City image prompt - with specific local landmarks
const getAreaPrompt = (area: { name: string; fullName?: string }) => {
  const landmarks = getLandmarksForCity(area.name);

  return `
Create a stunning professional cityscape photograph that IMMEDIATELY identifies this as ${area.fullName || area.name}, California:

COMPOSITION & FRAMING:
- Iconic view that locals would instantly recognize as ${area.name}
- Golden hour lighting (warm amber sun with soft purple/blue shadows)
- Wide-angle showing the character of this specific city
- Aspect ratio 16:10, landscape orientation

MUST INCLUDE THESE ${area.name.toUpperCase()} LANDMARKS:
${landmarks}

Choose the most iconic and recognizable view - something a resident would use as their phone wallpaper because it captures the essence of their city.

ATMOSPHERE & LIGHTING:
- Magic hour/golden hour with warm, inviting glow
- The kind of light that makes people feel proud of their city
- Rich colors but realistic - not oversaturated
- Clear day showing the city at its best

STYLE REFERENCE:
- Tourism board promotional photography
- "Best of ${area.name}" magazine cover quality
- The photo locals share saying "this is why I love living here"
- Ultra high resolution, postcard-worthy composition

EMOTIONAL GOAL:
Someone from ${area.name} should see this image and feel a sense of pride and belonging - "That's MY city!"
A potential customer should think "These people know and serve MY community."

Do NOT create a generic California cityscape. This must be unmistakably, specifically ${area.name}.
`;
};

// Neighborhood image prompt - authentic local feel
const getNeighborhoodPrompt = (neighborhood: { name: string; cityName: string }) => `
Create an authentic street-level photograph that captures the unique character of ${neighborhood.name} in ${neighborhood.cityName}:

COMPOSITION & FRAMING:
- Eye-level street view as if walking through the neighborhood
- Golden hour lighting creating warm, inviting atmosphere
- Aspect ratio 16:10, landscape orientation
- Show what makes ${neighborhood.name} distinct from other neighborhoods

CAPTURE THE ${neighborhood.name.toUpperCase()} VIBE:
- The specific architectural style of this neighborhood (Victorian, Craftsman, Modern, Mixed-use)
- Local businesses, cafes, or shops that give it character
- Street trees, parks, or gathering spots unique to this area
- The "feel" of the neighborhood - is it hip and artsy? Family-friendly? Upscale? Historic?

AUTHENTIC DETAILS:
- Real neighborhood elements: street signs, local storefronts, community boards
- People enjoying the neighborhood (walking dogs, at outdoor cafes, jogging)
- Parked cars, bikes, the everyday life of the area
- Seasonal elements appropriate for California

ATMOSPHERE:
- The photo should make someone think "I'd love to live/work here"
- Warm, safe, community-oriented feeling
- Shows why ${neighborhood.name} is a desirable place
- Professional real estate photography quality

STYLE:
- Like a photo from Redfin or Zillow's "neighborhood guide"
- Magazine editorial quality
- Makes viewers feel they know what it's like to be there
- NOT a generic California street - specifically ${neighborhood.name}

Someone from ${neighborhood.name} should see this and think "Yes, that's exactly what my neighborhood looks like!"
`;

// Generate single image using Gemini
async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["image", "text"],
            temperature: 0.7,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const parts = result.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (imagePart?.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    return null;
  } catch (err) {
    console.error('Image generation error:', err);
    return null;
  }
}

// Upload image to Supabase Storage with optional AI-based logo replacement
async function uploadToStorage(
  supabase: any,
  imageData: string,
  type: 'service' | 'area' | 'neighborhood',
  slug: string,
  logoUrl?: string,
  apiKey?: string
): Promise<string | null> {
  try {
    // Extract base64 data from data URL
    const [meta, base64Data] = imageData.split(',');
    const mimeType = meta.match(/data:([^;]+)/)?.[1] || 'image/png';

    let finalBase64 = base64Data;

    // For service images: Use AI to replace placeholder logos with real logo
    // This is the "nano banana" approach - Gemini replaces all branding naturally
    if (logoUrl && apiKey && type === 'service') {
      console.log(`Using AI to add real logo to ${type} image: ${slug}`);
      try {
        // Fetch the logo as base64
        const logoBase64 = await fetchLogoAsBase64(logoUrl);

        if (logoBase64) {
          // Use Gemini to add the logo to vans, uniforms, etc.
          const editedBase64 = await addLogoWithAI(base64Data, logoBase64, apiKey);

          if (editedBase64) {
            finalBase64 = editedBase64;
            console.log('AI successfully added logo to image');
          } else {
            console.warn('AI logo addition returned null, using original image');
          }
        } else {
          console.warn('Could not fetch logo, using original image');
        }
      } catch (logoError) {
        console.warn('Failed to add logo via AI, continuing without:', logoError);
      }
    }

    // Convert final base64 to blob
    const byteCharacters = atob(finalBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const imageBlob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });

    const fileName = `${type}-hero-${slug}-${Date.now()}.png`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('business-media')
      .upload(fileName, imageBlob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('business-media')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

// Fetch JSON file from GitHub
async function fetchGitHubFile(
  owner: string,
  repo: string,
  path: string,
  token: string
): Promise<{ content: any; sha: string } | null> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (!response.ok) {
      console.error('GitHub fetch error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return { content, sha: data.sha };
  } catch (err) {
    console.error('GitHub fetch error:', err);
    return null;
  }
}

// Update JSON file in GitHub
async function updateGitHubFile(
  owner: string,
  repo: string,
  path: string,
  content: any,
  sha: string,
  message: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: btoa(JSON.stringify(content, null, 2)),
          sha,
          branch: 'main'
        })
      }
    );

    return response.ok;
  } catch (err) {
    console.error('GitHub update error:', err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      types = ['services', 'areas'],  // Default to services and areas only (neighborhoods optional)
      dryRun = false,
      logoUrl,  // Business logo URL for watermarking
      repoOwner,  // Optional: override repo owner
      repoName,   // Optional: override repo name
      forceRegenerate = true, // Default to TRUE - always regenerate with improved prompts
      businessName  // Business name for branded service images
    } = await req.json() || {};

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!GITHUB_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'GITHUB_TOKEN is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const owner = repoOwner || 'FastFix-SF';
    const repo = repoName || 'premier-remediation-2-app';

    // Get business config for logo and name if not provided
    let businessLogoUrl = logoUrl;
    let brandName = businessName;
    const businessFile = await fetchGitHubFile(owner, repo, 'src/config/business.json', GITHUB_TOKEN);
    if (businessFile?.content) {
      // Prefer logoDark for watermarks (better contrast), fallback to logo
      if (!businessLogoUrl) {
        businessLogoUrl = businessFile.content.logoDark || businessFile.content.logo;
        console.log('Using business logo for watermarks:', businessLogoUrl);
      }
      // Get business name for branding in service images
      if (!brandName) {
        brandName = businessFile.content.name;
        console.log('Using business name for branding:', brandName);
      }
    }

    const results: {
      services: Array<{ name: string; status: string; imageUrl?: string; error?: string }>;
      areas: Array<{ name: string; status: string; imageUrl?: string; error?: string }>;
      neighborhoods: Array<{ name: string; cityName: string; status: string; imageUrl?: string; error?: string }>;
    } = { services: [], areas: [], neighborhoods: [] };

    // Process services
    if (types.includes('services')) {
      console.log('Processing services...');
      const servicesFile = await fetchGitHubFile(owner, repo, 'src/config/services.json', GITHUB_TOKEN);

      if (servicesFile) {
        const services = servicesFile.content;
        let updated = false;

        for (const service of services) {
          const shouldGenerate = forceRegenerate || !service.image || service.image === '';

          if (shouldGenerate) {
            console.log(`${forceRegenerate ? 'Force regenerating' : 'Generating'} image for service: ${service.name}`);

            if (dryRun) {
              results.services.push({ name: service.name, status: 'would_generate' });
              continue;
            }

            // Generate image with business name for branding
            const prompt = getServicePrompt({
              name: service.name,
              shortDescription: service.shortDescription || ''
            }, brandName);

            const imageData = await generateImage(prompt, GEMINI_API_KEY);

            if (imageData) {
              // Upload to storage with AI logo replacement
              const publicUrl = await uploadToStorage(supabase, imageData, 'service', service.slug, businessLogoUrl, GEMINI_API_KEY);

              if (publicUrl) {
                service.image = publicUrl;
                updated = true;
                results.services.push({ name: service.name, status: 'success', imageUrl: publicUrl });
              } else {
                results.services.push({ name: service.name, status: 'error', error: 'Failed to upload to storage' });
              }
            } else {
              results.services.push({ name: service.name, status: 'error', error: 'Failed to generate image' });
            }

            // Rate limiting - wait 3 seconds between requests
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            results.services.push({ name: service.name, status: 'skipped', imageUrl: service.image });
          }
        }

        // Update GitHub if we made changes
        if (updated && !dryRun) {
          const updateSuccess = await updateGitHubFile(
            owner, repo,
            'src/config/services.json',
            services,
            servicesFile.sha,
            '[AI] Add hero images with logo watermark to services',
            GITHUB_TOKEN
          );
          console.log('Services JSON update:', updateSuccess ? 'success' : 'failed');
        }
      }
    }

    // Process areas
    if (types.includes('areas')) {
      console.log('Processing areas...');
      const areasFile = await fetchGitHubFile(owner, repo, 'src/config/areas.json', GITHUB_TOKEN);

      if (areasFile && Array.isArray(areasFile.content) && areasFile.content.length > 0) {
        const areas = areasFile.content;
        let updated = false;

        for (const area of areas) {
          const shouldGenerateArea = forceRegenerate || !area.image || area.image === '';

          if (shouldGenerateArea) {
            console.log(`${forceRegenerate ? 'Force regenerating' : 'Generating'} image for area: ${area.name}`);

            if (dryRun) {
              results.areas.push({ name: area.name, status: 'would_generate' });
              continue;
            }

            // Generate image
            const prompt = getAreaPrompt({
              name: area.name,
              fullName: area.fullName
            });

            const imageData = await generateImage(prompt, GEMINI_API_KEY);

            if (imageData) {
              // Upload to storage (no AI logo for area images)
              const publicUrl = await uploadToStorage(supabase, imageData, 'area', area.slug);

              if (publicUrl) {
                area.image = publicUrl;
                area.heroImage = publicUrl; // Also update heroImage field
                updated = true;
                results.areas.push({ name: area.name, status: 'success', imageUrl: publicUrl });
              } else {
                results.areas.push({ name: area.name, status: 'error', error: 'Failed to upload to storage' });
              }
            } else {
              results.areas.push({ name: area.name, status: 'error', error: 'Failed to generate image' });
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            results.areas.push({ name: area.name, status: 'skipped', imageUrl: area.image });
          }

          // Process neighborhoods within this area if requested
          if (types.includes('neighborhoods') && area.neighborhoods && Array.isArray(area.neighborhoods)) {
            for (let i = 0; i < area.neighborhoods.length; i++) {
              const neighborhood = area.neighborhoods[i];
              // Handle both string and object neighborhoods
              const neighborhoodName = typeof neighborhood === 'string' ? neighborhood : neighborhood.name;
              const neighborhoodSlug = typeof neighborhood === 'string'
                ? neighborhood.toLowerCase().replace(/\s+/g, '-')
                : neighborhood.slug;

              // Check if neighborhood needs an image (only for object type with image field)
              const needsImage = typeof neighborhood === 'object' && (!neighborhood.image || neighborhood.image === '');
              const shouldGenerateNeighborhood = forceRegenerate || needsImage || (typeof neighborhood === 'string' && types.includes('neighborhoods'));

              if (shouldGenerateNeighborhood) {
                console.log(`${forceRegenerate ? 'Force regenerating' : 'Generating'} image for neighborhood: ${neighborhoodName} in ${area.name}`);

                if (dryRun) {
                  results.neighborhoods.push({
                    name: neighborhoodName,
                    cityName: area.name,
                    status: 'would_generate'
                  });
                  continue;
                }

                // Generate neighborhood image
                const neighborhoodPrompt = getNeighborhoodPrompt({
                  name: neighborhoodName,
                  cityName: area.name
                });

                const neighborhoodImageData = await generateImage(neighborhoodPrompt, GEMINI_API_KEY);

                if (neighborhoodImageData) {
                  // Upload neighborhood image (no AI logo for neighborhood images)
                  const neighborhoodPublicUrl = await uploadToStorage(
                    supabase,
                    neighborhoodImageData,
                    'neighborhood',
                    `${area.slug}-${neighborhoodSlug}`
                  );

                  if (neighborhoodPublicUrl) {
                    // Convert string neighborhood to object if needed
                    if (typeof neighborhood === 'string') {
                      area.neighborhoods[i] = {
                        name: neighborhoodName,
                        slug: neighborhoodSlug,
                        image: neighborhoodPublicUrl
                      };
                    } else {
                      neighborhood.image = neighborhoodPublicUrl;
                    }
                    updated = true;
                    results.neighborhoods.push({
                      name: neighborhoodName,
                      cityName: area.name,
                      status: 'success',
                      imageUrl: neighborhoodPublicUrl
                    });
                  } else {
                    results.neighborhoods.push({
                      name: neighborhoodName,
                      cityName: area.name,
                      status: 'error',
                      error: 'Failed to upload to storage'
                    });
                  }
                } else {
                  results.neighborhoods.push({
                    name: neighborhoodName,
                    cityName: area.name,
                    status: 'error',
                    error: 'Failed to generate image'
                  });
                }

                // Rate limiting for neighborhoods
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          }
        }

        // Update GitHub if we made changes
        if (updated && !dryRun) {
          const updateSuccess = await updateGitHubFile(
            owner, repo,
            'src/config/areas.json',
            areas,
            areasFile.sha,
            '[AI] Add hero images with logo watermark to areas and neighborhoods',
            GITHUB_TOKEN
          );
          console.log('Areas JSON update:', updateSuccess ? 'success' : 'failed');
        }
      } else {
        results.areas.push({ name: 'areas.json', status: 'error', error: 'File is empty or not found' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        results,
        summary: {
          servicesProcessed: results.services.length,
          servicesSuccess: results.services.filter(r => r.status === 'success').length,
          areasProcessed: results.areas.length,
          areasSuccess: results.areas.filter(r => r.status === 'success').length,
          neighborhoodsProcessed: results.neighborhoods.length,
          neighborhoodsSuccess: results.neighborhoods.filter(r => r.status === 'success').length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in backfill-hero-images:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to backfill hero images'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
