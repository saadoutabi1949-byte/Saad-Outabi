import React, { useState } from 'react';
import { Footprints, Shirt } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  category?: 'Sneakers' | 'Apparel';
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  category = 'Sneakers',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F2F1ED] via-[#E8E6E0] to-[#DCD9D0] text-[#4A4945] p-6 text-center select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        {category === 'Sneakers' ? (
          <Footprints className="w-8 h-8 mb-2 stroke-[1.25] text-[#121212]/70" />
        ) : (
          <Shirt className="w-8 h-8 mb-2 stroke-[1.25] text-[#121212]/70" />
        )}
        <span className="text-xs font-medium tracking-tight text-[#121212]/80 max-w-[20ch] truncate">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
};
