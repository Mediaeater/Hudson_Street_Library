import { createDirectus, rest, readItems, readItem } from '@directus/sdk';

// Define our collection types
export interface Book {
  id: string;
  status: 'published' | 'draft' | 'archived';
  author_last_name: string;
  author_first_name: string;
  title: string;
  publisher: string;
  publication_date: string;
  dimensions: string;
  physical_description: string;
  edition: string;
  isbn: string;
  contributors: string;
  summary: string;
  subjects: string[];
  location: string;
  price: number;
  cover_image: string;
  additional_images?: string[];
  collections?: string[] | Collection[];
  date_added: string;
  date_updated: string;
}

export interface Collection {
  id: string;
  status: 'published' | 'draft' | 'archived';
  collection_name: string;
  slug: string;
  description: string;
  category: 'photography' | 'fashion' | 'art' | 'design' | 'queer' | 'music' | 'ephemera';
  cover_image: string;
  featured: boolean;
  books?: string[] | Book[];
  sort_order?: number;
  date_created: string;
  date_updated: string;
}

export interface NewAcquisition {
  id: string;
  book: string | Book;
  acquisition_date: string;
  featured: boolean;
  highlight_text?: string;
}

// Define schema for type safety
export interface Schema {
  books: Book[];
  collections: Collection[];
  new_acquisitions: NewAcquisition[];
}

// Create Directus client
const API_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

export const directus = createDirectus<Schema>(API_URL).with(rest());

// Helper functions
export async function getBooks(params: any = {}) {
  try {
    return await directus.request(
      readItems('books', {
        filter: { status: { _eq: 'published' } },
        sort: ['-date_added'],
        ...params,
      })
    );
  } catch (error) {
    console.error('Error fetching books:', error);
    return [];
  }
}

export async function getBook(id: string, params: any = {}) {
  try {
    return await directus.request(
      readItem('books', id, {
        fields: ['*', 'collections.*'],
        ...params,
      })
    );
  } catch (error) {
    console.error(`Error fetching book with ID ${id}:`, error);
    return null;
  }
}

export async function getCollections(params: any = {}) {
  try {
    return await directus.request(
      readItems('collections', {
        filter: { status: { _eq: 'published' } },
        sort: ['sort_order'],
        ...params,
      })
    );
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}

export async function getCollection(slug: string, params: any = {}) {
  try {
    const collections = await directus.request(
      readItems('collections', {
        filter: { 
          slug: { _eq: slug },
          status: { _eq: 'published' }
        },
        fields: ['*', 'books.*'],
        ...params,
      })
    );
    
    return collections[0] || null;
  } catch (error) {
    console.error(`Error fetching collection with slug ${slug}:`, error);
    return null;
  }
}

export async function getNewAcquisitions(params: any = {}) {
  try {
    return await directus.request(
      readItems('new_acquisitions', {
        sort: ['-acquisition_date'],
        fields: ['*', 'book.*'],
        ...params,
      })
    );
  } catch (error) {
    console.error('Error fetching new acquisitions:', error);
    return [];
  }
}

// Helper to get image URL
export function getImageUrl(id: string, options: {
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'inside' | 'outside';
  quality?: number;
} = {}) {
  if (!id) return '';
  
  const params = new URLSearchParams();
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  if (options.fit) params.append('fit', options.fit);
  if (options.quality) params.append('quality', options.quality.toString());
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return `${API_URL}/assets/${id}${queryString}`;
}