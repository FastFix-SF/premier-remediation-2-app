
import React from 'react';
import { Shield, Truck, Award, Star, Clock, CheckCircle, Phone, MapPin, Users, Zap, Heart, ThumbsUp } from 'lucide-react';
import { useTrustIndicators } from '@/hooks/useBusinessConfig';

// Map icon names from JSON to actual Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  Truck,
  Award,
  Star,
  Clock,
  CheckCircle,
  Phone,
  MapPin,
  Users,
  Zap,
  Heart,
  ThumbsUp,
};

const HeroTrustIndicators = () => {
  const trustIndicators = useTrustIndicators();

  // Fallback indicators if none configured
  const defaultIndicators = [
    { icon: 'Shield', text: 'Licensed & Insured' },
    { icon: 'Award', text: 'Quality Guaranteed' },
    { icon: 'Clock', text: 'Fast Response' }
  ];

  const indicators = trustIndicators.length > 0 ? trustIndicators : defaultIndicators;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pt-6 sm:pt-8 border-t border-white/20">
      {indicators.map((indicator, index) => {
        const IconComponent = iconMap[indicator.icon] || Shield;
        return (
          <div key={index} className="flex items-center justify-center lg:justify-start gap-2 text-white/90">
            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="font-medium text-sm sm:text-base">{indicator.text}</span>
          </div>
        );
      })}
    </div>
  );
};

export default HeroTrustIndicators;
