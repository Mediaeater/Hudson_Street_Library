'use client';

import React from 'react';
import NextImage from 'next/image';
import { getImageProps, getCategoryBgClass } from '@/lib/image-helpers';

interface OptimizedImageProps {
  // Source can be either a Directus asset ID or a local path
  src?: string;
  // Fallback category used for placeholder background when no image is available
  category?: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  // Image fit style
  objectFit?: 'cover' | 'contain' | 'fill';
  // Generate blur placeholder
  placeholder?: boolean;
  // Load image with priority (for above-the-fold images)
  priority?: boolean;
  // Sizes attribute for responsive images
  sizes?: string;
  // Optional class name
  className?: string;
  // Optional text to display as a placeholder when no image is available
  placeholderText?: string;
  // Optional animation on hover
  hoverEffect?: boolean;
}

export function OptimizedImage({
  src,
  category = 'default',
  alt,
  width,
  height,
  fill = false,
  objectFit = 'cover',
  placeholder = false,
  priority = false,
  sizes,
  className = '',
  placeholderText,
  hoverEffect = false,
}: OptimizedImageProps) {
  // If it's a remote Directus asset ID
  const isDirectusAsset = src && !src.startsWith('/');
  
  // If there's no src or it's an external path, render directly
  if (!src || !isDirectusAsset) {
    // If fill is true, create a wrapper with relative positioning
    if (fill) {
      return (
        <div className={`relative w-full h-full ${className}`}>
          {src ? (
            <NextImage
              src={src}
              alt={alt}
              fill={true}
              sizes={sizes}
              priority={priority}
              className={`object-${objectFit} ${hoverEffect ? 'transition-transform duration-500 group-hover:scale-105' : ''}`}
            />
          ) : (
            <div className={`absolute inset-0 flex items-center justify-center ${getCategoryBgClass(category)}`}>
              <span className="text-center px-4 text-sm sm:text-base font-medium">{placeholderText || alt}</span>
            </div>
          )}
        </div>
      );
    }
    
    // If width and height are specified, render with fixed dimensions
    return src ? (
      <NextImage
        src={src}
        alt={alt}
        width={width || 800}
        height={height || 600}
        sizes={sizes}
        priority={priority}
        className={className}
      />
    ) : (
      <div 
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '300px' }}
      >
        <span className="text-center px-4 text-sm sm:text-base text-gray-500">{placeholderText || alt}</span>
      </div>
    );
  }
  
  // For Directus assets, use our helper function
  const imageProps = getImageProps(src, alt, {
    placeholder,
    sizes,
    priority,
    width,
    height,
  });
  
  // If fill is true, create a wrapper with relative positioning
  if (fill) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        <NextImage
          {...imageProps}
          fill={true}
          className={`object-${objectFit} ${hoverEffect ? 'transition-transform duration-500 group-hover:scale-105' : ''}`}
        />
      </div>
    );
  }
  
  // Otherwise render with the provided dimensions
  return (
    <NextImage
      {...imageProps}
      width={width || 800}
      height={height || 600}
      className={className}
    />
  );
}