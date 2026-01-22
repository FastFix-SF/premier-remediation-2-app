import React from 'react';
import RoofingFriendHeader from '../components/RoofingFriendHeader';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { Button } from '../components/ui/button';
import { Shield, CheckCircle, Phone, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useServices, useFeaturedServices, useBusiness, useServicesPage } from '../hooks/useBusinessConfig';
import * as LucideIcons from 'lucide-react';

// Helper to get icon component from string name
const getIcon = (iconName: string) => {
  const icons = LucideIcons as Record<string, React.ComponentType<{ className?: string }>>;
  return icons[iconName] || LucideIcons.CheckCircle;
};

const Services = () => {
  const allServices = useServices();
  const featuredServices = useFeaturedServices();
  const business = useBusiness();
  const servicesPage = useServicesPage();

  // Use featured services for the main grid, or fall back to first 4
  const displayServices = featuredServices.length > 0 ? featuredServices : allServices.slice(0, 4);

  // Fallback values for services page content
  const pageTitle = servicesPage?.title || 'Our Services';
  const pageSubtitle = servicesPage?.subtitle || `Professional services from ${business.name}.`;
  const whyChooseUs = servicesPage?.whyChooseUs || {
    title: `Why Choose ${business.name}?`,
    subtitle: "We're committed to delivering exceptional results with every project.",
    features: []
  };
  const teamSection = servicesPage?.teamSection || {
    title: 'Professional Team',
    subtitle: 'Our professionals bring decades of experience to every project.',
    features: [],
    image: '',
    imageAlt: 'Professional team'
  };
  const ctaSection = servicesPage?.cta || {
    title: 'Ready to Start Your Project?',
    subtitle: 'Contact us today for a free consultation.'
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${pageTitle} | ${business.name}`}
        description={`${pageSubtitle} ${business.uniqueSellingPoints.join(', ')}.`}
      />
      <RoofingFriendHeader />

      <main className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              {pageTitle}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {pageSubtitle} {business.certifications.join(', ')} and backed by our warranty.
            </p>
          </div>

          {/* Quick Service Links - dynamically generated from all services */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {allServices.slice(0, 4).map((service) => (
              <Link
                key={service.slug}
                to={`/services/${service.slug}`}
                className="p-4 bg-background border border-border/50 rounded-lg hover:border-primary/50 hover:shadow-md transition-all text-center"
              >
                <span className="font-medium text-foreground">{service.name}</span>
              </Link>
            ))}
          </div>

          {/* Services Grid - uses featured services from config */}
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-16">
            {displayServices.map((service) => {
              const ServiceIcon = getIcon(service.icon);
              return (
                <div key={service.id} className="bg-card rounded-xl p-6 sm:p-8 shadow-soft border hover:shadow-card-hover transition-shadow">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                      <ServiceIcon className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">{service.name}</h2>
                  </div>

                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {service.shortDescription}
                  </p>

                  {service.benefits && service.benefits.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {service.benefits.slice(0, 4).map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-sm text-muted-foreground">{benefit.title}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link to={`/services/${service.slug}`}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Learn More
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Why Choose Us */}
          <div className="bg-primary/5 rounded-2xl p-8 sm:p-12 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                {whyChooseUs.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {whyChooseUs.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {whyChooseUs.features.length > 0 ? (
                whyChooseUs.features.map((feature, index) => {
                  const FeatureIcon = getIcon(feature.icon);
                  return (
                    <div key={index} className="text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FeatureIcon className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Quality Guaranteed</h3>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive warranty covering materials and workmanship.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Licensed & Insured</h3>
                    <p className="text-sm text-muted-foreground">
                      Fully licensed contractors with comprehensive insurance.
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Fast Response</h3>
                    <p className="text-sm text-muted-foreground">
                      Quick quotes and fast project turnaround.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Professional Team Showcase */}
          {(teamSection.features.length > 0 || teamSection.image) && (
            <div className="bg-primary/5 rounded-2xl p-8 sm:p-12 mb-16">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                    {teamSection.title}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    {teamSection.subtitle}
                  </p>
                  {teamSection.features.length > 0 && (
                    <div className="space-y-3">
                      {teamSection.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {teamSection.image && (
                  <div className="relative">
                    <img
                      src={teamSection.image}
                      alt={teamSection.imageAlt}
                      className="rounded-xl shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              {ctaSection.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              {ctaSection.subtitle}
            </p>
            <a href={`tel:${business.phoneRaw}`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-lg">
                <Phone className="w-5 h-5 mr-2" />
                {business.hero?.ctaPrimary || 'Get Free Consultation'}
              </Button>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Services;
