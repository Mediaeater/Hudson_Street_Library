import { getImageUrl } from './directus';

/**
 * Size constants for responsive images
 */
export const imageSizes = {
  thumbnail: { width: 300, height: 400 },
  small: { width: 600, height: 800 },
  medium: { width: 900, height: 1200 },
  large: { width: 1200, height: 1600 },
  hero: { width: 1800, height: 900 },
};

/**
 * Format for sizes attribute in responsive images
 */
export const sizesConfig = {
  thumbnail: '(max-width: 640px) 150px, (max-width: 1024px) 200px, 300px',
  card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  hero: '100vw',
};

/**
 * Generate srcSet for responsive images
 */
export function generateSrcSet(imageId: string, sizes: { width: number; height?: number }[] = []) {
  if (!imageId) return '';
  
  const defaultSizes = [
    { width: 400 },
    { width: 800 },
    { width: 1200 },
    { width: 1600 },
    { width: 2000 },
  ];
  
  const sizesToUse = sizes.length > 0 ? sizes : defaultSizes;
  
  return sizesToUse
    .map(size => {
      const url = getImageUrl(imageId, { 
        width: size.width,
        height: size.height,
        fit: 'cover',
      });
      return `${url} ${size.width}w`;
    })
    .join(', ');
}

/**
 * Generate blur placeholder URL for an image
 */
export function getBlurPlaceholder(imageId: string) {
  if (!imageId) return '';
  return getImageUrl(imageId, { 
    width: 20, 
    quality: 30,
    blur: 5
  });
}

/**
 * Get dominant color from an image (placeholder implementation)
 * In a real app, this would use a color extraction library or API
 */
export function getDominantColor(category: string) {
  const colors: Record<string, string> = {
    photography: '#dbeafe', // blue-100
    art: '#fee2e2',         // red-100
    fashion: '#e5e7eb',     // gray-200
    queer: '#ede9fe',       // purple-100
    music: '#dcfce7',       // green-100
    design: '#fef3c7',      // amber-100
    ephemera: '#e0f2fe',    // light-blue-100
    default: '#f9fafb',     // gray-50
  };
  
  return colors[category] || colors.default;
}

/**
 * Generate a category background class
 */
export function getCategoryBgClass(category: string) {
  return `${category}-bg`;
}

/**
 * Create image props for Next.js Image component
 */
export function getImageProps(imageId: string, alt: string, options: {
  placeholder?: boolean;
  sizes?: string;
  priority?: boolean;
  width?: number;
  height?: number;
} = {}) {
  if (!imageId) {
    return {
      src: '/placeholder-image.jpg',
      alt,
      width: options.width || 800,
      height: options.height || 600,
    };
  }
  
  const props: any = {
    src: getImageUrl(imageId, { width: options.width, height: options.height }),
    alt,
    sizes: options.sizes || sizesConfig.card,
  };
  
  if (options.priority) {
    props.priority = true;
  }
  
  if (options.placeholder) {
    props.placeholder = 'blur';
    props.blurDataURL = getBlurPlaceholder(imageId);
  }
  
  return props;
}