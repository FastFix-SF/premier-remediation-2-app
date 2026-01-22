import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import RoofingFriendHeader from '../components/RoofingFriendHeader';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { ServiceStructuredData, FAQStructuredData } from '../components/StructuredData';
import { Button } from '../components/ui/button';
import {
  Phone, Star, ChevronDown, ChevronUp, MapPin, ArrowRight,
  CheckCircle, Clock, Shield, Award, Users, FileText, Building2
} from 'lucide-react';
import { useServiceBySlug, useServices, useAreas, useBusiness, useRatings } from '../hooks/useBusinessConfig';
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

const ServicePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const service = useServiceBySlug(slug || '');
  const allServices = useServices();
  const areas = useAreas();
  const business = useBusiness();
  const ratings = useRatings();
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  // If service not found, redirect to services page
  if (!service) {
    return <Navigate to="/services" replace />;
  }

  const ServiceIcon = getIcon(service.icon);

  // Get other services for cross-linking
  const otherServices = allServices.filter(s => s.slug !== service.slug).slice(0, 4);

  // Use longDescription if available, fallback to shortDescription
  const description = service.longDescription || service.shortDescription || service.description || '';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={service.seoTitle || `${service.name} | ${business.name}`}
        description={service.seoDescription || description}
        keywords={service.seoKeywords?.join(', ')}
      />
      <ServiceStructuredData
        serviceName={service.name}
        location="San Francisco Bay Area"
      />
      {service.faqs && service.faqs.length > 0 && (
        <FAQStructuredData faqs={service.faqs} />
      )}

      <RoofingFriendHeader />

      {/* Hero Section - Enhanced with gradient overlay and icon */}
      <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-white py-20 lg:py-28 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Service Icon Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <ServiceIcon className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-white/90">Professional Service</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
                {service.heroTitle || service.name}
                {service.heroHighlight && (
                  <span className="block text-accent mt-2">{service.heroHighlight}</span>
                )}
              </h1>

              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                {description}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a href={`tel:${business.phoneRaw}`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    <Phone className="w-5 h-5 mr-2" />
                    {business.hero?.ctaPrimary || 'Get Free Assessment'}
                  </Button>
                </a>
                <Link to="/contact">
                  <Button variant="white-outline" size="lg" className="w-full sm:w-auto">
                    {business.hero?.ctaSecondary || 'Request Consultation'}
                  </Button>
                </Link>
              </div>

              {/* Trust indicators row */}
              <div className="flex flex-wrap gap-6 pt-6 border-t border-white/20">
                {ratings && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <span className="text-white/90 text-sm">
                      {ratings.average}/5 ({ratings.count}+ reviews)
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

            {/* Hero Image or Placeholder */}
            <div className="relative hidden lg:block">
              {service.heroImage || service.image ? (
                <img
                  src={service.heroImage || service.image}
                  alt={`${service.name} in the Bay Area`}
                  className="rounded-2xl shadow-2xl w-full object-cover"
                />
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                  <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ServiceIcon className="w-16 h-16 text-white" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">{service.name}</h3>
                    <p className="text-white/80">{service.shortDescription}</p>
                  </div>
                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">500+</div>
                      <div className="text-sm text-white/70">Projects</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold">10+</div>
                      <div className="text-sm text-white/70">Years Exp.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* AEO Summary Section - For AI/Voice Search */}
      {service.aeoSummary && (
        <section className="py-12 bg-muted/10 border-b border-border/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">Quick Summary</h2>
                  <p className="text-muted-foreground leading-relaxed">{service.aeoSummary}</p>
                  {service.aeoKeyPoints && service.aeoKeyPoints.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {service.aeoKeyPoints.map((point, index) => (
                        <span key={index} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-sm px-3 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          {point}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section - Enhanced Grid */}
      {service.benefits && service.benefits.length > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-primary font-medium mb-2">Our Advantages</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                Why Choose Our {service.name}?
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {business.name} offers unmatched benefits for Bay Area commercial and multifamily property owners.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {service.benefits.map((benefit, index) => {
                const BenefitIcon = getIcon(benefit.icon);
                return (
                  <div
                    key={index}
                    className="group relative p-6 bg-background rounded-2xl shadow-sm border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                      <BenefitIcon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{benefit.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Process Steps Section */}
      {service.process && service.process.length > 0 && (
        <section className="py-20 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-primary font-medium mb-2">Our Process</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                How We Handle {service.name}
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Our structured approach ensures efficient, thorough remediation with minimal disruption.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {service.process.map((step, index) => (
                <div key={index} className="relative">
                  {/* Connector line */}
                  {index < service.process.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-primary/20" />
                  )}

                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Service Areas Section - Enhanced with better cards */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block text-primary font-medium mb-2">Service Coverage</span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
              Serving Bay Area Communities
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Professional {service.name.toLowerCase()} services across the San Francisco Bay Area.
              We serve commercial and multifamily properties in these locations.
            </p>
          </div>

          {areas.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {areas.slice(0, 12).map((area) => (
                <Link
                  key={area.slug}
                  to={`/service-areas/${area.slug}`}
                  className="group flex items-center gap-3 p-4 bg-background border border-border/50 rounded-xl hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">{area.name}</span>
                    <span className="block text-xs text-muted-foreground">View services</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-muted/30 rounded-xl">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                We serve the entire San Francisco Bay Area including SF, Oakland, Berkeley, San Jose, and surrounding counties.
              </p>
              <Link to="/contact" className="inline-flex items-center gap-2 text-primary font-medium mt-4 hover:underline">
                Contact us for service availability
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section - Enhanced Accordion */}
      {service.faqs && service.faqs.length > 0 && (
        <section className="py-20 bg-muted/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="inline-block text-primary font-medium mb-2">Common Questions</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Get answers to common questions about {service.name.toLowerCase()}
              </p>
            </div>

            <div className="space-y-4">
              {service.faqs.map((faq, index) => (
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

      {/* Other Services Cross-Links */}
      {otherServices.length > 0 && (
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block text-primary font-medium mb-2">Explore More</span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
                Our Other Services
              </h2>
              <p className="text-lg text-muted-foreground">
                Comprehensive remediation solutions for all your property needs
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {otherServices.map((otherService) => {
                const OtherIcon = getIcon(otherService.icon);
                return (
                  <Link
                    key={otherService.slug}
                    to={`/services/${otherService.slug}`}
                    className="group p-6 bg-background border border-border/50 rounded-xl hover:border-primary/50 hover:shadow-lg transition-all"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <OtherIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {otherService.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {otherService.shortDescription}
                    </p>
                    <span className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>
                );
              })}
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
            <Phone className="w-4 h-4" />
            <span className="text-sm font-medium">Available 24/7 for Emergencies</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join hundreds of satisfied Bay Area property managers. Get your free assessment today
            and discover why {business.name} is the trusted choice for commercial remediation.
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
                Request Quote Online
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
              <Award className="w-5 h-5 text-accent" />
              <span className="text-white/90">10+ Years Experience</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <span className="text-white/90">500+ Properties Served</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ServicePage;
