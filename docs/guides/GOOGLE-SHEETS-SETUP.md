# Google Sheets as Free CMS for Hudson Street Library

## Why Google Sheets?
- **100% Free** - No hosting costs
- **Easy to edit** - Update books directly in spreadsheet
- **Real-time updates** - Changes appear instantly on website
- **No server needed** - Works with GitHub Pages
- **Collaborative** - Multiple people can edit

## Setup Instructions

### 1. Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet
3. Import your CSV file: File → Import → Upload → Select your CSV
4. Name it "Hudson Street Library Books"

### 2. Make Sheet Public
1. Click "Share" button (top right)
2. Change to "Anyone with the link can view"
3. Copy the spreadsheet ID from URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

### 3. Get Google API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project (or select existing)
3. Enable Google Sheets API:
   - Go to "APIs & Services" → "Library"
   - Search "Google Sheets API"
   - Click and Enable
4. Create API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

### 4. Update Your Website
1. Edit `js/google-sheets-api.js`:
   ```javascript
   const SHEETS_CONFIG = {
     spreadsheetId: 'YOUR_SPREADSHEET_ID_HERE',
     apiKey: 'YOUR_API_KEY_HERE'
   };
   ```

2. Update your HTML files to use Google Sheets instead of Directus:
   ```html
   <script src="js/google-sheets-api.js"></script>
   <script>
     // Fetch books from Google Sheets
     GoogleSheetsAPI.fetchBooks({ limit: 10 })
       .then(books => {
         // Display books
       });
   </script>
   ```

## Other Free Alternatives

### 1. **Netlify CMS** (Free)
- Git-based CMS
- Works perfectly with GitHub Pages
- Edit through web interface
- Saves directly to your repo

### 2. **Airtable** (Free tier)
- 1,200 records free
- Nice interface
- API access
- Good for your ~1,300 books

### 3. **GitHub as CMS**
- Store data as JSON files
- Edit directly on GitHub
- No API limits
- Version control built-in

### 4. **Static JSON Files**
- Convert your CSV to JSON
- Host on GitHub Pages
- Super fast (no API calls)
- Update by committing changes

## Recommended Solution

For your use case with 1,321 books, I recommend:

1. **Google Sheets** for easy editing
2. **Static JSON fallback** for speed
3. **GitHub Pages** hosting (free)

This gives you:
- Free hosting
- Easy updates
- Fast loading
- No server costs
- Reliable uptime