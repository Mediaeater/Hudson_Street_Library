import Image from 'next/image';
import Link from 'next/link';
// import { getCollections, getNewAcquisitions, getImageUrl } from '@/lib/directus';

export const revalidate = 3600; // Revalidate this page every hour

export default async function Home() {
  // For demo purposes, we'll use placeholder data
  // In a real implementation, use:
  // const collections = await getCollections({
  //   filter: { featured: { _eq: true } },
  //   limit: 3
  // });
  // const acquisitions = await getNewAcquisitions({
  //   limit: 3
  // });

  const collections = [
    {
      id: '1',
      collection_name: 'NYC Photobooks',
      slug: 'nyc-photobooks',
      description: 'Explore the dynamic energy, diverse communities, and iconic landscapes of New York City as captured in classic and contemporary photobooks.',
      category: 'photography',
      cover_image: '' // In a real implementation, this would be an image ID
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
    }
  ];

  const acquisitions = [
    {
      id: '1',
      acquisition_date: '2023-04-18',
      highlight_text: 'A significant addition to our archive of artist tributes.',
      book: {
        title: 'The Brooklyn Rail - A Tribute to Richard Serra',
        author_first_name: 'Various',
        author_last_name: 'Artists & Writers',
        isbn: 'N6537.S47 B76 2023',
        publisher: 'Brooklyn, NY: The Brooklyn Rail',
        publication_date: '2023-01-01',
        cover_image: ''
      }
    },
    {
      id: '2',
      acquisition_date: '2023-04-15',
      highlight_text: 'Limited edition artist zines in special packaging.',
      book: {
        title: 'SISTERS: The Archive Issue',
        author_first_name: 'Various',
        author_last_name: 'Contributors',
        isbn: 'TR1 .S57 2023',
        publisher: 'SISTERS Magazine',
        publication_date: '2023-01-01',
        cover_image: ''
      }
    },
    {
      id: '3',
      acquisition_date: '2023-04-12',
      book: {
        title: 'Kiyosato Museum Of Contemporary Art Archive I: Ephemera',
        author_first_name: 'Kiyosato Museum of',
        author_last_name: 'Contemporary Art',
        isbn: 'N860.K59 A73 2023 v.1',
        publisher: 'Kiyosato Archive Press',
        publication_date: '2023-01-01',
        cover_image: ''
      }
    }
  ];

  return (
    <main>
      {/* Hero Section */}
      <section className="relative h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
        <div className="absolute inset-0 bg-neutral-800">
          {/* In a real implementation, we would use an actual image */}
          {/* <Image 
            src="/hero-library.jpg" 
            alt="Hudson Street Library" 
            fill
            priority
            className="object-cover"
          /> */}
        </div>
        <div className="container mx-auto px-6 relative z-20 text-center md:text-left">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">Hudson Street Library</h1>
          <p className="text-xl md:text-2xl text-neutral-200 mb-8 max-w-2xl mx-auto md:mx-0">
            A specialized collection of photography books in Manhattan's West Village.
          </p>
          <Link
            href="/collections"
            className="inline-block border border-white text-white px-8 py-3 hover:bg-white hover:text-teal-900 transition-all rounded-sm font-medium"
          >
            Explore
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-6 text-teal-900">About the Library</h2>
            <div className="relative pb-10 mb-6">
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-px bg-teal-700"></div>
            </div>
            <p className="text-lg leading-relaxed text-neutral-600">
              Hudson Street Library houses a unique collection dedicated to documenting visual culture through the lens of contemporary photography. Our specialized focus areas include New York City, surveillance, female artists, street art, fashion, and music. We emphasize diverse global perspectives, featuring works from Middle Eastern and other underrepresented creators. The library also boasts rare zines, artist books, and special collections on LGBT+ publications, serial landscape photography, and photography of protest.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Collections Section */}
      {collections.length > 0 && (
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-teal-900">Featured Collections</h2>
              <div className="relative pb-10 mb-6">
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-px bg-teal-700"></div>
              </div>
              <p className="text-lg text-neutral-600">
                Explore our thematic archives of visual culture, highlighting specific areas within the library's holdings.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {collections.map((collection) => (
                <Link 
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
                    {collection.cover_image ? (
                      <Image
                        src={`/placeholder-${collection.category}.jpg`}
                        alt={collection.collection_name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`absolute inset-0 flex items-center justify-center p-4 text-center bg-${collection.category === 'photography' ? 'blue' : collection.category === 'art' ? 'red' : 'amber'}-100`}>
                        <span className="text-base font-medium">{collection.collection_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-800 group-hover:text-teal-700 transition-colors">
                      {collection.collection_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {collection.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/collections"
                className="inline-block border border-teal-700 text-teal-700 px-6 py-3 hover:bg-teal-700 hover:text-white transition-all rounded-sm font-medium"
              >
                View All Collections
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recent Acquisitions Section */}
      {acquisitions.length > 0 && (
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-teal-900">Recent Acquisitions</h2>
              <div className="relative pb-10 mb-6">
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-px bg-teal-700"></div>
              </div>
              <p className="text-lg text-neutral-600">
                Explore our latest additions to the Hudson Street Library special collection.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {acquisitions.map((acquisition) => {
                const book = acquisition.book as any;
                return (
                  <div key={acquisition.id} className="bg-neutral-50 rounded-lg overflow-hidden shadow-md transition-all hover:shadow-lg">
                    <div className="h-64 overflow-hidden bg-gray-200 flex items-center justify-center">
                      {book.cover_image ? (
                        <Image
                          src={`/placeholder-book.jpg`}
                          alt={`Cover of ${book.title}`}
                          width={600}
                          height={450}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-center px-4">
                            {book.title}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <p className="text-xs text-neutral-500 mb-1">{book.isbn}</p>
                        <h3 className="text-xl font-bold text-teal-900 mb-1">{book.title}</h3>
                        <p className="italic text-neutral-700">{book.author_first_name} {book.author_last_name}</p>
                      </div>
                      <div className="space-y-2 text-sm text-neutral-600">
                        <p><span className="font-semibold">Publisher:</span> {book.publisher}</p>
                        <p><span className="font-semibold">Publication Date:</span> {new Date(book.publication_date).getFullYear()}</p>
                        <p><span className="font-semibold">Acquisition Date:</span> {new Date(acquisition.acquisition_date).toLocaleDateString()}</p>
                      </div>
                      {acquisition.highlight_text && (
                        <div className="mt-4 pt-4 border-t border-neutral-200">
                          <p className="text-sm text-neutral-600">{acquisition.highlight_text}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-12">
              <Link
                href="/acquisitions"
                className="inline-block border border-teal-700 text-teal-700 px-6 py-3 hover:bg-teal-700 hover:text-white transition-all rounded-sm font-medium"
              >
                View All Recent Acquisitions
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gradient-to-b from-teal-50/30 to-amber-50/30">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-teal-900">Contact & Visit</h2>
            <div className="relative pb-10 mb-6">
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-20 h-px bg-teal-700"></div>
            </div>
            <p className="text-lg leading-relaxed text-neutral-600">
              We welcome submissions from publishers, artists, and friends of the library.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-x-12 gap-y-10 text-center md:text-left">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-teal-800">Location</h3>
              <p className="text-neutral-600 leading-relaxed">
                Hudson Street Library<br />
                421 Hudson St<br />
                New York, NY 10014
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-teal-800">Visit Policy</h3>
              <p className="text-neutral-600 leading-relaxed">
                Visits are currently limited to artists, publishers, researchers, and students by appointment. Please contact us to schedule.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-teal-800">Contact Info</h3>
              <p className="text-neutral-600 leading-relaxed">
                <a href="mailto:info@hudsonstreetlibrary.org" className="hover:text-teal-700 font-medium">info@hudsonstreetlibrary.org</a>
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-teal-800">Follow Us</h3>
              <div className="flex space-x-4 justify-center md:justify-start">
                <a href="https://instagram.com/hudsonstreetlibrary" className="text-neutral-500 hover:text-teal-700 transition-colors" aria-label="Instagram">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465.668.25 1.235.593 1.8 1.16.567.569.902 1.142 1.152 1.82.247.65.4 1.401.44 2.428.044 1.036.06 1.395.06 3.808s-.016 2.772-.06 3.808c-.048 1.064-.21 1.791-.465 2.427a4.957 4.957 0 01-1.153 1.8c-.57.568-1.143.902-1.82 1.152-.65.247-1.401.4-2.428.44-1.036.044-1.395.06-3.808.06s-2.772-.016-3.808-.06c-1.064-.048-1.791-.21-2.428-.465a4.957 4.957 0 01-1.8-1.153 4.957 4.957 0 01-1.152-1.82c-.247-.65-.4-1.401-.44-2.428-.044-1.036-.06-1.395-.06-3.808s.016-2.772.06-3.808c.048-1.064.21-1.791.465-2.428a4.957 4.957 0 011.153-1.8c.568-.57 1.143-.902 1.82-1.152.65-.247 1.401-.4 2.428-.44C9.543 2.013 9.9 2 12.315 2zm0 1.802c-2.506 0-2.784.01-3.76.052-.905.042-1.39.193-1.723.328-.433.168-.742.37-1.063.693-.323.323-.525.63-.692 1.062-.135.327-.286.822-.328 1.723-.04.984-.052 1.262-.052 3.76s.01 2.778.052 3.76c.042.905.193 1.39.328 1.723.168.433.37.742.693 1.063.323.323.63.525 1.062.692.327.135.822.286 1.723.328.984.04 1.262.052 3.76.052s2.778-.01 3.76-.052c.905-.042 1.39-.193 1.723-.328.433-.168.742-.37 1.063-.693.323-.323.525-.63.692-1.062.135-.327.286-.822.328-1.723.04-.984.052-1.262.052-3.76s-.01-2.778-.052-3.76c-.042-.905-.193-1.39-.328-1.723a2.875 2.875 0 00-.693-1.063 2.874 2.874 0 00-1.062-.692c-.327-.135-.822-.286-1.723-.328-.984-.04-1.262-.052-3.76-.052zm0 3.063a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 8.468a3.333 3.333 0 110-6.666 3.333 3.333 0 010 6.666zm6.538-8.469a1.2 1.2 0 10-2.4 0 1.2 1.2 0 002.4 0z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}