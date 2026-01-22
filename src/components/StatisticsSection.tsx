
import React from 'react';
import { Shield, Users, MapPin, Clock, Award, Wrench, Star, CheckCircle, Phone, Zap, Heart, ThumbsUp } from 'lucide-react';
import { useStatistics, useBusiness } from '@/hooks/useBusinessConfig';

// Map icon names from JSON to actual Lucide components
const iconMap: Record<string, React.ElementType> = {
  Shield,
  Users,
  MapPin,
  Clock,
  Award,
  Wrench,
  Star,
  CheckCircle,
  Phone,
  Zap,
  Heart,
  ThumbsUp,
};

// Default statistics as fallback
const defaultStatistics = [
  { icon: 'Users', number: '500+', label: 'Projects Completed', description: 'Successful projects delivered' },
  { icon: 'MapPin', number: '10+', label: 'Service Areas', description: 'Locations we serve' },
  { icon: 'Shield', number: '25', label: 'Year Warranty', description: 'Comprehensive coverage' },
  { icon: 'Clock', number: '24/7', label: 'Support Available', description: 'Round-the-clock assistance' },
  { icon: 'Award', number: '15+', label: 'Years Experience', description: 'Industry expertise' },
  { icon: 'Wrench', number: '100%', label: 'Licensed & Insured', description: 'Fully certified' }
];

const StatisticsSection = () => {
  const configStatistics = useStatistics();
  const business = useBusiness();

  // Use config statistics if available, otherwise fallback
  const statistics = configStatistics.length > 0 ? configStatistics : defaultStatistics;

  return (
    <section className="py-12 lg:py-16 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Why Choose {business.name}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Trusted by hundreds of customers for quality service and exceptional results.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 lg:gap-8">
          {statistics.map((stat, index) => {
            const IconComponent = iconMap[stat.icon] || Shield;
            return (
              <div
                key={index}
                className="group text-center p-6 bg-background rounded-xl shadow-sm hover:shadow-md transition-shadow hover:shadow-card-hover hover-scale active:scale-[0.98] animate-fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 ring-1 ring-primary/20 transition-transform group-hover:scale-110 group-hover:-rotate-3 group-active:scale-95">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="font-semibold text-foreground mb-1 text-sm lg:text-base">
                  {stat.label}
                </div>
                <div className="text-xs lg:text-sm text-muted-foreground leading-tight">
                  {stat.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatisticsSection;
