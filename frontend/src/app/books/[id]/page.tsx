import Image from 'next/image';
import Link from 'next/link';
// import { getBook, getImageUrl } from '@/lib/directus';
import { notFound } from 'next/navigation';

interface BookPageProps {
  params: {
    id: string;
  };
}

export const revalidate = 3600; // Revalidate this page every hour

export default async function BookPage({ params }: BookPageProps) {
  const { id } = params;
  
  // For demonstration purposes, we'll use placeholder data
  // In a real implementation, use:
  // const book = await getBook(id);
  // if (!book) return notFound();
  
  // Placeholder book data
  const book = {
    id: '1',
    title: 'The Brooklyn Rail - A Tribute to Richard Serra',
    author_first_name: 'Various',
    author_last_name: 'Artists & Writers',
    publisher: 'Brooklyn, NY: The Brooklyn Rail',
    publication_date: '2023-01-01',
    dimensions: '28 cm',
    physical_description: '1 volume (various pagings): illustrations',
    edition: 'First Edition',
    isbn: 'N6537.S47 B76 2023',
    contributors: 'Phong H. Bui, L. S. Asekoff, Michael Auping, Agnes Gund, Joan Jonas, Maya Lin, Glenn Lowry, Meredith Monk, Bruce Nauman, Yvonne Rainer, Steve Reich, Richard Shiff, Haim Steinbach, Sarah Sze, Jeffrey Weiss, Rachel Whiteread, and many others',
    summary: 'A special issue from The Brooklyn Rail dedicated to the life and work of renowned sculptor Richard Serra. This volume includes critical essays, reflections, poetry, and visual tributes from fellow artists, curators, and writers who have been influenced by or worked closely with Serra throughout his transformative career. The publication offers a comprehensive overview of Serra\'s impact on contemporary art, architecture, and spatial theory.',
    subjects: ['Serra, Richard', 'Sculpture', 'Contemporary Art', 'Artists', 'Tributes'],
    location: 'Hudson Street Library, NYC',
    price: 45.00,
    cover_image: '',
    date_added: '2023-04-18',
    collections: [
      { 
        id: '2', 
        collection_name: 'Art Books Collection',
        slug: 'art-books-collection' 
      }
    ]
  };
  
  const formattedDate = new Date(book.publication_date).getFullYear();
  const dateAdded = new Date(book.date_added).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      {/* Back Link */}
      <div className="mb-8">
        <Link 
          href={book.collections?.length 
            ? `/collections/${(book.collections[0] as any).slug}`
            : '/collections'
          } 
          className="text-sm text-teal-700 hover:text-teal-900 transition-colors"
        >
          <i className="fas fa-arrow-left mr-1"></i> Back to {book.collections?.length 
            ? (book.collections[0] as any).collection_name
            : 'Collections'
          }
        </Link>
      </div>

      {/* Main Book Info Grid */}
      <article className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {/* Left Column: Cover Image */}
        <div className="md:col-span-1">
          <div className="sticky top-28">
            <div className="aspect-[3/4] bg-gray-200 rounded-md shadow-lg overflow-hidden">
              {book.cover_image ? (
                <Image
                  src={`/placeholder-book.jpg`} // In real app: getImageUrl(book.cover_image)
                  alt={`Cover of ${book.title}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4 text-center bg-gray-200">
                  <span className="text-gray-500">{book.title}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold title-font mb-2 text-gray-900">
            {book.title}
          </h1>
          
          {/* Author */}
          <p className="text-lg text-gray-800 mb-6">
            By <span className="font-medium">{book.author_first_name} {book.author_last_name}</span>
          </p>

          {/* Core Details Section */}
          <div className="border-t border-gray-200 pt-6 space-y-3 text-base">
            <p><span className="font-medium text-gray-700 w-32 inline-block">Publisher:</span> {book.publisher}</p>
            <p><span className="font-medium text-gray-700 w-32 inline-block">Published:</span> {formattedDate}</p>
            <p><span className="font-medium text-gray-700 w-32 inline-block">Description:</span> {book.physical_description}</p>
            <p><span className="font-medium text-gray-700 w-32 inline-block">Dimensions:</span> {book.dimensions}</p>
            <p><span className="font-medium text-gray-700 w-32 inline-block">ISBN:</span> {book.isbn}</p>
            
            {/* Optional Fields */}
            {book.edition && (
              <p><span className="font-medium text-gray-700 w-32 inline-block">Edition:</span> {book.edition}</p>
            )}
            
            {book.contributors && (
              <p><span className="font-medium text-gray-700 w-32 inline-block">Contributors:</span> {book.contributors}</p>
            )}
            
            <p><span className="font-medium text-gray-700 w-32 inline-block">Added:</span> {dateAdded}</p>
          </div>

          {/* Summary Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-2xl font-semibold title-font mb-3">Summary</h3>
            <div className="prose max-w-none text-gray-700 leading-relaxed">
              <p>{book.summary}</p>
            </div>
          </div>

          {/* Subjects */}
          {book.subjects && book.subjects.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-2xl font-semibold title-font mb-3">Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {book.subjects.map((subject) => (
                  <span 
                    key={subject} 
                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Collections */}
          {book.collections && book.collections.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-2xl font-semibold title-font mb-3">Part of Collections</h3>
              <div className="flex flex-wrap gap-3">
                {book.collections.map((collection: any) => (
                  <Link 
                    key={collection.id}
                    href={`/collections/${collection.slug}`}
                    className="px-4 py-2 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded transition-colors"
                  >
                    {collection.collection_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}