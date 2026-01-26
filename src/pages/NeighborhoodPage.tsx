import React, { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import {
  Phone, Mail, Star, Shield, Award, CheckCircle, MapPin, Building2,
  ChevronDown, ChevronUp, ArrowRight, Clock, Users, FileText, Home
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import RoofingFriendHeader from '../components/RoofingFriendHeader';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { LocalBusinessStructuredData, ServiceStructuredData, FAQStructuredData } from '../components/StructuredData';
import Breadcrumbs from '../components/Breadcrumbs';
import { useAreaBySlug, useBusiness, useTrustIndicators, useServices } from '../hooks/useBusinessConfig';
import * as LucideIcons from 'lucide-react';

// Helper to get icon component from string name
const getIcon = (iconName: string) => {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || LucideIcons.CheckCircle;
};

// FAQ Accordion Item Component
const FAQItem = ({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) => (
  <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
    <button
      onClick={onToggle}
      className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
    >
      <h3 className="text-lg font-semibold text-foreground pr-4">{question}</h3>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
      ) : (
        <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      )}
    </button>
    {isOpen && (
      <div className="px-6 pb-5">
        <p className="text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    )}
  </div>
);

/**
 * NeighborhoodPage - SEO/AEO optimized pages for individual neighborhoods within cities
 *
 * Route: /service-areas/:locationSlug/:neighborhoodSlug
 * Example: /service-areas/oakland-ca/downtown-oakland
 *
 * This component provides:
 * - Unique SEO title and description per neighborhood
 * - AEO-optimized structured data for voice search
 * - Local business schema with specific neighborhood targeting
 * - FAQ structured data for featured snippets
 * - Internal linking to parent city and sibling neighborhoods
 */
const NeighborhoodPage: React.FC = () => {
  const { locationSlug, neighborhoodSlug } = useParams<{ locationSlug: string; neighborhoodSlug: string }>();
  const area = useAreaBySlug(locationSlug || '');
  const business = useBusiness();
  const trustIndicators = useTrustIndicators();
  const allServices = useServices();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  // Find the neighborhood in the area's neighborhoods array
  // For now, we'll derive neighborhood data from the slug
  const neighborhoodName = neighborhoodSlug
    ? neighborhoodSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '';

  // If area doesn't exist, redirect to service areas
  if (!area) {
    return <Navigate to="/service-areas" replace />;
  }

  // Check if this neighborhood exists in the area
  const neighborhoodExists = area.neighborhoods?.some(
    n => typeof n === 'string'
      ? n.toLowerCase().replace(/\s+/g, '-') === neighborhoodSlug
      : (n as any).slug === neighborhoodSlug
  );

  // Get neighborhood data (could be string or object)
  const neighborhoodData = area.neighborhoods?.find(
    n => typeof n === 'string'
      ? n.toLowerCase().replace(/\s+/g, '-') === neighborhoodSlug
      : (n as any).slug === neighborhoodSlug
  );

  // If neighborhood doesn't exist, redirect to parent area
  if (!neighborhoodExists && area.neighborhoods && area.neighborhoods.length > 0) {
    return <Navigate to={`/service-areas/${locationSlug}`} replace />;
  }

  // Handle both string neighborhoods and object neighborhoods
  const displayName = typeof neighborhoodData === 'string'
    ? neighborhoodData
    : (neighborhoodData as any)?.name || neighborhoodName;

  const neighborhoodDescription = typeof neighborhoodData === 'object' && neighborhoodData
    ? (neighborhoodData as any).description
    : `Professional water damage restoration and mold remediation services in ${displayName}, ${area.name}. Our local team provides 24/7 emergency response to residential and commercial properties.`;

  const neighborhoodFaqs = typeof neighborhoodData === 'object' && neighborhoodData
    ? (neighborhoodData as any).faqs || []
    : [
        {
          question: `What water damage services do you offer in ${displayName}?`,
          answer: `We provide complete water damage restoration in ${displayName}, ${area.name} including emergency water extraction, structural drying, mold prevention, and full restoration services. Our team responds within 60 minutes.`
        },
        {
          question: `How quickly can you respond to water damage in ${displayName}?`,
          answer: `We offer 60-minute emergency response in ${displayName} and throughout ${area.name}. Our local team is available 24/7 to help with water damage emergencies.`
        },
        {
          question: `Do you work with insurance for water damage claims in ${displayName}?`,
          answer: `Yes, we work with all major insurance companies for water damage claims in ${displayName}. We help document the damage and work directly with your insurer to streamline the claims process.`
        }
      ];

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Service Areas', url: '/service-areas' },
    { name: area.name, url: `/service-areas/${area.slug}` },
    { name: displayName, url: `/service-areas/${area.slug}/${neighborhoodSlug}` }
  ];

  // Get featured services
  const featuredServices = allServices.filter(s => s.isFeatured).slice(0, 4);

  // Get sibling neighborhoods for internal linking
  const siblingNeighborhoods = (area.neighborhoods || [])
    .filter(n => {
      const slug = typeof n === 'string'
        ? n.toLowerCase().replace(/\s+/g, '-')
        : (n as any).slug;
      return slug !== neighborhoodSlug;
    })
    .slice(0, 6);

  // Generate SEO content
  const seoTitle = typeof neighborhoodData === 'object' && (neighborhoodData as any)?.seoTitle
    ? (neighborhoodData as any).seoTitle
    : `Water Damage Restoration ${displayName}, ${area.name} | ${business.name}`;

  const seoDescription = typeof neighborhoodData === 'object' && (neighborhoodData as any)?.seoDescription
    ? (neighborhoodData as any).seoDescription
    : `Professional water damage restoration in ${displayName}, ${area.name}. 24/7 emergency service, fast response, insurance assistance. Call ${business.phone}!`;

  const seoKeywords = typeof neighborhoodData === 'object' && (neighborhoodData as any)?.seoKeywords
    ? (neighborhoodData as any).seoKeywords
    : [
        `water damage ${displayName}`,
        `flood cleanup ${displayName} ${area.name}`,
        `mold removal ${displayName}`,
        `emergency water extraction ${displayName}`,
        `${displayName} water damage restoration`,
        `burst pipe repair ${displayName}`,
        `basement flooding ${displayName}`,
        `water damage company ${displayName} ${area.name}`
      ];

  // AEO summary for voice search
  const aeoSummary = typeof neighborhoodData === 'object' && (neighborhoodData as any)?.aeoSummary
    ? (neighborhoodData as any).aeoSummary
    : `${business.name} provides professional water damage restoration services in ${displayName}, ${area.name}. Our local team offers 24/7 emergency response, water extraction, drying, mold prevention, and complete restoration for homes and businesses.`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={Array.isArray(seoKeywords) ? seoKeywords.join(', ') : seoKeywords}
        location={{
          name: `${displayName}, ${area.name}`,
          region: 'California'
        }}
      />

      <LocalBusinessStructuredData
        location={{
          name: `${displayName}, ${area.name}`,
          coordinates: area.coordinates
        }}
      />

      <ServiceStructuredData
        serviceName="Water Damage Restoration"
        location={`${displayName}, ${area.name}`}
      />

      {neighborhoodFaqs.length > 0 && (
        <FAQStructuredData faqs={neighborhoodFaqs} />
      )}

      <RoofingFriendHeader />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-white py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Breadcrumbs items={breadcrumbItems} />
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Location Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <MapPin className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-white/90">
                  Serving {displayName}, {area.name}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
                Water Damage Restoration in
                <span className="block text-accent mt-2">{displayName}</span>
              </h1>

              <p className="text-lg text-white/90 mb-8 leading-relaxed">
                {neighborhoodDescription}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a href={`tel:${business.phoneRaw}`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    <Phone className="w-5 h-5 mr-2" />
                    Call {business.phone}
                  </Button>
                </a>
                <Link to="/contact">
                  <Button variant="white-outline" size="lg" className="w-full sm:w-auto">
                    Get Free Assessment
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-4 pt-6 border-t border-white/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <span className="text-white/90 text-sm">60-Min Response</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span className="text-white/90 text-sm">Licensed & Insured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-accent" />
                  <span className="text-white/90 text-sm">5-Star Rated</span>
                </div>
              </div>
            </div>

            {/* Neighborhood Info Card */}
            <div className="relative hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Home className="w-10 h-10 text-white" />
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{displayName}</h3>
                  <p className="text-white/80">{area.name}, California</p>
                </div>
                {/* Quick Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <Clock className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">24/7 Emergency Service</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <MapPin className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">Local {displayName} Team</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 rounded-lg p-3">
                    <Shield className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-sm">Insurance Claim Help</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AEO Summary Section - Voice Search Optimized */}
      <section className="py-12 bg-muted/10 border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2">
                  About Our {displayName} Services
                </h2>
                <p className="text-muted-foreground leading-relaxed">{aeoSummary}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block text-primary font-medium mb-2">Our Services</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Services in {displayName}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive water damage and restoration services for {displayName} residents
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredServices.map((service) => {
              const ServiceIcon = getIcon(service.icon);
              return (
                <Link
                  key={service.slug}
                  to={`/services/${service.slug}`}
                  className="group p-6 bg-muted/30 rounded-2xl hover:bg-primary hover:text-white transition-all"
                >
                  <div className="w-12 h-12 bg-primary/10 group-hover:bg-white/20 rounded-xl flex items-center justify-center mb-4 transition-colors">
                    <ServiceIcon className="w-6 h-6 text-primary group-hover:text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground group-hover:text-white mb-2">
                    {service.name}
                  </h3>
                  <p className="text-sm text-muted-foreground group-hover:text-white/80 line-clamp-2">
                    {service.shortDescription}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {neighborhoodFaqs.length > 0 && (
        <section className="py-16 bg-muted/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block text-primary font-medium mb-2">Common Questions</span>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                FAQ - {displayName} Water Damage
              </h2>
              <p className="text-muted-foreground">
                Answers to common questions about our services in {displayName}
              </p>
            </div>

            <div className="space-y-4">
              {neighborhoodFaqs.map((faq: { question: string; answer: string }, index: number) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === index}
                  onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Nearby Neighborhoods - Internal Linking for SEO */}
      {siblingNeighborhoods.length > 0 && (
        <section className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block text-primary font-medium mb-2">Nearby Areas</span>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                Other {area.name} Neighborhoods We Serve
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {siblingNeighborhoods.map((neighborhood, index) => {
                const name = typeof neighborhood === 'string'
                  ? neighborhood
                  : (neighborhood as any).name;
                const slug = typeof neighborhood === 'string'
                  ? neighborhood.toLowerCase().replace(/\s+/g, '-')
                  : (neighborhood as any).slug;

                return (
                  <Link
                    key={index}
                    to={`/service-areas/${locationSlug}/${slug}`}
                    className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl hover:bg-primary hover:text-white transition-colors group"
                  >
                    <MapPin className="w-5 h-5 text-primary group-hover:text-white flex-shrink-0" />
                    <span className="font-medium">{name}</span>
                    <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link to={`/service-areas/${locationSlug}`}>
                <Button variant="outline" size="lg">
                  <MapPin className="w-5 h-5 mr-2" />
                  View All {area.name} Areas
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/30 rounded-full -translate-y-1/2 -translate-x-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/20 rounded-full translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Serving {displayName}, {area.name}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
            Need Water Damage Help in {displayName}?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Our local team is ready to respond 24/7. Call now for fast, professional water damage restoration.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={`tel:${business.phoneRaw}`}>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8">
                <Phone className="w-5 h-5 mr-2" />
                Call {business.phone}
              </Button>
            </a>
            <Link to="/contact">
              <Button variant="white-outline" size="lg" className="w-full sm:w-auto text-lg px-8">
                <Mail className="w-5 h-5 mr-2" />
                Request Estimate
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default NeighborhoodPage;
