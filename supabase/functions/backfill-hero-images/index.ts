import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service image prompt
const getServicePrompt = (service: { name: string; shortDescription: string }) => `
Create a professional commercial property remediation service image with these exact specifications:

COMPOSITION & FRAMING:
- Wide-angle professional photo of a commercial building or multifamily property
- Golden hour lighting (warm amber sun with soft purple/blue shadows)
- Aspect ratio 16:10, landscape orientation
- Professional remediation team visible but not prominent

MAIN SUBJECT:
- Focus on ${service.name} scenario
- ${service.shortDescription}
- Show professional equipment and safety measures
- Modern commercial building or apartment complex as backdrop

ATMOSPHERE & LIGHTING:
- Professional, trustworthy atmosphere
- Clean, well-lit with natural light feel
- Not too dramatic - reassuring and competent

STYLE REFERENCE:
- Professional commercial services marketing photography
- Similar to ServiceMaster or SERVPRO marketing materials
- Ultra high resolution, sharp details
- Clean, modern, premium feel

COLOR PALETTE:
- Warm amber/gold highlights for hope/restoration
- Professional blue/navy accents
- Clean white and gray building tones
- Safety orange/yellow for equipment visibility

The overall impression should be "professional, trustworthy commercial remediation experts" - showcasing competence and reliability for property managers.
`;

// Area/City image prompt
const getAreaPrompt = (area: { name: string; fullName?: string }) => `
Create a stunning professional cityscape photograph of ${area.fullName || area.name} with these exact specifications:

COMPOSITION & FRAMING:
- Wide-angle aerial or elevated view of the city skyline
- Golden hour lighting (warm amber sun with soft purple/blue shadows)
- Shallow depth of field on distant hills/background
- Aspect ratio 16:10, landscape orientation

MAIN SUBJECTS:
- Iconic landmarks or recognizable skyline of ${area.name}
- Mix of commercial buildings and residential areas
- Bay Area elements if applicable (water, hills, bridges in distance)
- Tree-lined streets and urban landscape

ATMOSPHERE & LIGHTING:
- Soft, warm sunset glow hitting building facades
- Light haze creating depth
- Rich, saturated colors but natural-looking
- Shadows are soft blue/purple, not harsh black

STYLE REFERENCE:
- Professional real estate marketing photography
- Similar to Apple Maps or Google Earth promotional imagery
- Ultra high resolution, sharp details on architecture
- Warm, inviting, aspirational feeling

COLOR PALETTE:
- Warm amber/gold highlights
- Deep teal/blue shadows
- Rich green foliage
- Cream/white building accents

The overall impression should be "premium California commercial property market" - showcasing ${area.name} as an attractive, thriving business community.
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

// Upload image to Supabase Storage
async function uploadToStorage(
  supabase: any,
  imageData: string,
  type: 'service' | 'area',
  slug: string
): Promise<string | null> {
  try {
    // Convert base64 data URL to blob
    const [meta, base64Data] = imageData.split(',');
    const mimeType = meta.match(/data:([^;]+)/)?.[1] || 'image/png';
    const byteCharacters = atob(base64Data);
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
    const { types = ['services', 'areas'], dryRun = false } = await req.json() || {};

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
    const owner = 'FastFix-SF';
    const repo = 'premier-remediation-2-app';

    const results: {
      services: Array<{ name: string; status: string; imageUrl?: string; error?: string }>;
      areas: Array<{ name: string; status: string; imageUrl?: string; error?: string }>;
    } = { services: [], areas: [] };

    // Process services
    if (types.includes('services')) {
      console.log('Processing services...');
      const servicesFile = await fetchGitHubFile(owner, repo, 'src/config/services.json', GITHUB_TOKEN);

      if (servicesFile) {
        const services = servicesFile.content;
        let updated = false;

        for (const service of services) {
          if (!service.image || service.image === '') {
            console.log(`Generating image for service: ${service.name}`);

            if (dryRun) {
              results.services.push({ name: service.name, status: 'would_generate' });
              continue;
            }

            // Generate image
            const prompt = getServicePrompt({
              name: service.name,
              shortDescription: service.shortDescription || ''
            });

            const imageData = await generateImage(prompt, GEMINI_API_KEY);

            if (imageData) {
              // Upload to storage
              const publicUrl = await uploadToStorage(supabase, imageData, 'service', service.slug);

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
            '[AI] Add hero images to services',
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
          if (!area.image || area.image === '') {
            console.log(`Generating image for area: ${area.name}`);

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
              // Upload to storage
              const publicUrl = await uploadToStorage(supabase, imageData, 'area', area.slug);

              if (publicUrl) {
                area.image = publicUrl;
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
        }

        // Update GitHub if we made changes
        if (updated && !dryRun) {
          const updateSuccess = await updateGitHubFile(
            owner, repo,
            'src/config/areas.json',
            areas,
            areasFile.sha,
            '[AI] Add hero images to areas',
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
