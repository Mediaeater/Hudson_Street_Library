# Hudson Street Library - Data Import Scripts

This directory contains scripts for importing book data from CSV files into the Directus CMS.

## Setup

1. Install dependencies:
   ```
   npm install csv-parser @directus/sdk dotenv
   ```

2. Create a `.env` file with your Directus credentials:
   ```
   DIRECTUS_URL=http://localhost:8055
   DIRECTUS_ADMIN_TOKEN=your_admin_token_here
   ```

## Importing Books

1. Prepare your CSV file based on the template in `data/books-template.csv`
2. Save your actual book data as `data/books.csv`
3. Run the import script:
   ```
   node import-books.js
   ```

## CSV Format

The CSV file should include the following columns:

- `Author Last Name`: The author's last name
- `Author First Name`: The author's first name
- `Title`: The book title
- `Publisher`: Publisher information
- `Publication Date`: Date of publication (YYYY-MM-DD or YYYY)
- `Physical Dimensions`: Book dimensions (e.g., "24 × 30 cm")
- `Additional Book Details`: Additional physical description
- `Edition Information`: Edition details
- `ISBN`: ISBN or LC Call Number
- `Contributors/Editors`: Other contributors (comma-separated)
- `Summary/Description`: Book summary or description
- `Subject Classifications`: Subject categories (comma-separated)
- `Location`: Default is "Hudson Street Library, NYC"
- `Price`: Book price or value

## Adding Collections

After importing books, you can create collections and associate books with them through the Directus interface.