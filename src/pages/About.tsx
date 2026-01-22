
import React from 'react';
import RoofingFriendHeader from '../components/RoofingFriendHeader';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import { Shield, Award, Users, Clock, Phone, Mail } from 'lucide-react';
import { companyConfig } from '@/config/company';
import { useBusiness } from '@/hooks/useBusinessConfig';

const About = () => {
  const business = useBusiness();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`About ${business.name} - Professional Services`}
        description={`Learn about ${business.name}. ${business.description?.substring(0, 150)}...`}
      />
      <RoofingFriendHeader />
      
      <main className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-4">
              About {business.name}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
              {business.description}
            </p>
          </div>

          {/* Company Story */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  {business.description}
                </p>
                <p>
                  Our team combines years of experience with industry best practices to deliver
                  exceptional results that exceed expectations. We take pride in every project
                  we complete.
                </p>
                <p>
                  What sets us apart is our commitment to quality, transparency, and customer
                  satisfaction. Every project, regardless of size, receives our full attention
                  and expertise.
                </p>
              </div>
            </div>
            <div className="bg-muted rounded-xl p-4 h-full flex items-center justify-center">
              <img
                src={business.logo || "/lovable-uploads/a9586668-8940-4ab8-a5d6-8b0f0911ccaf.png"}
                alt={`${business.name} Team`}
                className="w-full h-full max-h-96 rounded-lg object-cover"
              />
            </div>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Licensed & Insured</h3>
              <p className="text-sm text-muted-foreground">
                Fully licensed and insured for your peace of mind and protection.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Quality Guaranteed</h3>
              <p className="text-sm text-muted-foreground">
                {companyConfig.warranty.description}.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Expert Team</h3>
              <p className="text-sm text-muted-foreground">
                Experienced professionals dedicated to delivering exceptional results.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Same Day Quotes</h3>
              <p className="text-sm text-muted-foreground">
                Fast, accurate estimates to get your project started quickly.
              </p>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="bg-primary/5 rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to Work With Us?
            </h2>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Contact us today for a free consultation and discover why clients trust {business.name}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`tel:${business.phoneRaw}`}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                <Phone className="w-5 h-5" />
                {business.phone}
              </a>
              <a
                href={`mailto:${business.email}`}
                className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary/10 transition-colors"
              >
                <Mail className="w-5 h-5" />
                {business.email}
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
