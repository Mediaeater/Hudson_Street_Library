import Image from 'next/image';
import Link from 'next/link';
// import { getCollection, getImageUrl } from '@/lib/directus';
import { notFound } from 'next/navigation';

interface CollectionPageProps {
  params: {
    slug: string;
  };
}

export const revalidate = 3600; // Revalidate this page every hour

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = params;
  
  // For demonstration purposes, we'll use placeholder data
  // In a real implementation, use:
  // const collection = await getCollection(slug);
  // if (!collection) return notFound();
  
  // Placeholder collection data
  const collections = [
    {
      id: '1',
      collection_name: 'NYC Photobooks',
      slug: 'nyc-photobooks',
      description: 'Explore the dynamic energy, diverse communities, and iconic landscapes of New York City as captured in classic and contemporary photobooks.',
      category: 'photography',
      cover_image: '',
      books: [
        { id: '101', title: 'New York', author_first_name: 'William', author_last_name: 'Klein', cover_image: '', publication_date: '1956-01-01' },
        { id: '102', title: 'East 100th Street', author_first_name: 'Bruce', author_last_name: 'Davidson', cover_image: '', publication_date: '1970-01-01' },
        { id: '103', title: 'Subway', author_first_name: 'Bruce', author_last_name: 'Davidson', cover_image: '', publication_date: '1986-01-01' },
        { id: '104', title: 'The Americans', author_first_name: 'Robert', author_last_name: 'Frank', cover_image: '', publication_date: '1958-01-01' },
        { id: '105', title: 'Invisible City', author_first_name: 'Ken', author_last_name: 'Schles', cover_image: '', publication_date: '1988-01-01' }
      ]
    },
    {
      id: '2',
      collection_name: 'Art Books Collection',
      slug: 'art-books-collection',
      description: 'Delve into our collection of monographs, exhibition catalogues, and unique artist-made books exploring diverse artistic practices and concepts.',
      category: 'art',
      cover_image: '',
      books: [
        { id: '1', title: 'The Brooklyn Rail - A Tribute to Richard Serra', author_first_name: 'Various', author_last_name: 'Artists & Writers', cover_image: '', publication_date: '2023-01-01' },
        { id: '201', title: 'Gerhard Richter: Panorama', author_first_name: 'Mark', author_last_name: 'Godfrey', cover_image: '', publication_date: '2016-01-01' },
        { id: '202', title: 'Jenny Holzer: Truisms', author_first_name: 'Jenny', author_last_name: 'Holzer', cover_image: '', publication_date: '1984-01-01' },
        { id: '203', title: 'Cy Twombly: Fifty Years of Works on Paper', author_first_name: 'Julie', author_last_name: 'Sylvester', cover_image: '', publication_date: '2004-01-01' }
      ]
    }
  ];
  
  // Find the matching collection by slug
  const collection = collections.find(c => c.slug === slug);
  if (!collection) return notFound();
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
      {/* Back Link */}
      <div className="mb-8">
        <Link href="/collections" className="text-sm text-teal-700 hover:text-teal-900 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to All Collections
        </Link>
      </div>

      {/* Collection Header */}
      <div className="max-w-3xl mx-auto text-center mb-12 md:mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">{collection.collection_name}</h1>
        <div className="relative pb-10 mb-6">
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-px bg-teal-700"></div>
        </div>
        <p className="text-base sm:text-lg text-gray-600 leading-relaxed mt-4">
          {collection.description}
        </p>
      </div>

      {/* Featured Image or Hero */}
      {collection.cover_image ? (
        <section className="mb-12 md:mb-16 lg:mb-20">
          <div className="relative hero-image-container aspect-[16/9] sm:aspect-[2/1] lg:aspect-[2.5/1] bg-gray-300 rounded-lg overflow-hidden">
            <Image
              src={`/placeholder-${collection.category}.jpg`} // In real app: getImageUrl(collection.cover_image)
              alt={`Featured image from the ${collection.collection_name} collection`}
              fill
              className="object-cover"
            />
          </div>
        </section>
      ) : (
        <section className="mb-12 md:mb-16 lg:mb-20">
          <div className="relative hero-image-container aspect-[16/9] sm:aspect-[2/1] lg:aspect-[2.5/1] bg-gray-300 rounded-lg overflow-hidden">
            <div className={`absolute inset-0 flex items-center justify-center p-4 text-center ${collection.category}-bg`}>
              <span className="text-2xl font-medium">{collection.collection_name}</span>
            </div>
          </div>
        </section>
      )}

      {/* Books Grid */}
      {collection.books && collection.books.length > 0 ? (
        <div id="item-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
          {collection.books.map((book: any) => (
            <article key={book.id} className="group bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
              <Link href={`/books/${book.id}`} className="block">
                <div className="relative overflow-hidden aspect-[3/4] bg-gray-200">
                  {book.cover_image ? (
                    <Image
                      src={`/placeholder-book.jpg`} // In real app: getImageUrl(book.cover_image)
                      alt={`${book.title} by ${book.author_first_name} ${book.author_last_name}`}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4 text-center bg-gray-200">
                      <span className="text-gray-500 text-sm">{book.title}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="text-base font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 truncate">{book.author_first_name} {book.author_last_name}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(book.publication_date).getFullYear()}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p id="no-items-message" className="text-center text-gray-500 py-12">No items currently displayed in this collection.</p>
      )}
    </div>
  );
}