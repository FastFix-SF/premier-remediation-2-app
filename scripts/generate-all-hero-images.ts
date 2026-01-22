/**
 * Batch Hero Image Generator
 *
 * This script generates hero images for all services and areas using the Gemini AI.
 * Run this script locally or from the admin to populate all hero images.
 *
 * Usage:
 *   npx ts-node scripts/generate-all-hero-images.ts
 *
 * Or from the browser console (after importing):
 *   import { generateAllImages } from './scripts/generate-all-hero-images';
 *   await generateAllImages();
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vdjubzjqlegcybydbjvk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkanViempxbGVnY3lieWRianZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NTE3MzEsImV4cCI6MjA4NDUyNzczMX0.fdvAGfYZ4wB3M8oFXZj0beX-2_cM0REHAwatJy5OcWQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service data to generate images for
const services = [
  {
    name: "Water Damage Mitigation",
    shortDescription: "Swift response to water events for commercial and multifamily properties.",
    slug: "water-damage-mitigation"
  },
  {
    name: "Mold Remediation",
    shortDescription: "Comprehensive mold removal with detailed cleaning and verification support.",
    slug: "mold-remediation"
  },
  {
    name: "Fire & Smoke Damage Cleanup",
    shortDescription: "Thorough cleanup after fire events to reduce particulate and odor impact.",
    slug: "fire-smoke-damage-cleanup"
  },
  {
    name: "Asbestos & Lead Abatement",
    shortDescription: "Compliant abatement and removal of hazardous materials when required.",
    slug: "asbestos-lead-abatement"
  },
  {
    name: "Clearance & Verification Support",
    shortDescription: "Ensuring properties are confidently ready for re-occupancy after remediation.",
    slug: "clearance-verification-support"
  },
  {
    name: "Commercial Property Remediation",
    shortDescription: "Specialized remediation services for high-rises, hotels, retail, and managed buildings.",
    slug: "commercial-property-remediation"
  },
  {
    name: "Multifamily Property Remediation",
    shortDescription: "Expert remediation solutions for apartment complexes and residential communities.",
    slug: "multifamily-property-remediation"
  }
];

// Area data to generate images for
const areas = [
  { name: "San Francisco", fullName: "San Francisco, California", slug: "san-francisco" },
  { name: "Oakland", fullName: "Oakland, California", slug: "oakland" },
  { name: "Berkeley", fullName: "Berkeley, California", slug: "berkeley" },
  { name: "San Jose", fullName: "San Jose, California", slug: "san-jose" },
  { name: "Alameda County", fullName: "Alameda County, California", slug: "alameda-county" },
  { name: "Contra Costa County", fullName: "Contra Costa County, California", slug: "contra-costa-county" }
];

async function generateServiceImage(service: typeof services[0]): Promise<string | null> {
  console.log(`Generating image for service: ${service.name}...`);

  try {
    const { data, error } = await supabase.functions.invoke('generate-hero-image', {
      body: {
        type: 'construction', // Use construction type for remediation services
        prompt: `${service.name} - ${service.shortDescription}. Professional commercial property remediation team working on a modern building. Show safety equipment, professional workers, and a commercial or multifamily property backdrop.`
      }
    });

    if (error) {
      console.error(`Error generating image for ${service.name}:`, error);
      return null;
    }

    console.log(`✓ Generated image for ${service.name}`);
    return data?.imageUrl || data?.url || null;
  } catch (err) {
    console.error(`Exception generating image for ${service.name}:`, err);
    return null;
  }
}

async function generateAreaImage(area: typeof areas[0]): Promise<string | null> {
  console.log(`Generating image for area: ${area.name}...`);

  try {
    const { data, error } = await supabase.functions.invoke('generate-hero-image', {
      body: {
        type: 'city',
        prompt: area.fullName
      }
    });

    if (error) {
      console.error(`Error generating image for ${area.name}:`, error);
      return null;
    }

    console.log(`✓ Generated image for ${area.name}`);
    return data?.imageUrl || data?.url || null;
  } catch (err) {
    console.error(`Exception generating image for ${area.name}:`, err);
    return null;
  }
}

async function generateAllServiceImages(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  for (const service of services) {
    const imageUrl = await generateServiceImage(service);
    if (imageUrl) {
      results[service.slug] = imageUrl;
    }
    // Rate limiting - wait 3 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return results;
}

async function generateAllAreaImages(): Promise<Record<string, string>> {
  const results: Record<string, string> = {};

  for (const area of areas) {
    const imageUrl = await generateAreaImage(area);
    if (imageUrl) {
      results[area.slug] = imageUrl;
    }
    // Rate limiting - wait 3 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return results;
}

export async function generateAllImages() {
  console.log('Starting batch image generation...\n');

  console.log('=== Generating Service Images ===');
  const serviceImages = await generateAllServiceImages();

  console.log('\n=== Generating Area Images ===');
  const areaImages = await generateAllAreaImages();

  console.log('\n=== Results ===');
  console.log('Service Images:', serviceImages);
  console.log('Area Images:', areaImages);

  return { serviceImages, areaImages };
}

// Run if called directly
if (typeof window === 'undefined') {
  generateAllImages()
    .then(results => {
      console.log('\nDone! Copy these URLs to your services.json and areas.json files.');
      console.log(JSON.stringify(results, null, 2));
    })
    .catch(console.error);
}
