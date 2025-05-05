import Image from 'next/image';
import Link from 'next/link';
// import { getCollections, getImageUrl } from '@/lib/directus';

export const revalidate = 3600; // Revalidate this page every hour

export default async function CollectionsPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // In a real implementation, use search params for filtering
  // const categoryFilter = searchParams.category as string || 'all';
  // const collections = await getCollections({
  //   filter: categoryFilter !== 'all' ? { category: { _eq: categoryFilter } } : undefined,
  // });
  
  // Placeholder collections data
  const collections = [
    {
      id: '1',
      collection_name: 'NYC Photobooks',
      slug: 'nyc-photobooks',
      description: 'Explore the dynamic energy, diverse communities, and iconic landscapes of New York City as captured in classic and contemporary photobooks.',
      category: 'photography',
      cover_image: ''
    },
    {
      id: '2',
      collection_name: 'Art Books Collection',
      slug: 'art-books-collection',
      description: 'Delve into our collection of monographs, exhibition catalogues, and unique artist-made books exploring diverse artistic practices and concepts.',
      category: 'art',
      cover_image: ''
    },
    {
      id: '3',
      collection_name: 'Fashion Photobooks',
      slug: 'fashion-photobooks',
      description: 'A curated selection of fashion photography books showcasing the evolution of style, design, and visual representation in the fashion industry.',
      category: 'fashion',
      cover_image: ''
    },
    {
      id: '4',
      collection_name: 'Queer Studies Collection',
      slug: 'queer-studies-collection',
      description: 'LGBTQ+ perspectives in photography featuring works that explore gender, sexuality, identity, and community through visual narratives.',
      category: 'queer',
      cover_image: ''
    },
    {
      id: '5',
      collection_name: 'Music Photobooks',
      slug: 'music-photobooks',
      description: 'Visual documentation of music culture, performances, and musicians across various genres and time periods.',
      category: 'music',
      cover_image: ''
    },
    {
      id: '6',
      collection_name: 'Posters and Paper',
      slug: 'posters-and-paper',
      description: 'Printed matter and graphic design including exhibition posters, broadsides, and limited edition prints.',
      category: 'design',
      cover_image: ''
    },
    {
      id: '7',
      collection_name: 'Ephemera',
      slug: 'ephemera',
      description: 'Transient documents of everyday life including zines, flyers, postcards, and other printed materials.',
      category: 'ephemera',
      cover_image: ''
    },
    {
      id: '8',
      collection_name: 'Black Photographers',
      slug: 'black-photographers',
      description: 'Works by African American artists that document Black experiences, culture, and perspectives through photography.',
      category: 'photography',
      cover_image: ''
    }
  ];
  
  // Get the category filter from the URL or use 'all' as default
  const categoryFilter = searchParams.category as string || 'all';
  
  // Filter collections based on category
  const filteredCollections = categoryFilter === 'all'
    ? collections
    : collections.filter(collection => collection.category === categoryFilter);
  
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 max-w-7xl">
      {/* Header Section */}
      <div className="text-center mb-16 md:mb-20">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">Curated Collections</h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
          Explore our thematic archives of visual culture, highlighting specific areas within the library's holdings.
        </p>
      </div>

      {/* Filter Controls */}
      <div id="collection-controls" className="mb-12 md:mb-16 p-4 sm:p-6 bg-white rounded-lg shadow-sm flex flex-wrap gap-4 sm:gap-6 items-center justify-center border border-gray-200">
        {/* Category Filter */}
        <div className="relative">
          <form className="contents">
            <label htmlFor="filter-category" className="sr-only">Filter by Category</label>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <select 
              id="filter-category" 
              name="category"
              defaultValue={categoryFilter}
              onChange={(e) => {
                const url = new URL(window.location.href);
                url.searchParams.set('category', e.target.value);
                window.location.href = url.toString();
              }}
              className="pl-10 pr-8 py-2 rounded-md border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 appearance-none bg-white text-gray-700 text-sm sm:text-base"
            >
              <option value="all">All Collections</option>
              <option value="photography">Photography</option>
              <option value="fashion">Fashion</option>
              <option value="queer">Queer Studies</option>
              <option value="music">Music</option>
              <option value="art">Art Books</option>
              <option value="design">Design</option>
              <option value="ephemera">Ephemera</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </form>
        </div>

        {/* Link to Recently Added Page */}
        <div>
          <Link 
            href="/acquisitions"
            className="inline-flex items-center px-4 py-2 rounded-md border border-teal-600 text-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 transition-colors text-sm sm:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Recently Added
          </Link>
        </div>
      </div>

      {/* Collections Grid */}
      {filteredCollections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-10">
          {filteredCollections.map((collection) => (
            <Link 
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="group block bg-white rounded-lg overflow-hidden border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
              data-category={collection.category}
            >
              <div className="relative overflow-hidden aspect-[4/3]">
                {collection.cover_image ? (
                  <Image
                    src={`/placeholder-${collection.category}.jpg`} // In real app: getImageUrl(collection.cover_image)
                    alt={collection.collection_name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className={`absolute inset-0 flex items-center justify-center p-4 text-center ${collection.category}-bg`}>
                    <span className="text-base font-medium">{collection.collection_name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300"></div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
                  {collection.collection_name}
                </h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {collection.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500">No collections match your selected criteria.</p>
          <Link href="/collections" className="text-teal-700 hover:text-teal-900 mt-4 inline-block">View all collections</Link>
        </div>
      )}
    </div>
  );
}