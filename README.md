# Hudson Street Library Collection Management System

A comprehensive CMS and frontend solution for the Hudson Street Library's specialized photography book collection.

## Overview

The Hudson Street Library Collection Management System consists of two main components:

1. **Directus CMS** - A headless CMS for managing the book collection data
2. **Next.js Frontend** - A modern, responsive website to showcase the collection

This system is designed to handle specialized metadata for photography books, organize them into curated collections, and present them in an accessible, visually appealing way.

## Features

- **Comprehensive Book Metadata**: Store detailed information about each book including physical attributes, subjects, contributor information, and more
- **Curated Collections**: Organize books into thematic collections with custom descriptions
- **Recent Acquisitions**: Track and showcase newly added books
- **Responsive Design**: Mobile-first design that works across all devices
- **Image Optimization**: Automatic image processing for different screen sizes
- **Accessibility**: WCAG-compliant interface with keyboard navigation and screen reader support
- **Search & Filtering**: Find books by various attributes and categories

## Tech Stack

### CMS (Backend)
- **Directus**: Headless CMS for content management
- **PostgreSQL**: Database for storing collection data
- **Docker**: Containerization for easy deployment

### Website (Frontend)
- **Next.js**: React framework for server-rendered pages
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Vercel**: Deployment platform (recommended)

## Project Structure

```
Hudson_Street_Library/
├── cms/                        # Directus CMS setup
│   ├── docker-compose.yml      # Docker configuration
│   ├── schema.json             # Data model definition
│   ├── import-scripts/         # Data import utilities
│   └── data/                   # Sample data and templates
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   ├── components/         # React components
│   │   ├── lib/                # Utility functions and API
│   │   └── styles/             # CSS styles
│   ├── public/                 # Static assets
│   └── next.config.mjs         # Next.js configuration
└── .github/                    # GitHub workflows for CI/CD
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

### Setting Up the CMS

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Hudson_Street_Library.git
   cd Hudson_Street_Library
   ```

2. Start the Directus CMS:
   ```bash
   cd cms
   npm install
   npm run start
   ```

3. Access the Directus Admin panel at `http://localhost:8055/admin`
   - Email: `admin@hudsonstreetlibrary.org`
   - Password: `HudsonLibrary123!` (Change this in production!)

4. Import sample data:
   ```bash
   npm run import-books
   ```

### Setting Up the Frontend

1. Install dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

2. Create a `.env.local` file based on `.env.example`

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the website at `http://localhost:3000`

## Deployment

### CMS Deployment

The Directus CMS can be deployed on any server that supports Docker:

1. Set up a server with Docker and Docker Compose
2. Clone the repository and navigate to the `cms` directory
3. Update the environment variables in `docker-compose.yml` for production
4. Run `docker-compose up -d`

### Frontend Deployment

The Next.js frontend is optimized for deployment on Vercel:

1. Connect your repository to Vercel
2. Set the environment variables in the Vercel dashboard
3. Deploy the project

Alternatively, you can build and export the site for deployment on any static hosting:

```bash
npm run build
```

## Data Migration

To import books from a spreadsheet:

1. Format your data according to the template in `cms/data/books-template.csv`
2. Save the file as `cms/data/books.csv`
3. Run the import script:
   ```bash
   cd cms
   npm run import-books
   ```

## Customization

### Adding New Collections

1. Log in to the Directus admin panel
2. Navigate to the Collections section
3. Create a new collection with the desired properties
4. Associate books with the collection

### Modifying the Data Model

1. Edit the schema in `cms/schema.json`
2. Apply the changes to Directus:
   ```bash
   cd cms
   # Stop the containers
   docker-compose down
   
   # Start again with the updated schema
   docker-compose up -d
   ```

## License

[Specify the license]

## Contact

For questions about the website, please contact [contact information].# Hudson_Street_Library
