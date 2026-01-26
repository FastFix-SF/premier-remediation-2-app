import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addWatermark } from "../_shared/addWatermark.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Service image prompt - with natural branding integration
const getServicePrompt = (service: { name: string; shortDescription: string; icon?: string }, businessName?: string) => `
Create a hyper-realistic professional photograph of a ${service.name} job in progress with these exact specifications:

COMPOSITION & FRAMING:
- Interior or exterior shot of an active remediation job site
- Golden hour or professional indoor lighting
- Aspect ratio 16:10, landscape orientation
- Workers actively engaged in ${service.name} work

MAIN SUBJECT - ${service.name.toUpperCase()}:
- ${service.shortDescription}
- Professional crew of 2-3 workers in branded uniforms
- Industrial-grade equipment with company branding visible
- Active work scene - not posed, looks candid and real

COMPANY BRANDING - "${businessName || 'Premier Remediation'}" - USE THIS EXACT LOGO DESIGN:
The company logo is a CIRCULAR BADGE with:
- The words "PREMIER" at the top curved along the circle
- The words "REMEDIATION" at the bottom curved along the circle
- Inside the circle: a BLUE WATER DROPLET on the left and RED/ORANGE FLAMES on the right
- Small white stars decorating the design
- Red and white stripes at the bottom (American flag style)
- Colors: Navy blue, red, white, with blue and orange/red for the water and fire icons

PLACE THIS LOGO NATURALLY ON:
- The side of a white work van/truck (large, prominent, readable)
- Worker uniforms (polo shirts or safety vests)
- Equipment cases and tool boxes
- Any visible flyers, door hangers, or signage
- The logo should look like real vinyl graphics/embroidery, not photoshopped

ATMOSPHERE & LIGHTING:
- Documentary/editorial photography style - looks like a real job site photo
- Natural lighting with professional quality
- Authentic work environment - some controlled mess is okay
- Real commercial or residential property setting

STYLE REFERENCE:
- Looks like a real photo taken by a marketing team on an actual job
- Similar to ServiceMaster, SERVPRO, or Paul Davis marketing photos
- Photo-journalistic quality - not overly staged
- High resolution, sharp focus on workers and branding

The image should look 100% like a real photograph from an actual ${service.name} job. The company branding with the circular water/fire logo should be clearly visible and look like authentic business branding, not added digitally.
`;

// Area/City image prompt - with specific local landmarks
const getAreaPrompt = (area: { name: string; fullName: string; population?: string }) => {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, recordId, saveToStorage, logoUrl, addWatermarkLogo, businessName } = await req.json();

    if (!type || !data) {
      return new Response(
        JSON.stringify({ error: 'Type (service/area/neighborhood) and data are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key - try Gemini first, fallback to Lovable gateway
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error('Neither GEMINI_API_KEY nor LOVABLE_API_KEY is configured');
    }

    // Generate the prompt based on type
    let prompt: string;
    if (type === 'service') {
      prompt = getServicePrompt(data, businessName);
    } else if (type === 'area') {
      prompt = getAreaPrompt(data);
    } else if (type === 'neighborhood') {
      prompt = getNeighborhoodPrompt(data);
    } else {
      return new Response(
        JSON.stringify({ error: 'Type must be "service", "area", or "neighborhood"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating hero image for ${type}: ${data.name}`);

    let generatedImageUrl: string;

    // Use Gemini API directly if available, otherwise use Lovable gateway
    if (GEMINI_API_KEY) {
      // Direct Gemini API call
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ],
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
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = await response.json();

      // Extract image from Gemini response
      const parts = result.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

      if (imagePart?.inlineData) {
        // Convert base64 to data URL
        generatedImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      } else {
        throw new Error('No image generated in Gemini response');
      }
    } else {
      // Use Lovable gateway
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ],
          modalities: ['image', 'text']
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable Gateway error:', response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        throw new Error(`Lovable Gateway error: ${response.status}`);
      }

      const responseData = await response.json();
      generatedImageUrl = responseData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        throw new Error('No image generated in Lovable response');
      }
    }

    console.log(`Successfully generated hero image for ${type}: ${data.name}`);

    // If saveToStorage is true and we have a recordId, upload to Supabase Storage
    let storedUrl = generatedImageUrl;

    if (saveToStorage && recordId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      try {
        // Convert data URL to blob if needed
        let imageBlob: Blob;
        if (generatedImageUrl.startsWith('data:')) {
          const [meta, base64Data] = generatedImageUrl.split(',');
          const mimeType = meta.match(/data:([^;]+)/)?.[1] || 'image/png';
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          imageBlob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
        } else {
          // Fetch the image from URL
          const imageResponse = await fetch(generatedImageUrl);
          imageBlob = await imageResponse.blob();
        }

        // No watermark overlay - branding is included naturally in the AI-generated image
        // via the prompt (on vans, uniforms, equipment, flyers, etc.)

        // Upload to Supabase Storage
        const fileName = `${type}-hero-${recordId}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('hero-images')
          .upload(fileName, imageBlob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          // Continue with the original URL if storage fails
        } else {
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('hero-images')
            .getPublicUrl(fileName);

          storedUrl = publicUrlData.publicUrl;

          // Update the record with the new image URL
          const tableName = type === 'service' ? 'services' : 'areas';
          const { error: updateError } = await supabase
            .from(tableName)
            .update({ hero_image: storedUrl })
            .eq('id', recordId);

          if (updateError) {
            console.error('Database update error:', updateError);
          } else {
            console.log(`Updated ${tableName} record ${recordId} with hero image URL`);
          }
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
        // Continue with the original URL if storage fails
      }
    }

    return new Response(
      JSON.stringify({
        heroImageUrl: storedUrl,
        originalUrl: generatedImageUrl !== storedUrl ? generatedImageUrl : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-hero-image:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate hero image'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
