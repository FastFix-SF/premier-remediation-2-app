/**
 * Utility to add a business logo watermark to generated images
 *
 * This function takes an image blob and a logo URL, then composites the logo
 * onto the image as a semi-transparent watermark in the bottom-right corner.
 *
 * Uses canvas-based image manipulation for server-side processing.
 */

/**
 * Add a watermark logo to an image
 *
 * @param imageBlob - The original image as a Blob
 * @param logoUrl - URL to the logo image (should be PNG with transparency)
 * @param options - Watermark options
 * @returns The watermarked image as a Blob
 */
export async function addWatermark(
  imageBlob: Blob,
  logoUrl: string,
  options: {
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center' | 'center-right' | 'center-left';
    opacity?: number; // 0-1
    scale?: number; // relative to image width (e.g., 0.15 = 15% of image width)
    padding?: number; // pixels from edge
  } = {}
): Promise<Blob> {
  const {
    position = 'bottom-right',
    opacity = 0.7,
    scale = 0.15,
    padding = 20
  } = options;

  try {
    // In Deno edge functions, we need to use a different approach
    // We'll use ImageMagick via the canvas-compatible library or sharp

    // For now, we'll use a base64 compositing approach
    // This is a simplified version - in production you might want to use
    // a more robust library like sharp or ImageMagick

    // Fetch the logo
    const logoResponse = await fetch(logoUrl);
    if (!logoResponse.ok) {
      console.warn('Failed to fetch logo, returning original image');
      return imageBlob;
    }
    const logoBlob = await logoResponse.blob();

    // Convert blobs to base64
    const imageBase64 = await blobToBase64(imageBlob);
    const logoBase64 = await blobToBase64(logoBlob);

    // Use the compositing function (simplified for Deno)
    const compositedBase64 = await compositeImages(
      imageBase64,
      logoBase64,
      position,
      opacity,
      scale,
      padding
    );

    // Convert back to blob
    return base64ToBlob(compositedBase64, 'image/png');

  } catch (error) {
    console.error('Error adding watermark:', error);
    // Return original image if watermarking fails
    return imageBlob;
  }
}

/**
 * Convert Blob to base64 string
 */
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

/**
 * Composite two images using canvas-like approach
 * This is a placeholder - in a full implementation you would use
 * an image processing library that works in Deno
 *
 * For Deno Edge Functions, consider using:
 * - https://deno.land/x/canvas (canvas implementation for Deno)
 * - https://deno.land/x/skia_canvas (Skia-based canvas)
 * - Or process images via external API
 */
async function compositeImages(
  backgroundBase64: string,
  overlayBase64: string,
  position: string,
  opacity: number,
  scale: number,
  padding: number
): Promise<string> {
  // For a full implementation, you would:
  // 1. Decode both images
  // 2. Create a canvas with background dimensions
  // 3. Draw the background
  // 4. Calculate overlay position based on position parameter
  // 5. Draw the overlay with specified opacity and scale
  // 6. Export the result

  // For now, we'll try to use a canvas library if available
  try {
    // Try to import canvas (may not be available in all environments)
    const { createCanvas, loadImage } = await import('https://deno.land/x/canvas@v1.4.2/mod.ts');

    // Load images
    const bgImageData = `data:image/png;base64,${backgroundBase64}`;
    const overlayImageData = `data:image/png;base64,${overlayBase64}`;

    const bgImage = await loadImage(bgImageData);
    const overlayImage = await loadImage(overlayImageData);

    // Create canvas with background dimensions
    const canvas = createCanvas(bgImage.width(), bgImage.height());
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(bgImage, 0, 0);

    // Calculate overlay dimensions
    const overlayWidth = bgImage.width() * scale;
    const overlayHeight = (overlayImage.height() / overlayImage.width()) * overlayWidth;

    // Calculate position
    let x: number, y: number;
    switch (position) {
      case 'bottom-left':
        x = padding;
        y = bgImage.height() - overlayHeight - padding;
        break;
      case 'top-right':
        x = bgImage.width() - overlayWidth - padding;
        y = padding;
        break;
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'center':
        x = (bgImage.width() - overlayWidth) / 2;
        y = (bgImage.height() - overlayHeight) / 2;
        break;
      case 'center-right':
        // Position for van's side panel - right side, vertically centered
        x = bgImage.width() - overlayWidth - padding;
        y = (bgImage.height() - overlayHeight) / 2;
        break;
      case 'center-left':
        x = padding;
        y = (bgImage.height() - overlayHeight) / 2;
        break;
      case 'bottom-right':
      default:
        x = bgImage.width() - overlayWidth - padding;
        y = bgImage.height() - overlayHeight - padding;
        break;
    }

    // Set opacity and draw overlay
    ctx.globalAlpha = opacity;
    ctx.drawImage(overlayImage, x, y, overlayWidth, overlayHeight);
    ctx.globalAlpha = 1.0;

    // Export to base64
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.split(',')[1]; // Remove data URL prefix

  } catch (error) {
    console.warn('Canvas not available, returning original image:', error);
    // If canvas is not available, return the original image
    return backgroundBase64;
  }
}

/**
 * Get the logo URL for a business from their config
 * Falls back to a default FastFix logo if not available
 */
export function getBusinessLogoUrl(businessConfig: { logo?: string; logoDark?: string }): string | null {
  // Prefer logoDark for watermarking (usually has better contrast)
  // Otherwise use regular logo
  const logoUrl = businessConfig.logoDark || businessConfig.logo;

  // Ensure it's an absolute URL
  if (logoUrl && !logoUrl.startsWith('http')) {
    // This would need to be resolved based on your deployment
    // For now, return null if not a full URL
    console.warn('Logo URL is not absolute, cannot use for watermark');
    return null;
  }

  return logoUrl || null;
}
