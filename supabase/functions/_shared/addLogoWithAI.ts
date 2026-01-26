/**
 * Use Gemini AI to add a logo to all appropriate places in an image
 *
 * This replicates the approach shown in the screenshot:
 * 1. Take the generated image
 * 2. Take the real logo
 * 3. Ask Gemini to add the logo to vans, uniforms, equipment, etc.
 */

/**
 * Add logo to image using Gemini's image editing capabilities
 *
 * @param imageBase64 - The original image as base64 string (without data: prefix)
 * @param logoBase64 - The logo image as base64 string (without data: prefix)
 * @param apiKey - Gemini API key
 * @returns The edited image as base64 string, or null if failed
 */
export async function addLogoWithAI(
  imageBase64: string,
  logoBase64: string,
  apiKey: string
): Promise<string | null> {
  try {
    console.log('Adding logo to image using Gemini AI...');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Add the second logo to all places where you see the first logo or any company branding. Place the logo on the van's side panel, on worker uniforms/shirts, on any equipment or signage. Make it look natural and professionally applied like real vinyl graphics or embroidered logos. Keep everything else in the image exactly the same."
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: imageBase64
                }
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: logoBase64
                }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ["image", "text"],
            temperature: 0.4,  // Lower temperature for more consistent edits
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error during logo addition:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const parts = result.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (imagePart?.inlineData) {
      console.log('Logo successfully added to image via AI');
      return imagePart.inlineData.data;
    }

    console.warn('No image returned from Gemini logo addition');
    return null;
  } catch (err) {
    console.error('Error adding logo with AI:', err);
    return null;
  }
}

/**
 * Fetch a logo from URL and convert to base64
 */
export async function fetchLogoAsBase64(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.warn('Failed to fetch logo from URL:', logoUrl);
      return null;
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('Error fetching logo:', err);
    return null;
  }
}
