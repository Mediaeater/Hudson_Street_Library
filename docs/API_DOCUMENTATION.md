# Hudson Street Library CMS - API Documentation

## 🌐 API Overview

The Hudson Street Library CMS provides a RESTful API for managing books, collections, media, and other content. This API powers the admin interface and can be used for integrations with external systems.

**Base URL**: `https://hudsonstreetlibrary.com/admin/api`
**Authentication**: JWT Bearer tokens
**Content Type**: `application/json` (except file uploads)
**Rate Limiting**: 100 requests per minute per IP

## 🔐 Authentication

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "librarian",
    "name": "John Doe"
  },
  "expiresIn": "7d"
}
```

### Using Authentication
Include the JWT token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer {current_token}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

## 📚 Books API

### List Books
```http
GET /books?page=1&limit=25&search=photography&status=available&collection=1&sort=title_asc
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 25, max: 100)
- `search` (string): Search in title, author, publisher
- `status` (string): available, checked_out, reserved, missing, damaged, repair
- `collection` (integer): Filter by collection ID
- `sort` (string): title_asc, title_desc, author_asc, author_desc, date_desc, date_asc

**Response:**
```json
{
  "books": [
    {
      "id": 1,
      "title": "Fashion Photography Now",
      "author_first": "Susan",
      "author_last": "Bright",
      "author_display": "Susan Bright",
      "publisher": "Thames & Hudson",
      "publication_year": 2007,
      "isbn": "9780500543726",
      "status": "available",
      "location_shelf": "A1",
      "location_section": "Photography",
      "cover_image_url": "/assets/images/books/fashion-photography-now.jpg",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "collection_ids": [1, 3]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 150,
    "pages": 6
  },
  "stats": {
    "available": 120,
    "checked_out": 15,
    "reserved": 8,
    "issues": 7
  }
}
```

### Get Book by ID
```http
GET /books/{id}
```

**Response:**
```json
{
  "id": 1,
  "title": "Fashion Photography Now",
  "author_first": "Susan",
  "author_last": "Bright",
  "publisher": "Thames & Hudson",
  "publication_year": 2007,
  "isbn_13": "9780500543726",
  "height_cm": 24.5,
  "width_cm": 19.2,
  "depth_cm": 2.1,
  "page_count": 240,
  "binding_type": "paperback",
  "status": "available",
  "location_shelf": "A1",
  "location_section": "Photography",
  "accession_number": "HSL-2024-001",
  "acquisition_date": "2024-01-15",
  "price_paid": 29.95,
  "summary": "A comprehensive overview of contemporary fashion photography.",
  "description": "This book showcases the work of 60 fashion photographers...",
  "tags": ["fashion", "photography", "contemporary"],
  "subjects": ["Photography", "Fashion"],
  "cover_image_url": "/assets/images/books/fashion-photography-now.jpg",
  "slug": "fashion-photography-now",
  "is_featured": false,
  "is_staff_pick": true,
  "is_new_acquisition": false,
  "collections": [
    {
      "id": 1,
      "name": "Fashion Photography",
      "slug": "fashion-photography"
    },
    {
      "id": 3,
      "name": "Staff Picks",
      "slug": "staff-picks"
    }
  ],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

### Create Book
```http
POST /books
Content-Type: multipart/form-data
Authorization: Bearer {token}

{
  "title": "New Photography Book",
  "author_first": "John",
  "author_last": "Smith",
  "publisher": "Photo Press",
  "publication_year": 2024,
  "isbn": "9781234567890",
  "status": "available",
  "location_shelf": "B2",
  "summary": "An amazing new photography book",
  "tags": "photography,art,modern",
  "collections": [1, 2],
  "is_featured": true,
  "cover_image": {file}
}
```

**Response:**
```json
{
  "id": 152,
  "message": "Book created successfully",
  "slug": "new-photography-book"
}
```

### Update Book
```http
PUT /books/{id}
Content-Type: multipart/form-data
Authorization: Bearer {token}

{
  "title": "Updated Book Title",
  "status": "checked_out",
  "cover_image": {file}
}
```

**Response:**
```json
{
  "id": 152,
  "message": "Book updated successfully"
}
```

### Delete Book
```http
DELETE /books/{id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "Book deleted successfully"
}
```

## 📁 Collections API

### List Collections
```http
GET /collections?page=1&limit=12&search=photography&category=photography&visibility=public&featured=true&sort=name_asc
```

**Query Parameters:**
- `page` (integer): Page number
- `limit` (integer): Items per page
- `search` (string): Search in name and description
- `category` (string): photography, art, fashion, ephemera, design, special
- `visibility` (string): public, private
- `featured` (boolean): true/false
- `sort` (string): name_asc, name_desc, books_desc, books_asc, date_desc, date_asc

**Response:**
```json
{
  "collections": [
    {
      "id": 1,
      "name": "Fashion Photography",
      "slug": "fashion-photography",
      "description": "A curated collection of fashion photography books",
      "category": "photography",
      "is_featured": true,
      "is_public": true,
      "color_scheme": "blue",
      "hero_image_url": "/assets/images/collections/fashion-hero.jpg",
      "book_count": 45,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 8,
    "pages": 1
  }
}
```

### Get Collection Statistics
```http
GET /collections/stats
```

**Response:**
```json
{
  "total": 8,
  "by_category": {
    "photography": 3,
    "art": 2,
    "fashion": 2,
    "ephemera": 1
  },
  "featured": 4
}
```

### Get Collection by ID
```http
GET /collections/{id}
```

**Response:**
```json
{
  "id": 1,
  "name": "Fashion Photography",
  "slug": "fashion-photography",
  "description": "A curated collection of fashion photography books",
  "category": "photography",
  "parent_collection_id": null,
  "display_order": 1,
  "is_featured": true,
  "is_public": true,
  "color_scheme": "blue",
  "hero_image_url": "/assets/images/collections/fashion-hero.jpg",
  "curator_notes": "This collection showcases the evolution of fashion photography...",
  "book_count": 45,
  "creator_name": "Jane Curator",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z",
  "books": [
    {
      "id": 1,
      "title": "Fashion Photography Now",
      "author_first": "Susan",
      "author_last": "Bright",
      "cover_image_url": "/assets/images/books/fashion-photography-now.jpg",
      "display_order": 1
    }
  ]
}
```

### Create Collection
```http
POST /collections
Content-Type: multipart/form-data
Authorization: Bearer {token}

{
  "name": "Street Photography",
  "description": "Urban photography and street art",
  "category": "photography",
  "is_featured": true,
  "is_public": true,
  "color_scheme": "gray",
  "curator_notes": "A collection exploring urban environments",
  "hero_image": {file}
}
```

**Response:**
```json
{
  "id": 9,
  "message": "Collection created successfully",
  "slug": "street-photography"
}
```

### Update Collection
```http
PUT /collections/{id}
Content-Type: multipart/form-data
Authorization: Bearer {token}

{
  "name": "Updated Collection Name",
  "is_featured": false,
  "hero_image": {file}
}
```

### Delete Collection
```http
DELETE /collections/{id}
Authorization: Bearer {token}
```

### Add Books to Collection
```http
POST /collections/{id}/books
Content-Type: application/json
Authorization: Bearer {token}

{
  "bookIds": [1, 2, 3, 4]
}
```

### Remove Book from Collection
```http
DELETE /collections/{id}/books/{bookId}
Authorization: Bearer {token}
```

## 📊 Dashboard API

### Get Dashboard Statistics
```http
GET /dashboard/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total_books": 150,
  "available": 120,
  "checked_out": 15,
  "reserved": 8,
  "issues": 7,
  "books_added_this_month": 12,
  "total_collections": 8,
  "featured_collections": 4,
  "by_category": {
    "photography": 45,
    "art": 38,
    "fashion": 32,
    "ephemera": 20,
    "design": 15
  },
  "storage_used": 45,
  "last_backup": "Today"
}
```

### Get Recent Activity
```http
GET /activity/recent?limit=10
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "entity_type": "book",
    "entity_id": 1,
    "action": "updated",
    "entity_name": "Fashion Photography Now",
    "created_at": "2024-01-15T14:30:00Z"
  },
  {
    "entity_type": "collection",
    "entity_id": 2,
    "action": "created",
    "entity_name": "Street Photography",
    "created_at": "2024-01-15T13:15:00Z"
  }
]
```

## 📰 News API

### List Articles
```http
GET /news?page=1&limit=10&status=published&category=acquisitions&featured=true
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: draft, published, archived
- `category`: acquisitions, exhibitions, collections, announcements, research, community
- `featured`: true/false

### Get Article by ID
```http
GET /news/{id}
```

### Create Article
```http
POST /news
Content-Type: multipart/form-data
Authorization: Bearer {token}

{
  "title": "New Books Added to Photography Collection",
  "excerpt": "We've added 15 new photography books...",
  "content": "Full article content here...",
  "category": "acquisitions",
  "status": "published",
  "featured": true,
  "featured_image": {file},
  "related_books": [1, 2, 3],
  "related_collections": [1]
}
```

### Update Article
```http
PUT /news/{id}
```

### Delete Article
```http
DELETE /news/{id}
Authorization: Bearer {token}
```

## 🖼️ Media API

### Upload Files
```http
POST /media/upload
Content-Type: multipart/form-data
Authorization: Bearer {token}

{
  "files": [{file1}, {file2}],
  "folder": "books"
}
```

**Response:**
```json
{
  "uploaded": [
    {
      "filename": "book-cover-001.jpg",
      "url": "/assets/images/books/book-cover-001.jpg",
      "size": 245760,
      "type": "image/jpeg"
    }
  ],
  "errors": []
}
```

### List Media Files
```http
GET /media?folder=books&type=image&page=1&limit=20
```

### Delete Media File
```http
DELETE /media/{filename}
Authorization: Bearer {token}
```

## 👥 Users API

*Admin access only*

### List Users
```http
GET /users?role=librarian&active=true
Authorization: Bearer {admin_token}
```

### Create User
```http
POST /users
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "email": "newuser@example.com",
  "first_name": "Jane",
  "last_name": "Librarian",
  "role": "librarian",
  "can_edit_books": true,
  "can_edit_collections": true
}
```

### Update User
```http
PUT /users/{id}
Authorization: Bearer {admin_token}
```

### Delete User
```http
DELETE /users/{id}
Authorization: Bearer {admin_token}
```

## 🔍 Search API

### Global Search
```http
GET /search?q=photography&type=books&limit=10
```

**Query Parameters:**
- `q` (string): Search query
- `type` (string): books, collections, news, all
- `limit` (integer): Max results to return

**Response:**
```json
{
  "results": {
    "books": [
      {
        "id": 1,
        "title": "Fashion Photography Now",
        "type": "book",
        "relevance": 0.95
      }
    ],
    "collections": [
      {
        "id": 1,
        "name": "Photography Collection",
        "type": "collection",
        "relevance": 0.87
      }
    ]
  },
  "total": 15,
  "query": "photography"
}
```

## ⚙️ System API

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T15:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### System Information
```http
GET /system/info
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "version": "1.0.0",
  "environment": "production",
  "database": {
    "type": "PostgreSQL",
    "version": "15.3"
  },
  "storage": {
    "used": "2.3GB",
    "available": "47.7GB",
    "total": "50GB"
  },
  "backup": {
    "last_backup": "2024-01-15T02:00:00Z",
    "status": "success"
  }
}
```

## 📈 Analytics API

### Usage Statistics
```http
GET /analytics/usage?period=30d
Authorization: Bearer {token}
```

**Response:**
```json
{
  "period": "30d",
  "books_added": 25,
  "collections_created": 3,
  "total_views": 1250,
  "most_viewed_books": [
    {
      "id": 1,
      "title": "Fashion Photography Now",
      "views": 45
    }
  ],
  "popular_searches": [
    {
      "query": "fashion",
      "count": 123
    }
  ]
}
```

## ❌ Error Handling

### Error Response Format
```json
{
  "error": "Validation failed",
  "message": "Title is required",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "title",
    "value": "",
    "constraint": "required"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `413` - Payload Too Large (file upload)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_REQUIRED` - No valid token provided
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_ENTRY` - Resource already exists
- `FILE_TOO_LARGE` - Uploaded file exceeds size limit
- `UNSUPPORTED_FILE_TYPE` - File type not allowed
- `RATE_LIMIT_EXCEEDED` - Too many requests

## 📚 SDK Examples

### JavaScript/Node.js
```javascript
const api = new HudsonLibraryAPI({
  baseURL: 'https://hudsonstreetlibrary.com/admin/api',
  token: 'your-jwt-token'
});

// Get books
const books = await api.books.list({
  search: 'photography',
  limit: 10
});

// Create book
const newBook = await api.books.create({
  title: 'New Photography Book',
  author_first: 'John',
  author_last: 'Smith',
  status: 'available'
});

// Upload cover image
const coverImage = await api.media.upload(file, 'books');
await api.books.update(newBook.id, {
  cover_image_url: coverImage.url
});
```

### Python
```python
from hudson_library_api import HudsonLibraryAPI

api = HudsonLibraryAPI(
    base_url='https://hudsonstreetlibrary.com/admin/api',
    token='your-jwt-token'
)

# Get books
books = api.books.list(search='photography', limit=10)

# Create collection
collection = api.collections.create({
    'name': 'Street Photography',
    'category': 'photography',
    'description': 'Urban photography collection'
})
```

## 🚀 Rate Limiting

### Limits
- **Standard**: 100 requests per minute per IP
- **Authenticated**: 300 requests per minute per user
- **Admin**: 1000 requests per minute per admin user

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642275600
```

### Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 60 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## 🔐 Security

### Authentication
- JWT tokens expire after 7 days
- Refresh tokens available for seamless renewal
- Secure httpOnly cookies for web interface

### Authorization
- Role-based access control (RBAC)
- Fine-grained permissions
- Resource-level access control

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens for state-changing operations

---

## 📞 Support

**API Support**: api-support@hudsonstreetlibrary.com
**Documentation Issues**: docs@hudsonstreetlibrary.com
**Rate Limit Increases**: api-limits@hudsonstreetlibrary.com

---

*This API documentation covers all available endpoints for the Hudson Street Library CMS. For additional examples or specific use cases, please contact our support team.*