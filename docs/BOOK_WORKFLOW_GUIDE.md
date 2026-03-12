# Hudson Street Library - Book Addition Workflow Guide

## 📚 Overview

This guide documents the **web-based admin panel** workflow for adding books. For most users, the **command-line workflow** is faster and simpler.

### Command-Line Workflow (Recommended)

**Quick Method** - Add books via command line with automatic Datasette catalog updates:

```bash
npm run add
# or
node scripts/add-book-from-text.js --interactive
```

**Features**:
- Paste book text (title, author, publisher, year)
- Auto-lookup ISBN via Google Books
- **Automatically updates Datasette catalog**
- Generates proper cover filename

See [scripts/add-book-from-text.js](../scripts/add-book-from-text.js) for details.

### Web Admin Panel Workflow (This Guide)

The Hudson Street Library Book Addition Workflow is a comprehensive, 4-step guided process designed to streamline the addition of new books to the library collection. This system combines intelligent automation with user control to create an efficient and user-friendly experience.

**Note**: This web interface may be in development/archived. The command-line workflow above is the primary method.

## 🚀 Getting Started

### Accessing the Workflow

1. **Login to Admin Panel**: Navigate to `https://hudsonstreetlibrary.com/admin`
2. **Go to Books Section**: Click "Books" in the sidebar navigation
3. **Start New Book**: Click the "Add New Book" button

### System Requirements

- **Modern Web Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript Enabled**: Required for all interactive features
- **Internet Connection**: For ISBN lookups and image processing
- **Minimum Screen Resolution**: 1024x768 (mobile responsive)

## 📋 The 4-Step Workflow

### Step 1: Book Details

**Purpose**: Capture essential book information and metadata

#### Required Fields
- **Title**: Book title (max 500 characters)
- **Status**: Current availability status

#### Optional Fields
- **Author**: First and last name (separate fields)
- **Publisher**: Publishing company (auto-complete enabled)
- **Publication Year**: Year published (1800-2030)
- **ISBN**: ISBN-10 or ISBN-13 format

#### Physical Properties
- **Dimensions**: Height, width, depth in centimeters
- **Page Count**: Total number of pages
- **Binding Type**: Hardcover, paperback, spiral, etc.

#### Library Management
- **Shelf Location**: Physical shelf identifier (e.g., A1, B3)
- **Section**: Category section (e.g., Photography, Art)
- **Acquisition Date**: When the book was acquired
- **Price Paid**: Purchase cost in dollars

#### Content Description
- **Summary**: Brief overview (max 500 characters)
- **Description**: Detailed description (max 1000 characters)
- **Tags**: Comma-separated keywords
- **Subjects**: Library subject classifications

#### Smart Features
- **ISBN Lookup**: Enter ISBN to auto-populate book details
- **Category Detection**: Automatic category suggestion based on title/description
- **Publisher Auto-complete**: Suggestions from existing library data
- **Character Counters**: Real-time feedback on field limits

### Step 2: Image Upload & Processing

**Purpose**: Add and optimize book cover and additional images

#### Upload Options
- **Drag & Drop**: Drag image files directly to upload area
- **Click to Browse**: Traditional file selection dialog
- **URL Import**: Enter image URL for external images

#### Supported Formats
- **File Types**: JPG, PNG, GIF, WebP
- **Maximum Size**: 10MB per image
- **Recommended Dimensions**: 600x800px for covers

#### Processing Features
- **Auto-Crop**: Automatic aspect ratio correction (3:4)
- **Quality Enhancement**: Improve contrast and sharpness
- **Background Removal**: Experimental AI-powered feature
- **Image Rotation**: 90-degree rotation controls
- **Preview**: Real-time preview with technical details

#### Additional Images
- **Multiple Upload**: Support for interior photos, back cover, etc.
- **Gallery Management**: Organize and reorder images
- **Thumbnail Generation**: Automatic responsive image creation

### Step 3: Collection Assignment

**Purpose**: Organize books into themed collections

#### Automatic Suggestions
- **Smart Detection**: AI-powered collection recommendations
- **Relevance Scoring**: Percentage match for each suggestion
- **Category Matching**: Based on detected book category
- **Keyword Analysis**: Title and subject-based matching

#### Manual Selection
- **Collection Search**: Find collections by name or description
- **Category Filtering**: Browse by collection type
- **Multiple Assignment**: Add to multiple collections
- **Visual Feedback**: Clear indication of selected collections

#### Collection Categories
- **Photography**: Photo books, photography theory, artist portfolios
- **Art**: Art books, exhibition catalogs, art theory
- **Fashion**: Fashion photography, design, style guides
- **Ephemera**: Magazines, newspapers, promotional materials
- **Design**: Graphic design, typography, product design
- **Special**: Unique or temporary collections

#### Display Options
- **Featured Book**: Highlight on homepage
- **Staff Pick**: Include in staff recommendations
- **New Acquisition**: Show in recently added section

### Step 4: Preview & Publish

**Purpose**: Review and finalize book entry

#### Preview Components
- **Book Display**: How the book will appear to users
- **Cover Image**: Final processed image preview
- **Metadata**: All entered information formatted
- **Collections**: Assigned collections with category badges
- **SEO Preview**: Search engine result appearance

#### Publication Options
- **Publish Immediately**: Make book live instantly
- **Save as Draft**: Store for later completion
- **Schedule Publication**: Set future publish date

#### Validation Checklist
- ✅ Title completed
- ✅ Status selected
- ✅ Cover image uploaded
- ✅ Collections assigned
- ✅ Description provided

#### Final Actions
- **Preview Public Page**: See how book appears to visitors
- **Duplicate Book**: Create similar book entry
- **Notification Settings**: Staff alerts and social media posts

## 🔄 Batch Operations

### CSV Import

**Purpose**: Import multiple books from spreadsheet data

#### Process
1. **Download Template**: Get sample CSV with correct format
2. **Prepare Data**: Fill spreadsheet with book information
3. **Upload File**: Drag and drop or browse to select CSV
4. **Validate Data**: Check for errors and missing fields
5. **Review Results**: Preview books before import
6. **Import Books**: Process all valid entries

#### Required CSV Columns
- `title` - Book title (required)
- `status` - Availability status (required)

#### Optional CSV Columns
- `author_first`, `author_last` - Author names
- `publisher` - Publishing company
- `publication_year` - Year published
- `isbn` - ISBN number
- `summary` - Brief description
- `description` - Detailed description
- `tags` - Comma-separated keywords
- `subjects` - Comma-separated subjects
- `location_shelf` - Shelf location
- `location_section` - Library section

### ISBN Batch Lookup

**Purpose**: Auto-populate book details from ISBN numbers

#### Process
1. **Enter ISBNs**: One ISBN per line in text area
2. **Validate Format**: Check ISBN-10 and ISBN-13 formats
3. **Set Defaults**: Choose default status, section, shelf
4. **Fetch Details**: Retrieve book information from external APIs
5. **Review Results**: Check auto-populated data
6. **Import Books**: Save all successfully fetched books

#### Default Settings
- **Status**: Applied to all books
- **Section**: Library category
- **Shelf Location**: Physical location
- **Auto-Collections**: Automatic collection assignment
- **New Acquisition**: Mark as recently added

### Manual Batch Entry

**Purpose**: Quickly add multiple books with minimal data

#### Process
1. **Add Book Rows**: Create multiple book entry forms
2. **Fill Information**: Enter title, author, status for each
3. **Apply Bulk Settings**: Set common values across all books
4. **Validate Entries**: Check required fields completion
5. **Save All Books**: Process all valid entries at once

#### Bulk Operations
- **Status Assignment**: Apply same status to all books
- **Section Assignment**: Set library section for all
- **Clear All**: Remove all entries and start over
- **Individual Removal**: Delete specific book entries

## 💾 Auto-Save & Data Protection

### Auto-Save Features
- **Frequency**: Automatic save every 30 seconds
- **Visual Indicator**: Confirmation when data is saved
- **Draft Recovery**: Restore unsaved changes on page reload
- **Navigation Warning**: Alert when leaving with unsaved changes

### Data Validation
- **Real-time Checking**: Instant validation as you type
- **Error Messages**: Clear feedback for invalid data
- **Required Fields**: Visual indicators for mandatory information
- **Format Validation**: ISBN, year, and URL format checking

## 🎯 Tips for Efficient Use

### Best Practices

#### Data Entry
- **Use ISBN Lookup**: Enter ISBN first to auto-populate details
- **Complete Title First**: Triggers category detection and suggestions
- **Add Subjects Early**: Improves collection suggestions
- **Upload Cover Image**: Enhances book discovery and appeal

#### Collection Organization
- **Review Suggestions**: Auto-suggestions are usually accurate
- **Multiple Collections**: Books can belong to several collections
- **Category Consistency**: Keep collections organized by type
- **Feature Sparingly**: Don't overuse featured/staff pick flags

#### Batch Operations
- **Start Small**: Test CSV import with a few books first
- **Use Templates**: Download and modify the provided CSV template
- **Validate First**: Always validate before importing large batches
- **Check Duplicates**: Review existing library for duplicate entries

### Keyboard Shortcuts
- **Tab**: Navigate between form fields
- **Enter**: Submit forms and advance steps
- **Ctrl/Cmd + S**: Manually trigger save (auto-save also active)
- **Escape**: Cancel current action or close modals

### Mobile Usage
- **Portrait Mode**: Optimized for phone screens
- **Touch Friendly**: Large touch targets for mobile interaction
- **Responsive Layout**: Adapts to different screen sizes
- **Offline Support**: Basic functionality works without internet

## 🛠️ Troubleshooting

### Common Issues

#### Upload Problems
**Problem**: Image upload fails
**Solutions**:
- Check file size (must be under 10MB)
- Verify file format (JPG, PNG, GIF, WebP only)
- Try different browser or clear cache
- Check internet connection stability

#### ISBN Lookup Failures
**Problem**: ISBN doesn't return book data
**Solutions**:
- Verify ISBN format (check for typos)
- Try alternative ISBN if book has multiple
- Manually enter book details if lookup fails
- Some older books may not be in external databases

#### Form Validation Errors
**Problem**: Can't proceed to next step
**Solutions**:
- Check all required fields are completed
- Verify field formats (year, ISBN, URL)
- Look for error messages near form fields
- Clear and re-enter problematic data

#### Collection Suggestions Not Appearing
**Problem**: No automatic collection suggestions
**Solutions**:
- Ensure title and description are entered
- Add relevant subjects to improve matching
- Try manual collection search instead
- Some books may not match existing collections

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Title is required" | Title field is empty | Enter a book title |
| "Invalid ISBN format" | ISBN doesn't match valid pattern | Check ISBN for typos |
| "File too large" | Image exceeds 10MB limit | Compress image or use smaller file |
| "Network error" | Connection problem | Check internet and try again |
| "Validation failed" | Form data is incomplete | Complete all required fields |

### Performance Tips

#### For Large Libraries
- **Use Batch Import**: More efficient than individual entries
- **Regular Maintenance**: Periodically review and organize collections
- **Image Optimization**: Keep image files reasonably sized
- **Browser Performance**: Clear cache if interface becomes slow

#### For Slow Connections
- **Disable Auto-enhance**: Turn off image processing features
- **Use URLs**: Link to external images instead of uploading
- **Smaller Batches**: Import fewer books at once
- **Save Frequently**: Manual saves if auto-save is slow

## 📞 Support & Resources

### Getting Help
- **User Guide**: This document for comprehensive instructions
- **Video Tutorials**: Available in admin panel help section
- **Email Support**: cms-support@hudsonstreetlibrary.com
- **Phone Support**: Available during business hours

### Additional Resources
- **CSV Template**: Download from batch import section
- **Collection Guidelines**: Best practices for organization
- **Subject Standards**: Recommended subject classifications
- **Image Guidelines**: Cover image optimization tips

### Training
- **New User Orientation**: Available for new staff members
- **Advanced Features**: Training for batch operations and automation
- **Best Practices Workshop**: Efficient workflow techniques
- **Regular Updates**: Notifications when new features are added

---

*This workflow guide covers all aspects of the book addition system. For technical issues or feature requests, please contact the support team.*