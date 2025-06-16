# Hudson Street Library - AI/LLM Coding Service Guide

## System Architecture Overview

The Hudson Street Library book workflow system is a comprehensive full-stack application with the following architectural components:

### Frontend Architecture
- **Framework**: Vanilla JavaScript with Tailwind CSS
- **Build System**: Eleventy (11ty) static site generator
- **Components**: Nunjucks templating with reusable components
- **State Management**: Class-based JavaScript with localStorage persistence
- **Image Processing**: Client-side with Sharp.js integration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with connection pooling
- **API Design**: RESTful endpoints with rate limiting
- **Authentication**: Bearer token-based (placeholder implementation)
- **File Upload**: Multipart form handling with 10MB limits

## Core Classes and Components

### 1. BookWorkflow Class (`/src/assets/js/book-workflow.js`)

**Primary Responsibilities:**
- Manages 4-step workflow progression
- Handles form validation and auto-save
- Integrates with external APIs (ISBN lookup)
- Processes image uploads and transformations

**Key Methods:**
```javascript
class BookWorkflow {
    constructor()                    // Initialize workflow state
    nextStep()                      // Progress to next workflow step
    previousStep()                  // Return to previous step
    handleImageUpload(files)        // Process uploaded images
    detectCategory(title, desc)     // AI-powered category detection
    fetchCollectionSuggestions()    // Get relevant collections
    autoSave()                      // Persist draft data
    publishBook()                   // Finalize and save book
}
```

**State Properties:**
- `currentStep`: Integer (1-4) tracking workflow position
- `bookData`: Object containing all form data
- `uploadedImages`: Array of processed image objects
- `selectedCollections`: Array of collection IDs
- `autoSaveTimer`: Interval for periodic saves

### 2. BatchOperations Class (`/src/assets/js/batch-operations.js`)

**Primary Responsibilities:**
- CSV import with validation and parsing
- ISBN batch lookup with external API integration
- Manual bulk entry with form management

**Key Methods:**
```javascript
class BatchOperations {
    handleCSVFile(file)             // Parse and validate CSV
    validateISBNList()              // Verify ISBN format/existence
    fetchISBNDetails()              // Bulk lookup book metadata
    addManualBookRow()              // Dynamic form row creation
    applyBulkSettings()             // Mass-apply common values
}
```

**Data Structures:**
- `csvData[]`: Parsed CSV rows as objects
- `validatedISBNs[]`: Valid ISBN strings
- `manualBooks[]`: Manual entry form data

## API Endpoints

### Core Book Management
```
POST   /admin/api/books                    // Create new book
GET    /admin/api/books/:id               // Get book details
PUT    /admin/api/books/:id               // Update book
DELETE /admin/api/books/:id               // Delete book
GET    /admin/api/books                   // List books with pagination
```

### Workflow-Specific Endpoints
```
POST   /admin/api/books/lookup/isbn/:isbn          // ISBN metadata lookup
POST   /admin/api/books/detect-category            // AI category detection
GET    /admin/api/books/collections/suggest        // Collection recommendations
POST   /admin/api/books/validate-csv               // CSV data validation
POST   /admin/api/books/validate-isbns             // ISBN format validation
```

### Batch Operations
```
POST   /admin/api/books/batch/csv                  // CSV import processing
POST   /admin/api/books/batch/isbn                 // ISBN batch processing
POST   /admin/api/books/batch/manual               // Manual entry processing
```

### Image Processing
```
POST   /admin/api/books/:id/images                 // Upload book images
DELETE /admin/api/books/:id/images/:imageId        // Remove image
PUT    /admin/api/books/:id/images/:imageId        // Update image metadata
```

## Database Schema

### Core Tables

**books**
```sql
id                  SERIAL PRIMARY KEY
title               VARCHAR(500) NOT NULL
author_first        VARCHAR(255)
author_last         VARCHAR(255)
publisher           VARCHAR(255)
publication_year    INTEGER
isbn                VARCHAR(20) UNIQUE
status              VARCHAR(50) NOT NULL
location_shelf      VARCHAR(50)
location_section    VARCHAR(100)
summary             TEXT
description         TEXT
tags                TEXT[]
subjects            TEXT[]
cover_image_url     VARCHAR(500)
created_at          TIMESTAMP DEFAULT NOW()
updated_at          TIMESTAMP DEFAULT NOW()
```

**collections**
```sql
id                  SERIAL PRIMARY KEY
name                VARCHAR(255) NOT NULL
description         TEXT
category            VARCHAR(100)
is_featured         BOOLEAN DEFAULT FALSE
created_at          TIMESTAMP DEFAULT NOW()
```

**book_collections**
```sql
book_id             INTEGER REFERENCES books(id)
collection_id       INTEGER REFERENCES collections(id)
added_at           TIMESTAMP DEFAULT NOW()
PRIMARY KEY (book_id, collection_id)
```

**activity_log**
```sql
id                  SERIAL PRIMARY KEY
entity_type         VARCHAR(50) NOT NULL
entity_id           INTEGER NOT NULL
action              VARCHAR(100) NOT NULL
details             JSONB
created_at          TIMESTAMP DEFAULT NOW()
```

## External API Integrations

### Google Books API
- **Endpoint**: `https://www.googleapis.com/books/v1/volumes`
- **Purpose**: ISBN lookup for book metadata
- **Response**: Title, authors, publisher, description, cover image
- **Rate Limit**: 1000 requests per day (free tier)

### Open Library API
- **Endpoint**: `https://openlibrary.org/api/books`
- **Purpose**: Fallback ISBN lookup
- **Response**: Basic book metadata
- **Rate Limit**: No explicit limits, respectful usage

### AI Category Detection
- **Implementation**: Content analysis of title/description
- **Algorithm**: Keyword matching with weighted scoring
- **Categories**: Photography, Art, Fashion, Ephemera, Design, Special
- **Confidence**: Percentage-based relevance scoring

## File Structure and Organization

```
src/
├── admin/books/new.html                    # Main workflow page
├── assets/
│   ├── js/
│   │   ├── book-workflow.js               # Core workflow logic
│   │   └── batch-operations.js            # Batch processing
│   └── css/
│       └── admin.css                      # Workflow styling
├── _includes/components/
│   └── batch-upload.njk                   # Reusable batch components
└── _data/
    └── collections.json                    # Collection definitions

cms/
├── server.js                              # Express server entry
├── api/
│   ├── books.js                          # Standard CRUD operations
│   └── books-workflow.js                 # Workflow-specific endpoints
└── package.json                          # Dependencies and scripts

docs/
├── BOOK_WORKFLOW_GUIDE.md                # Human-readable documentation
└── AI_CODING_GUIDE.md                    # This technical guide
```

## Development Patterns

### Error Handling
```javascript
// Consistent error response format
{
    error: "Human-readable error message",
    code: "SPECIFIC_ERROR_CODE",
    details: { /* Additional context */ }
}

// Client-side error handling
try {
    const response = await fetch('/admin/api/books', options);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }
    const data = await response.json();
} catch (error) {
    showToast(error.message, 'error');
    console.error('Operation failed:', error);
}
```

### Form Validation
```javascript
// Real-time validation with visual feedback
validateField(fieldName, value) {
    const rules = this.validationRules[fieldName];
    const errors = [];
    
    if (rules.required && !value) {
        errors.push('This field is required');
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Maximum ${rules.maxLength} characters`);
    }
    
    this.displayFieldErrors(fieldName, errors);
    return errors.length === 0;
}
```

### Auto-save Implementation
```javascript
// Debounced auto-save every 30 seconds
autoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
        this.saveDraft();
    }, 30000);
}

saveDraft() {
    const draftData = {
        bookData: this.bookData,
        currentStep: this.currentStep,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem('book_draft', JSON.stringify(draftData));
}
```

## Integration Points

### Adding New Workflow Steps
1. Update `BookWorkflow.totalSteps` constant
2. Add step HTML to `new.html`
3. Implement step validation in `validateStep()`
4. Add navigation logic in `nextStep()`/`previousStep()`
5. Update progress indicator calculations

### Extending Batch Operations
1. Create new template in `batch-upload.njk`
2. Add corresponding class methods in `BatchOperations`
3. Implement API endpoint in `books-workflow.js`
4. Add validation and error handling
5. Update UI components and styling

### Custom Collection Categories
1. Define category in collections table
2. Add CSS styling in `admin.css`
3. Update category detection algorithm
4. Add to collection suggestion logic
5. Include in filtering and display components

## Performance Considerations

### Image Processing
- **Client-side**: Image resizing and optimization before upload
- **Server-side**: Sharp.js for format conversion and compression
- **Storage**: Optimized file paths with CDN consideration
- **Lazy Loading**: Implement for gallery views

### Database Optimization
- **Indexing**: ISBN, title, status, created_at columns
- **Pagination**: Limit queries to 50 items per request
- **Connection Pooling**: PostgreSQL pool with 10 max connections
- **Query Optimization**: Use prepared statements and JOIN queries

### API Rate Limiting
- **External APIs**: Implement exponential backoff
- **Internal APIs**: Rate limiting per IP address
- **Batch Operations**: Process in chunks of 10 items
- **Caching**: Cache ISBN lookups for 24 hours

## Security Implementation

### Input Validation
- **SQL Injection**: Parameterized queries only
- **XSS Prevention**: Sanitize all user inputs
- **File Upload**: Validate file types and sizes
- **ISBN Validation**: Format checking before API calls

### Authentication & Authorization
- **Bearer Tokens**: Include in all API requests
- **Session Management**: Server-side session validation
- **CSRF Protection**: Include CSRF tokens in forms
- **Permission Levels**: Admin/editor role distinction

## Testing Strategy

### Unit Tests
```javascript
// Example test structure
describe('BookWorkflow', () => {
    it('should validate required fields', () => {
        const workflow = new BookWorkflow();
        expect(workflow.validateStep(1)).toBe(false);
        workflow.bookData.title = 'Test Book';
        workflow.bookData.status = 'available';
        expect(workflow.validateStep(1)).toBe(true);
    });
});
```

### Integration Tests
```javascript
// API endpoint testing
describe('POST /admin/api/books', () => {
    it('should create book with valid data', async () => {
        const response = await request(app)
            .post('/admin/api/books')
            .send(validBookData)
            .expect(201);
        expect(response.body.id).toBeDefined();
    });
});
```

### End-to-End Tests
- Workflow completion scenarios
- Batch import operations
- Image upload and processing
- Error handling and recovery

## Deployment Configuration

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hudson_library
DB_USER=postgres
DB_PASSWORD=your_password

# External APIs
GOOGLE_BOOKS_API_KEY=your_key
OPENAI_API_KEY=your_key  # For category detection

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://hudsonstreetlibrary.org
```

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Monitoring and Logging

### Error Tracking
- **Server Errors**: Winston logging with file rotation
- **Client Errors**: Sentry integration for frontend
- **API Monitoring**: Response time and error rate tracking
- **Database**: Query performance monitoring

### Analytics
- **Workflow Completion**: Track step abandonment rates
- **Performance Metrics**: Image upload times, API response times
- **Usage Patterns**: Most common batch operations
- **User Behavior**: Feature adoption rates

## Migration and Upgrades

### Database Migrations
```sql
-- Example migration file
-- migrations/001_create_books_table.sql
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    -- ... other columns
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn ON books(isbn);
```

### Backup Strategy
- **Database**: Daily automated PostgreSQL dumps
- **Images**: S3 backup with versioning
- **Code**: Git repository with tagged releases
- **Configuration**: Environment variable documentation

---

This technical guide provides AI coding assistants with the necessary information to understand, modify, and extend the Hudson Street Library book workflow system. The architecture prioritizes maintainability, scalability, and user experience while providing comprehensive functionality for library management.