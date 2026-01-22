
import React, { useState } from 'react';
import { Star } from 'lucide-react';
import ReviewsModal from '../ReviewsModal';
import { useRatings } from '@/hooks/useBusinessConfig';

const HeroReviewsPreview = () => {
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const ratings = useRatings();

  // Fallback values if not configured
  const average = ratings?.average || '5.0';
  const count = ratings?.count || '100';
  const platform = ratings?.platform || 'customers';

  return (
    <>
      <div
        className="flex items-center justify-center lg:justify-start gap-4 pt-4 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setShowReviewsModal(true)}
      >
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-accent text-accent" />
          ))}
        </div>
        <div className="text-white/90 text-sm sm:text-base">
          <span className="font-semibold">{average}/5</span> from {count}+ {platform}
        </div>
      </div>

      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
      />
    </>
  );
};

export default HeroReviewsPreview;
