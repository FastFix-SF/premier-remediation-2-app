/**
 * Centralized Company Configuration
 *
 * This file reads from business.json which is synced from Supabase CMS.
 * When you update content in the admin dashboard and click "Sync to GitHub",
 * business.json is updated and Vercel auto-deploys with the new content.
 *
 * NOTE: If business.json doesn't exist or has issues, fallback values are used.
 */

import businessJson from './business.json';
import servicesJson from './services.json';
import areasJson from './areas.json';

// Type for the JSON config
interface BusinessJson {
  name?: string;
  tagline?: string;
  description?: string;
  phone?: string;
  phoneRaw?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    full?: string;
  };
  owner?: string;
  logo?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  hours?: string;
  certifications?: string[];
  uniqueSellingPoints?: string[];
  social?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    yelp?: string;
    youtube?: string;
    tiktok?: string;
    google?: string;
  };
  seo?: {
    siteUrl?: string;
    defaultTitle?: string;
    titleTemplate?: string;
    description?: string;
    keywords?: string[];
  };
}

interface ServiceJson {
  id?: string;
  name: string;
  slug: string;
  shortDescription?: string;
  longDescription?: string;
  icon?: string;
  image?: string;
  benefits?: string[];
  process?: Array<{ step: number; title: string; description: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  seoKeywords?: string[];
  isFeatured?: boolean;
}

interface AreaJson {
  slug: string;
  name: string;
  fullName?: string;
}

// Cast imports
const business = businessJson as BusinessJson;
const services = servicesJson as ServiceJson[];
const areas = areasJson as AreaJson[];

// Parse hours string like "Mon-Fri: 8am-6pm" into structured format
function parseHours(hoursString?: string) {
  const defaultHours = {
    weekdays: "Mon - Fri: 8AM - 6PM",
    weekends: "Sat: 9AM - 4PM",
    emergency: "24/7 Emergency Service",
    schema: "Mo-Fr 08:00-18:00",
  };

  if (!hoursString) return defaultHours;

  return {
    weekdays: hoursString,
    weekends: "Sat: 9AM - 4PM",
    emergency: "24/7 Emergency Service",
    schema: "Mo-Fr 08:00-18:00",
  };
}

// Extract service areas from areas.json
function getServiceAreas(): string[] {
  // Read service areas from areas.json
  if (areas && areas.length > 0) {
    return areas.map(area => area.name);
  }

  // Fallback to default areas if areas.json is empty
  return [
    business.address?.city || "San Francisco",
    "Oakland",
    "San Jose",
    "Berkeley",
    "Fremont"
  ];
}

// Map services from JSON to the format expected by the template
function mapServices(): Array<{ name: string; path: string }> {
  if (!services || services.length === 0) {
    return [
      { name: "Service 1", path: "/services/1" },
      { name: "Service 2", path: "/services/2" },
    ];
  }

  return services.map(service => ({
    name: service.name,
    path: `/services/${service.slug}`
  }));
}

export const companyConfig = {
  // Company Identity
  name: business.name || "Business Name",

  // Website URL (for payment links, sharing, etc.)
  websiteUrl: business.seo?.siteUrl || "https://business.com",
  legalName: business.name || "Business Name, LLC",
  shortName: business.name || "Business",
  tagline: business.tagline || "Your Trusted Partner",
  description: business.description || "Professional services for your needs.",

  // Contact Information
  phone: business.phone || "(555) 000-0000",
  phoneRaw: business.phoneRaw || "+15550000000",
  email: business.email || "info@business.com",

  // Business Details
  licenseNumber: "",
  address: {
    street: business.address?.street || "123 Main St",
    city: business.address?.city || "City",
    state: business.address?.state || "CA",
    zip: business.address?.zip || "00000",
    full: business.address?.full || "123 Main St, City, CA 00000",
    region: `${business.address?.city || "City"}, ${business.address?.state || "CA"} Area`,
  },

  // Hours of Operation
  hours: parseHours(business.hours),

  // Service Areas
  serviceAreas: getServiceAreas(),

  // Social Media Links
  social: {
    youtube: business.social?.youtube || "",
    instagram: business.social?.instagram || "",
    facebook: business.social?.facebook || "",
    tiktok: business.social?.tiktok || "",
    google: business.social?.google || "",
    yelp: business.social?.yelp || "",
    linkedin: business.social?.linkedin || "",
  },

  // Logo
  logo: business.logo || "/logo.png",

  // SEO Defaults
  seo: {
    defaultTitle: business.seo?.defaultTitle || `${business.name || "Business"} | Professional Services`,
    defaultDescription: business.seo?.description || business.description || "Professional services description.",
    defaultKeywords: business.seo?.keywords?.join(", ") || "service, professional, local",
    siteName: business.name || "Business",
    author: business.owner || business.name || "Business",
  },

  // Ratings
  ratings: {
    average: "5.0",
    count: "0",
    best: "5",
    worst: "1",
  },

  // Pricing
  priceRange: "$$-$$$",

  // Services (from services.json)
  services: mapServices(),

  // Warranty Info
  warranty: {
    years: 25,
    description: "Comprehensive warranty covering materials and workmanship",
  },

  // Geo coordinates (for schema.org)
  coordinates: {
    lat: 37.7749,
    lng: -122.4194,
  },

  // Additional fields from business.json
  certifications: business.certifications || ["Licensed", "Insured", "Bonded"],
  uniqueSellingPoints: business.uniqueSellingPoints || ["Quality Service", "Fast Response", "Satisfaction Guaranteed"],
  colors: business.colors || {
    primary: "#1a3a5c",
    secondary: "#2d7dd2",
    accent: "#c41e3a"
  },
} as const;

// Type for the company config
export type CompanyConfig = typeof companyConfig;
