import React, { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import {
  Phone, Mail, Star, Shield, Award, CheckCircle, MapPin, Building2,
  ChevronDown, ChevronUp, ArrowRight, Clock, Users, FileText, Droplets
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
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

const AreaPage: React.FC = () => {
  const { locationSlug } = useParams<{ locationSlug: string }>();
  const area = useAreaBySlug(locationSlug || '');
  const business = useBusiness();
  const trustIndicators = useTrustIndicators();
  const allServices = useServices();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  if (!area) {
    return <Navigate to="/services" replace />;
  }

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Service Areas', url: '/service-areas' },
    { name: area.name, url: `/service-areas/${area.slug}` }
  ];

  // Get featured services for this area
  const featuredServices = allServices.filter(s => s.isFeatured).slice(0, 6);

  // Generate dynamic SEO content
  const seoTitle = area.seoTitle || `${business.name} in ${area.name} | Professional Remediation Services`;
  const seoDescription = area.seoDescription || `Professional water damage, mold remediation, and fire cleanup services in ${area.fullName || area.name}. Licensed contractors serving ${area.neighborhoods?.join(', ') || 'local neighborhoods'}. 24/7 emergency response.`;
  const seoKeywords = area.seoKeywords || [
    `remediation ${area.name}`,
    `water damage ${area.name}`,
    `mold removal ${area.name}`,
    `${area.name} commercial restoration`,
    `emergency cleanup ${area.name}`
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={Array.isArray(seoKeywords) ? seoKeywords.join(', ') : seoKeywords}
        location={{
          name: area.name,
          region: 'California'
        }}
      />

      <LocalBusinessStructuredData
        location={{
          name: area.name,
          coordinates: area.coordinates
        }}
      />

      <ServiceStructuredData
        serviceName="Commercial Remediation Services"
        location={area.fullName || area.name}
      />

      {area.faqs && area.faqs.length > 0 && (
        <FAQStructuredData faqs={area.faqs} />
      )}

      <RoofingFriendHeader />

      {/* Hero Section - Enhanced with gradient and location focus */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-white py-20 lg:py-28 overflow-hidden">
        {/* Background pattern */}
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
                <span className="text-sm font-medium text-white/90">Serving {area.name}, California</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                {business.name} in
                <span className="block text-accent mt-2">{area.name}</span>
              </h1>

              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                {area.description || `Professional water damage mitigation, mold remediation, and fire cleanup services for commercial and multifamily properties in ${area.fullName || area.name}.`}
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

              {/* Trust indicators row */}
              <div className="flex flex-wrap gap-6 pt-6 border-t border-white/20">
                {business.ratings && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <span className="text-white/90 text-sm">
                      {business.ratings.average}/5 ({business.ratings.count}+ reviews)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span className="text-white/90 text-sm">Licensed & Insured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" />
                  <span className="text-white/90 text-sm">24/7 Emergency</span>
                </div>
              </div>
            </div>

            {/* Hero Image or Map Card */}
            <div className="relative hidden lg:block">
              {(area.image || area.heroImage) ? (
                <img
                  src={area.image || area.heroImage}
                  alt={`${area.name} cityscape and service area`}
                  className="rounded-2xl shadow-2xl w-full h-80 object-cover"
                  loading="eager"
                />
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MapPin className="w-12 h-12 text-white" />
                  </div>
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{area.name}</h3>
                    <p className="text-white/80">{area.fullName || `${area.name}, California`}</p>
                  </div>
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{area.population || '100K+'}</div>
                      <div className="text-sm text-white/70">Population</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">{area.neighborhoods?.length || '10+'}+</div>
                      <div className="text-sm text-white/70">Areas Served</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AEO Local Summary Section */}
      {area.aeoSummary && (
        <section className="py-12 bg-muted/10 border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">About Our {area.name} Services</h2>
                  <p className="text-muted-foreground leading-relaxed">{area.aeoSummary}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Neighborhoods Section - Now with links to dedicated neighborhood pages */}
      {area.neighborhoods && area.neighborhoods.length > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-primary font-medium mb-2">Service Coverage</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                Areas We Serve in {area.name}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                We provide professional remediation services throughout {area.name} and surrounding neighborhoods.
                {area.population && ` Serving a population of ${area.population} residents.`}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {area.neighborhoods.map((neighborhood, index) => {
                // Handle both string and object neighborhood types
                const name = typeof neighborhood === 'string' ? neighborhood : (neighborhood as any).name;
                const slug = typeof neighborhood === 'string'
                  ? neighborhood.toLowerCase().replace(/\s+/g, '-')
                  : (neighborhood as any).slug;

                return (
                  <Link
                    key={index}
                    to={`/service-areas/${area.slug}/${slug}`}
                    className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl hover:bg-primary hover:text-white transition-colors group"
                  >
                    <CheckCircle className="w-5 h-5 text-primary group-hover:text-white flex-shrink-0" />
                    <span className="font-medium text-foreground group-hover:text-white">{name}</span>
                    <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Services Section - With links to service pages */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-primary font-medium mb-2">Our Services</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Remediation Services in {area.name}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive disaster recovery and environmental remediation for commercial properties
            </p>
          </div>

          {featuredServices.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredServices.map((service) => {
                const ServiceIcon = getIcon(service.icon);
                return (
                  <Link
                    key={service.slug}
                    to={`/services/${service.slug}`}
                    className="group p-6 bg-background border border-border/50 rounded-2xl hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <ServiceIcon className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {service.shortDescription}
                        </p>
                        <span className="inline-flex items-center gap-1 text-primary text-sm font-medium">
                          Learn more <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Fallback if no services defined - show area.services */
            area.services && area.services.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {area.services.map((serviceName, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Droplets className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">{serviceName}</h3>
                      </div>
                      <p className="text-muted-foreground">
                        Professional {serviceName.toLowerCase()} services for commercial and multifamily properties in {area.name}.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-primary font-medium mb-2">Why Choose Us</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Your Trusted {area.name} Remediation Partner
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {business.name} is committed to providing exceptional service to {area.name} property owners and managers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustIndicators.length > 0 ? (
              trustIndicators.map((indicator, index) => {
                const IndicatorIcon = getIcon(indicator.icon);
                return (
                  <div key={index} className="text-center p-6 bg-muted/30 rounded-2xl">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <IndicatorIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{indicator.text}</h3>
                    <p className="text-sm text-muted-foreground">
                      {indicator.description || `Trusted by ${area.name} businesses`}
                    </p>
                  </div>
                );
              })
            ) : (
              <>
                <div className="text-center p-6 bg-muted/30 rounded-2xl">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">24/7 Emergency Response</h3>
                  <p className="text-sm text-muted-foreground">
                    Rapid response to {area.name} emergencies around the clock
                  </p>
                </div>
                <div className="text-center p-6 bg-muted/30 rounded-2xl">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Licensed & Insured</h3>
                  <p className="text-sm text-muted-foreground">
                    Fully licensed contractors serving {area.name}
                  </p>
                </div>
                <div className="text-center p-6 bg-muted/30 rounded-2xl">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">10+ Years Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Trusted remediation professionals in the Bay Area
                  </p>
                </div>
                <div className="text-center p-6 bg-muted/30 rounded-2xl">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Commercial Focus</h3>
                  <p className="text-sm text-muted-foreground">
                    Specialized in commercial & multifamily properties
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      {area.testimonial && (
        <section className="py-20 bg-muted/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block text-primary font-medium mb-2">Customer Review</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                What {area.name} Customers Say
              </h2>
            </div>

            <Card className="bg-background">
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="flex justify-center mb-6">
                  {[...Array(area.testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-xl sm:text-2xl italic text-foreground mb-6 leading-relaxed">
                  "{area.testimonial.text}"
                </blockquote>
                <div className="font-semibold text-lg text-foreground">{area.testimonial.name}</div>
                <div className="text-muted-foreground">{area.testimonial.project}</div>
                <div className="text-sm text-primary mt-2">{area.name}</div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* FAQ Section - Enhanced Accordion */}
      {area.faqs && area.faqs.length > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-primary font-medium mb-2">Common Questions</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                Frequently Asked Questions - {area.name}
              </h2>
              <p className="text-lg text-muted-foreground">
                Get answers about our remediation services in {area.name}
              </p>
            </div>

            <div className="space-y-4">
              {area.faqs.map((faq, index) => (
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

      {/* CTA Section - Enhanced */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/30 rounded-full -translate-y-1/2 -translate-x-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/20 rounded-full translate-y-1/2 translate-x-1/2" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Serving {area.name} & Surrounding Areas</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            Ready to Start Your {area.name} Project?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Contact us today for a free consultation and assessment. Our team is ready to help restore your commercial property.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a href={`tel:${business.phoneRaw}`}>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8">
                <Phone className="w-5 h-5 mr-2" />
                Call {business.phone}
              </Button>
            </a>
            <Link to="/contact">
              <Button variant="white-outline" size="lg" className="w-full sm:w-auto text-lg px-8">
                <Mail className="w-5 h-5 mr-2" />
                Email Us
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 border-t border-white/20">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <span className="text-white/90">Licensed & Insured</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              <span className="text-white/90">24/7 Emergency</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <span className="text-white/90">Local {area.name} Team</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AreaPage;
