# Instagram Integration Guide

## Overview

This guide helps you track and display books featured on your [@hudson_street_library](https://www.instagram.com/hudson_street_library) Instagram account.

## System Components

### 1. Data File: `src/_data/instagram-books.json`
- Central file to track all books posted on Instagram
- Includes post dates, captions, and links to Instagram posts
- Can be matched against the main collection

### 2. Display Page: `/instagram-features.html`
- Public page showing all Instagram-featured books
- Automatically pulls from the JSON data file
- Shows which books have covers in the collection

### 3. Matching Script: `scripts/match-instagram-books.js`
- Identifies which Instagram books are in your collection
- Finds books that need to be added to the database
- Reports which books need covers

## How to Add Books from Instagram

### Step 1: Update the JSON File

Edit `src/_data/instagram-books.json` and add each book you've posted:

```json
{
  "post_date": "2024-09-20",
  "title": "The Americans",
  "author": "Robert Frank",
  "publisher": "Aperture",
  "year": "2008",
  "isbn": "9781597111843",
  "caption": "A groundbreaking work that changed photography forever...",
  "post_url": "https://www.instagram.com/p/YOUR_POST_ID/",
  "notes": "First edition featured"
}
```

### Step 2: Run the Matching Script

Check which books are in your collection:

```bash
node scripts/match-instagram-books.js
```

This will show:
- ✅ Books already in your collection
- ❌ Books that need to be added
- 📷 Books that need covers

### Step 3: Add Missing Books to Collection

For books not in your collection, add them to `src/_data/books.csv`:

```csv
ID,Title,Author/Artist,Publisher,Year,ISBN,...
1307,"The Americans","Robert Frank","Aperture",2008,9781597111843,...
```

### Step 4: Acquire Covers

For matched books without covers:

```bash
node acquire-covers-respectful.js --limit 50
```

## Instagram Post Template

When posting a book on Instagram, use this format for consistency:

```
📚 Title: [Book Title]
👤 Author: [Author Name]
📅 Year: [Publication Year]
🏢 Publisher: [Publisher Name]

[Your review or description]

#hudsonstreetlibrary #photobooks #photographybooks #rarebooks
```

## Benefits

1. **Discoverability**: Visitors can see what you're featuring on Instagram
2. **Cross-reference**: Know which Instagram books are in your collection
3. **Coverage tracking**: Identify which featured books need covers
4. **Engagement**: Drive traffic between Instagram and website

## Tips

- Post consistently (daily if possible)
- Use high-quality book cover images
- Include interesting facts or context about each book
- Tag publishers and photographers when possible
- Use relevant hashtags to increase reach

## Common Hashtags

```
#photobooks
#photographybooks
#hudsonstreetlibrary
#rarebooks
#bookstagram
#artbooks
#photographycollection
#bookphotography
#independentpublishing
#zines
```

## Analytics

Run the matching script regularly to track:
- How many Instagram books are in your collection
- Coverage percentage of featured books
- Books that drive the most engagement

## Future Enhancements

Consider adding:
- Automatic Instagram API integration
- Like/comment counts tracking
- Most popular books by engagement
- Instagram Stories archive
- IGTV book reviews archive