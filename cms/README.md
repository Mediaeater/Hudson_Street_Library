# Hudson Street Library CMS Maintenance Guide

This guide provides instructions for maintaining the Hudson Street Library content management system (CMS) and ensuring it stays synchronized with the website.

## Overview

The Hudson Street Library uses a headless CMS architecture:

1. **Directus CMS**: Manages and stores all book, collection, and acquisition data
2. **Static HTML Website**: Frontend that retrieves data from the CMS via JavaScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

### Starting the CMS

1. Navigate to the CMS directory:
   ```bash
   cd cms
   ```

2. Start the Docker containers:
   ```bash
   npm run start
   ```
   This will start both the PostgreSQL database and Directus containers.

3. Access the Directus Admin panel:
   - URL: http://localhost:8055/admin
   - Email: admin@hudsonstreetlibrary.org
   - Password: HudsonLibrary123! (change this in production)

## Managing Content

### Adding a New Book

1. Log in to the Directus admin panel
2. Navigate to the "Books" collection
3. Click "Create Item"
4. Fill in the required fields:
   - Title
   - Author (First and Last name)
   - Status (set to "Published" to make it visible on the website)
5. Add a cover image by clicking the upload area in the "Cover Image" field
6. Fill in additional details like publication date, ISBN, dimensions, etc.
7. Save the item

### Creating a Collection

1. Navigate to the "Collections" collection in Directus
2. Click "Create Item" 
3. Fill in:
   - Collection Name (e.g., "NYC Photobooks")
   - Slug (e.g., "nyc-photobooks") - used in URLs
   - Description (rich text describing the collection)
   - Category (choose from the dropdown)
4. Set "Featured" to true if this should appear prominently on the website
5. Upload a cover image
6. In the "Books" field, click "Add Items" to associate books with this collection
7. Set "Status" to "Published"
8. Save the collection

### Tracking New Acquisitions

1. Navigate to the "New Acquisitions" collection
2. Click "Create Item"
3. Select a book from the dropdown list
4. Set the acquisition date
5. Add any highlight text about this acquisition
6. Set "Featured" to true for special acquisitions
7. Save the item

## Book Data Import

You can bulk import books from a CSV file:

1. Prepare your data in a CSV format according to the template in `data/books-template.csv`
2. Save your file as `data/books.csv`
3. Run the import script:
   ```bash
   npm run import-books
   ```

## Customizing the Schema

If you need to modify the data model:

1. Edit the `schema.json` file
2. Apply changes to the database:
   ```bash
   # Stop the containers
   npm run stop
   
   # Restart with the updated schema
   npm run start
   ```

## Website Integration

The website retrieves data from the CMS using JavaScript:

### API Integration

- `js/api.js`: Contains functions for fetching data from the CMS
- `js/render-utils.js`: Provides utility functions for rendering data into HTML
- `js/cms-integration.js`: Connects specific website pages with CMS data

### Important Endpoints

These are the main CMS endpoints used by the website:

- Collections: `http://localhost:8055/items/collections`
- Books: `http://localhost:8055/items/books`
- New Acquisitions: `http://localhost:8055/items/new_acquisitions`
- Assets (images): `http://localhost:8055/assets/[asset-id]`

## Production Deployment

For production deployment:

1. Update environment variables in `docker-compose.yml`:
   - Change the admin password
   - Update security keys
   - Set the correct PUBLIC_URL

2. Use environment-specific settings for the API endpoints in the website's JavaScript files.

3. Ensure proper CORS settings are configured in Directus.

## Backup and Maintenance

### Creating a Backup

Run the backup script to create a schema snapshot:
```bash
npm run backup
```

This saves the current schema to `snapshots/[timestamp].json`.

### Restoring from Backup

To restore from a backup:
1. Stop the containers: `npm run stop`
2. Replace `schema.json` with the backup file
3. Start the containers: `npm run start`

## Troubleshooting

### Common Issues

1. **CMS not starting**: Check Docker logs with `docker-compose logs directus`

2. **Database connection errors**: Ensure PostgreSQL container is running: `docker ps`

3. **Image upload issues**: Check directory permissions for the uploads folder

4. **API errors on website**: Open browser console to see detailed error messages

### Getting Help

For additional assistance, refer to:
- [Directus Documentation](https://docs.directus.io/)
- Contact the development team at [contact information]