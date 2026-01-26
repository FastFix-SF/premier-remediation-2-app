import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addWatermark } from "../_shared/addWatermark.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt templates for different content types
const getServicePrompt = (service: { name: string; shortDescription: string; icon?: string }) => `
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

const getAreaPrompt = (area: { name: string; fullName: string; population?: string }) => `
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data, recordId, saveToStorage, logoUrl, addWatermarkLogo } = await req.json();

    if (!type || !data) {
      return new Response(
        JSON.stringify({ error: 'Type (service/area) and data are required' }),
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
      prompt = getServicePrompt(data);
    } else if (type === 'area') {
      prompt = getAreaPrompt(data);
    } else {
      return new Response(
        JSON.stringify({ error: 'Type must be "service" or "area"' }),
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

        // Add watermark if logo URL is provided
        if (addWatermarkLogo && logoUrl) {
          console.log('Adding watermark with logo:', logoUrl);
          try {
            imageBlob = await addWatermark(imageBlob, logoUrl, {
              position: 'bottom-right',
              opacity: 0.7,
              scale: 0.15,
              padding: 30
            });
            console.log('Watermark added successfully');
          } catch (watermarkError) {
            console.error('Failed to add watermark, continuing without:', watermarkError);
            // Continue with original image if watermarking fails
          }
        }

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
