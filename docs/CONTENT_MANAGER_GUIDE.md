# Hudson Street Library - Content Manager Guide

## 🏛️ Welcome to the CMS

Welcome to the Hudson Street Library Content Management System! This guide will help you efficiently manage books, collections, and other content through our intuitive admin interface.

## 🚀 Getting Started

### Accessing the Admin Panel

1. **URL**: Navigate to `https://hudsonstreetlibrary.org/admin`
2. **Login**: Use your provided credentials
3. **Dashboard**: You'll land on the main dashboard showing library statistics

### Dashboard Overview

The dashboard provides:
- **Total Books**: Current number of books in the system
- **Collection Stats**: Number of collections and their categories
- **Recent Activity**: Latest changes made by all users
- **Quick Actions**: Common tasks like adding books or creating collections
- **System Status**: Health indicators for the website

## 📚 Managing Books

### Adding a New Book

1. **Navigate**: Click "Books" in the sidebar → "Add New Book"
2. **Required Fields**:
   - **Title**: Full book title
   - **Status**: Available, Checked Out, Reserved, Missing, Damaged, or In Repair

3. **Optional Information**:
   - **Author**: First and last name
   - **Publisher**: Publishing company
   - **Publication Year**: Year published
   - **ISBN**: ISBN-10 or ISBN-13

4. **Physical Properties**:
   - **Dimensions**: Height, width, depth in centimeters
   - **Page Count**: Number of pages
   - **Binding Type**: Hardcover, paperback, spiral, etc.

5. **Library Management**:
   - **Shelf Location**: Physical location (e.g., A1, B3)
   - **Section**: Category section (e.g., Photography, Art)
   - **Accession Number**: Unique library identifier
   - **Acquisition Date**: When the book was acquired
   - **Price Paid**: Purchase cost

6. **Content Description**:
   - **Summary**: Brief description of the book
   - **Detailed Description**: Longer description for public catalog
   - **Tags**: Keywords separated by commas
   - **Subjects**: Subject classifications

7. **Collections**: Check boxes for collections this book belongs to

8. **Cover Image**:
   - **Upload**: Drag and drop an image file
   - **URL**: Or enter a web URL for the image

9. **Display Options**:
   - **Featured Book**: Display prominently on homepage
   - **Staff Pick**: Include in staff recommendations
   - **New Acquisition**: Show in recently added section

### Editing Existing Books

1. **Find the Book**:
   - Use search bar to find by title, author, or ISBN
   - Filter by status, collection, or other criteria
   - Browse the books list

2. **Edit**: Click the pencil icon next to the book
3. **Make Changes**: Update any fields as needed
4. **Save**: Click "Update Book" to save changes

### Bulk Operations

1. **Select Books**: Check the boxes next to multiple books
2. **Actions Menu**: Click the "Actions" button that appears
3. **Available Operations**:
   - Export selected books to CSV
   - Delete multiple books
   - Add to collection in bulk
   - Change status for multiple books

### Book Status Guide

- **Available**: Book is on shelf and can be borrowed
- **Checked Out**: Currently borrowed by a patron
- **Reserved**: Held for a specific patron
- **Missing**: Cannot be located on shelf
- **Damaged**: Needs repair or attention
- **In Repair**: Currently being repaired

## 📁 Managing Collections

Collections help organize books into themed groups like "Photography Books," "Staff Picks," or "New Acquisitions."

### Creating a New Collection

1. **Navigate**: Click "Collections" in sidebar → "New Collection"
2. **Basic Information**:
   - **Name**: Collection title (e.g., "Fashion Photography")
   - **Description**: Brief explanation of the collection's focus
   - **Category**: Choose from Photography, Art, Fashion, Ephemera, Design, or Special

3. **Organization**:
   - **Parent Collection**: Optional - create sub-collections
   - **Display Order**: Number to control sorting (lower numbers appear first)

4. **Visibility**:
   - **Public**: Visible to website visitors
   - **Featured**: Highlighted on homepage
   - **Color Scheme**: Visual theme for the collection

5. **Visual Elements**:
   - **Hero Image**: Large banner image for the collection page
   - **Curator Notes**: Personal introduction or context

6. **Books**: Add books to the collection

### Managing Collection Content

#### Adding Books to Collections
1. **From Book Edit Page**: Check collection boxes when editing a book
2. **From Collection Page**: Click "Add Books" and select from list
3. **Bulk Addition**: Select multiple books and use "Add to Collection" action

#### Removing Books from Collections
1. **From Book Edit Page**: Uncheck collection boxes
2. **From Collection Page**: Click "Remove" next to books in collection
3. **Bulk Removal**: Use bulk actions to remove multiple books

#### Organizing Collection Display
- **Book Order**: Drag and drop books to reorder within collection
- **Featured Books**: Mark specific books as featured within collection
- **Collection Hierarchy**: Create parent/child relationships

### Collection Categories

- **Photography**: Photo books, photography theory, photographer monographs
- **Art**: Art books, exhibition catalogs, art theory
- **Fashion**: Fashion photography, fashion design, style guides
- **Ephemera**: Magazines, newspapers, promotional materials
- **Design**: Graphic design, typography, product design
- **Special**: Unique or temporary collections

## 🖼️ Media Management

### Uploading Images

1. **Navigate**: Click "Media Library" in sidebar
2. **Upload Methods**:
   - **Drag & Drop**: Drag files from your computer to the upload area
   - **Click to Browse**: Click "Choose Files" to select from computer
   - **Bulk Upload**: Select multiple files at once

3. **Image Requirements**:
   - **Formats**: JPG, PNG, GIF, WebP
   - **Size**: Maximum 10MB per file
   - **Dimensions**: Recommended 600x800px for book covers

### Organizing Media Files

#### Folder Structure
- **Books**: Cover images and related photos
- **Collections**: Hero images and banners
- **News**: Article images and gallery photos
- **Users**: Profile pictures and avatars

#### Image Optimization
- Images are automatically optimized for web
- Multiple sizes generated for responsive design
- Original files preserved for high-quality prints

### Best Practices for Images

#### Book Covers
- **Aspect Ratio**: 3:4 (width:height) for consistency
- **Resolution**: At least 300x400 pixels
- **Quality**: High quality, clear, well-lit images
- **Background**: Clean, neutral backgrounds preferred

#### Collection Heroes
- **Aspect Ratio**: 16:9 for banner display
- **Resolution**: At least 1200x675 pixels
- **Content**: Representative of collection theme
- **Text**: Avoid text in images (add as overlay instead)

## 📰 News & Articles

### Creating News Posts

1. **Navigate**: Click "News & Articles" → "New Article"
2. **Article Details**:
   - **Title**: Compelling headline
   - **Excerpt**: Brief summary for previews
   - **Content**: Full article text with rich formatting
   - **Category**: Acquisitions, Exhibitions, Collections, Announcements, Research, Community

3. **Publishing**:
   - **Status**: Draft, Published, or Archived
   - **Publish Date**: Schedule for future publication
   - **Featured**: Highlight on homepage

4. **Media**:
   - **Featured Image**: Main article image
   - **Gallery**: Additional images for article

5. **Relationships**:
   - **Related Books**: Link to relevant books
   - **Related Collections**: Connect to collections

### Article Categories

- **Acquisitions**: New books and materials added to library
- **Exhibitions**: Current and upcoming exhibitions
- **Collections**: Highlights from specific collections
- **Announcements**: Library news and updates
- **Research**: Academic articles and research findings
- **Community**: Events and community engagement

## 👥 User Management

*Note: This section is for administrators only*

### User Roles

- **Admin**: Full system access, can manage users
- **Librarian**: Manage books, collections, and news
- **Curator**: Manage collections and related content
- **Viewer**: Read-only access to admin interface

### Adding New Users

1. **Navigate**: Click "Users" → "Add New User"
2. **User Information**:
   - **Email**: Login credential and contact
   - **Name**: First and last name
   - **Title**: Role in library (Librarian, Curator, etc.)
   - **Role**: System permission level

3. **Permissions**: Fine-grained control over what user can access
4. **Initial Password**: Temporary password for first login

## 🔍 Search & Filtering

### Using Search

1. **Global Search**: Use search bar in top navigation
2. **Advanced Filters**:
   - **Date Range**: Filter by acquisition date or publication year
   - **Category**: Filter by collection category
   - **Status**: Filter by availability status
   - **Tags**: Filter by assigned tags

3. **Saved Searches**: Save frequently used search criteria

### Search Tips

- **Partial Matches**: Search works with partial titles or author names
- **Multiple Terms**: Use spaces to search for multiple keywords
- **Exact Phrases**: Use quotes for exact phrase matching
- **Wildcards**: Use * for wildcard matching

## ⚙️ Settings & Configuration

### General Settings

- **Library Information**: Name, address, contact details
- **Default Status**: Default status for new books
- **Image Settings**: Upload limits and optimization settings
- **Search Configuration**: Search indexing and relevance

### Display Options

- **Homepage Layout**: Configure featured sections
- **Collection Display**: Default sorting and filtering
- **Book Display**: Information shown on book pages
- **Navigation**: Menu structure and organization

## 🆘 Troubleshooting

### Common Issues

#### "Upload Failed" Error
- **Check File Size**: Ensure image is under 10MB
- **Check Format**: Use JPG, PNG, GIF, or WebP
- **Try Different Browser**: Sometimes browser-specific issues
- **Contact Support**: If problem persists

#### "Search Not Working"
- **Clear Browser Cache**: Refresh page completely
- **Check Spelling**: Verify search terms
- **Try Different Keywords**: Use alternative terms
- **Contact Support**: Report search issues

#### "Page Loading Slowly"
- **Check Internet Connection**: Ensure stable connection
- **Try Different Browser**: Test with another browser
- **Clear Cache**: Clear browser cache and cookies
- **Contact Support**: Report performance issues

### Getting Help

#### Support Channels
- **Email**: cms-support@hudsonstreetlibrary.org
- **Phone**: [Support phone number]
- **Hours**: Monday-Friday, 9 AM - 5 PM EST

#### What to Include in Support Requests
- **Description**: What you were trying to do
- **Error Message**: Exact text of any error messages
- **Browser**: Which browser and version you're using
- **Screenshots**: Visual of the issue if helpful

## 📋 Best Practices

### Data Entry Standards

#### Book Information
- **Consistent Formatting**: Use title case for titles
- **Complete ISBN**: Include dashes in ISBN formatting
- **Accurate Dates**: Verify publication years
- **Detailed Descriptions**: Write helpful summaries

#### Collection Management
- **Clear Names**: Use descriptive, intuitive collection names
- **Regular Review**: Periodically review and update collections
- **Logical Organization**: Group related books meaningfully
- **Updated Descriptions**: Keep collection descriptions current

### Workflow Efficiency

#### Daily Tasks
- **Check Dashboard**: Review recent activity and stats
- **Process New Books**: Add new acquisitions promptly
- **Update Status**: Mark books as checked out/returned
- **Review Alerts**: Address any system notifications

#### Weekly Tasks
- **Collection Review**: Check featured collections are current
- **Media Cleanup**: Organize and clean up media library
- **User Activity**: Review user activity logs
- **Content Updates**: Update featured content and news

#### Monthly Tasks
- **System Backup**: Ensure backups are working
- **Performance Review**: Check site performance metrics
- **Content Audit**: Review and update old content
- **User Training**: Provide updates and training as needed

## 🏆 Tips for Success

### Keyboard Shortcuts
- **Ctrl/Cmd + S**: Save current form
- **Ctrl/Cmd + F**: Search on current page
- **Tab**: Navigate between form fields
- **Enter**: Submit forms quickly

### Time-Saving Features
- **Bulk Operations**: Use for repetitive tasks
- **Saved Searches**: Create for frequent queries
- **Bookmarks**: Save frequently used admin pages
- **Templates**: Use for repetitive content

### Quality Control
- **Double-Check Data**: Verify information before saving
- **Preview Changes**: Use preview mode when available
- **Regular Backups**: Ensure important work is saved
- **Test Features**: Try new features in safe environment

---

## 📞 Support Information

**Technical Support**: cms-support@hudsonstreetlibrary.org
**Training Requests**: training@hudsonstreetlibrary.org
**Feature Requests**: features@hudsonstreetlibrary.org

**Emergency Contact**: [Emergency phone number]
**Office Hours**: Monday-Friday, 9 AM - 5 PM EST

---

*This guide covers the essential functions of the Hudson Street Library CMS. For advanced features or specific questions, please contact our support team.*