# Hudson Street Library - Google Sheets Import System

This system imports book data directly from Google Sheets into the Hudson Street Library's Directus CMS. It includes data validation, cleaning, and batch processing with comprehensive error handling.

## Features

- Direct integration with Google Sheets API
- Data validation and cleaning based on library standards
- Batch processing to handle large imports efficiently
- Detailed logging and error reporting
- Duplicate detection and updating

## Setup

### Prerequisites

- Node.js 18 or higher
- Access to Google Sheets API and a service account
- Directus CMS running (locally or in production)

### Installation

1. Install dependencies:
   ```bash
   cd cms/import-scripts/google-sheets
   npm install googleapis @directus/sdk dotenv fs path
   ```

2. Create a Google Cloud project and service account:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google Sheets API
   - Create a service account with "Viewer" permissions
   - Download the service account key as JSON
   - Save the key as `credentials.json` in this directory

3. Configure your environment:
   - Copy `.env.example` to `.env`
   - Fill in the appropriate values:
     - `GOOGLE_SHEETS_ID`: Your Google Sheets document ID
     - `GOOGLE_SHEETS_RANGE`: The range containing your book data
     - `DIRECTUS_URL`: Your Directus CMS URL
     - `DIRECTUS_ADMIN_TOKEN`: Your Directus admin token

4. Share your Google Sheet with the service account email address (found in credentials.json) with Viewer permissions

## Usage

### Running the Import

```bash
node import-books-from-sheets.js
```

### Scheduling Regular Imports

You can set up automated imports using cron jobs:

1. Create a script to run the import:
   ```bash
   #!/bin/bash
   cd /path/to/Hudson_Street_Library/cms/import-scripts/google-sheets
   node import-books-from-sheets.js > import-log.txt 2>&1
   ```

2. Make it executable:
   ```bash
   chmod +x run-import.sh
   ```

3. Add a cron job to run it weekly:
   ```bash
   crontab -e
   # Add this line to run every Monday at 2 AM
   0 2 * * 1 /path/to/Hudson_Street_Library/cms/import-scripts/google-sheets/run-import.sh
   ```

## Google Sheets Structure

Your Google Sheet should have the following columns (the script will attempt to map variations of these column names):

| Column Name | Description | Required |
|-------------|-------------|----------|
| Title | Book title | Yes |
| Author First Name | Author's first name | No |
| Author Last Name | Author's last name | No |
| Publisher | Publisher information | No |
| Publication Date | Date of publication (YYYY-MM-DD or YYYY) | No |
| Physical Dimensions | Book dimensions (e.g., "24 × 30 cm") | No |
| Additional Book Details | Additional physical description | No |
| Edition Information | Edition details | No |
| ISBN | ISBN or Library of Congress Call Number | No |
| Contributors/Editors | Other contributors (comma-separated) | No |
| Summary/Description | Book summary or description | No |
| Subject Classifications | Subject categories (comma-separated) | No |
| Location | Default is "Hudson Street Library, NYC" | No |
| Price | Book price or value | No |

## Error Handling

The script handles several types of errors:

1. **Connection Errors**: Problems connecting to Google Sheets or Directus
2. **Authentication Errors**: Issues with service account credentials or Directus token
3. **Data Validation Errors**: Invalid data in the spreadsheet
4. **Import Errors**: Problems creating or updating records in Directus

All errors are logged to:
- The console (real-time feedback)
- An import log JSON file (for detailed analysis)

## Import Logs

After each import, a detailed log file is created with:
- Summary statistics
- Lists of created, updated, and failed books
- Validation warnings for each book
- Complete details of invalid books that were skipped

## Customization

### Changing Validation Rules

Edit the `validateAndCleanBookData` function in `import-books-from-sheets.js` to modify validation rules.

### Modifying Field Mapping

If your Google Sheet has different column names, update the field mapping in the `validateAndCleanBookData` function.

### Adjusting Batch Size

Change the `IMPORT_BATCH_SIZE` environment variable to process more or fewer books at once.

## Troubleshooting

If you encounter issues:

1. Check the import log file for detailed error information
2. Verify that your service account has access to the Google Sheet
3. Ensure your Directus admin token hasn't expired
4. Check network connectivity to both Google APIs and your Directus instance