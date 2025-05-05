import type { Metadata } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hudson Street Library",
  description: "A specialized collection of photography books in Manhattan's West Village",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <header className="sticky top-0 w-full bg-white z-50 py-4 shadow-md">
          <div className="container mx-auto px-6">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-xl sm:text-2xl font-bold tracking-tight text-teal-900">HUDSON STREET LIBRARY</Link>
              <nav id="main-nav" className="hidden md:flex space-x-6 lg:space-x-8 items-center text-neutral-700 text-sm lg:text-base">
                <Link href="/#about" className="hover:text-teal-700">About</Link>
                <Link href="/collections" className="hover:text-teal-700">Collections</Link>
                <Link href="/#publications" className="hover:text-teal-700">Publications</Link>
                <Link href="/news" className="hover:text-teal-700">News</Link>
                <Link href="/#contact" className="hover:text-teal-700">Contact</Link>
              </nav>
              <button 
                className="md:hidden focus:outline-none text-teal-800" 
                aria-label="Toggle menu" 
                aria-controls="mobile-nav-menu" 
                aria-expanded="false"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
          <nav id="mobile-nav-menu" className="hidden md:hidden absolute top-full left-0 right-0 bg-white shadow-lg px-6 py-4 space-y-3 flex-col z-40">
            <Link href="/#about" className="block py-2 text-neutral-700 hover:text-teal-700">About</Link>
            <Link href="/collections" className="block py-2 text-neutral-700 hover:text-teal-700">Collections</Link>
            <Link href="/#publications" className="block py-2 text-neutral-700 hover:text-teal-700">Publications</Link>
            <Link href="/news" className="block py-2 text-neutral-700 hover:text-teal-700">News</Link>
            <Link href="/#contact" className="block py-2 text-neutral-700 hover:text-teal-700">Contact</Link>
          </nav>
        </header>

        <main className="flex-grow">
          {children}
        </main>

        <footer className="bg-neutral-900 text-neutral-300 py-16">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between pb-12 border-b border-neutral-700">
              <div className="mb-8 md:mb-0">
                <h3 className="text-2xl font-bold mb-4 text-white">HUDSON STREET LIBRARY</h3>
                <p className="text-neutral-400 max-w-xs">A specialized photography book collection in Manhattan's West Village.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                <div>
                  <h4 className="font-semibold text-lg mb-4 text-neutral-100">Explore</h4>
                  <ul className="space-y-2 text-neutral-400">
                    <li><Link href="/" className="hover:text-white">Home</Link></li>
                    <li><Link href="/#about" className="hover:text-white">About</Link></li>
                    <li><Link href="/collections" className="hover:text-white">Collections</Link></li>
                    <li><Link href="/#publications" className="hover:text-white">Publications</Link></li>
                    <li><Link href="/news" className="hover:text-white">News</Link></li>
                    <li><Link href="/#contact" className="hover:text-white">Contact</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-4 text-neutral-100">Visit</h4>
                  <ul className="space-y-2 text-neutral-400">
                    <li><Link href="/#contact" className="hover:text-white">Visit Policy</Link></li>
                    <li><Link href="/#contact" className="hover:text-white">Location</Link></li>
                    <li><Link href="/#contact" className="hover:text-white">Appointments</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-4 text-neutral-100">Connect</h4>
                  <ul className="space-y-2 text-neutral-400">
                    <li><a href="https://instagram.com/hudsonstreetlibrary" className="hover:text-white">Instagram</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="pt-12 text-center text-neutral-500 text-sm">
              <p>&copy; {new Date().getFullYear()} Hudson Street Library. All rights reserved.</p>
            </div>
          </div>
        </footer>

        <script dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const mobileMenuButton = document.querySelector('button[aria-controls="mobile-nav-menu"]');
              const mobileNavMenu = document.getElementById('mobile-nav-menu');
              
              if (mobileMenuButton && mobileNavMenu) {
                mobileMenuButton.addEventListener('click', function() {
                  const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
                  mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
                  mobileNavMenu.classList.toggle('hidden');
                  mobileNavMenu.classList.toggle('flex');
                });
              }
            });
          `
        }} />
      </body>
    </html>
  );
}