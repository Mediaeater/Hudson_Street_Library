# Hudson Street Library CMS - Database Schema Design

## Enhanced Data Structure

### Books Table (Enhanced from current CSV)
```sql
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  -- Basic Metadata (from current CSV)
  title VARCHAR(500) NOT NULL,
  author_first VARCHAR(100),
  author_last VARCHAR(100),
  author_display VARCHAR(200), -- Computed field for display
  publisher VARCHAR(200),
  publication_year INTEGER,
  isbn_10 VARCHAR(10),
  isbn_13 VARCHAR(13),
  
  -- Physical Properties
  height_cm DECIMAL(5,2),
  width_cm DECIMAL(5,2),
  depth_cm DECIMAL(5,2),
  weight_grams INTEGER,
  page_count INTEGER,
  binding_type VARCHAR(50),
  
  -- Library Management (NEW)
  status book_status DEFAULT 'available',
  location_shelf VARCHAR(20),
  location_section VARCHAR(50),
  acquisition_date DATE,
  accession_number VARCHAR(50) UNIQUE,
  condition_notes TEXT,
  
  -- Content & Classification
  summary TEXT,
  description TEXT,
  subjects TEXT[], -- Array of subjects
  tags TEXT[], -- Array of tags
  dewey_classification VARCHAR(20),
  lc_classification VARCHAR(50),
  
  -- Digital Assets
  cover_image_url VARCHAR(500),
  additional_images TEXT[], -- Array of image URLs
  pdf_url VARCHAR(500),
  
  -- Relationships
  collection_ids INTEGER[], -- Array of collection IDs
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_checked_out DATE,
  
  -- Search & SEO
  slug VARCHAR(200) UNIQUE,
  meta_description TEXT,
  
  -- Featured flags
  is_featured BOOLEAN DEFAULT FALSE,
  is_staff_pick BOOLEAN DEFAULT FALSE,
  is_new_acquisition BOOLEAN DEFAULT FALSE
);

-- Enum for book status
CREATE TYPE book_status AS ENUM (
  'available',
  'checked_out', 
  'reserved',
  'missing',
  'damaged',
  'repair',
  'deaccessioned'
);
```

### Enhanced Collections System
```sql
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  category collection_category,
  parent_collection_id INTEGER REFERENCES collections(id),
  
  -- Display & Organization
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  color_scheme VARCHAR(20), -- For UI theming
  
  -- Content
  hero_image_url VARCHAR(500),
  curator_notes TEXT,
  
  -- Statistics (auto-computed)
  book_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

CREATE TYPE collection_category AS ENUM (
  'photography',
  'art',
  'fashion',
  'ephemera',
  'music',
  'design',
  'architecture',
  'theory',
  'special'
);
```

### Book-Collection Relationships
```sql
CREATE TABLE book_collections (
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  display_order INTEGER DEFAULT 0,
  PRIMARY KEY (book_id, collection_id)
);
```

### Users & Access Management
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role user_role DEFAULT 'viewer',
  
  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  title VARCHAR(100), -- Curator, Librarian, etc.
  bio TEXT,
  
  -- Permissions
  can_edit_books BOOLEAN DEFAULT FALSE,
  can_edit_collections BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TYPE user_role AS ENUM ('admin', 'librarian', 'curator', 'viewer');
```

### Enhanced News & Content
```sql
CREATE TABLE news_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(300) UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  
  -- Categorization
  category article_category,
  tags TEXT[],
  
  -- Publishing
  status article_status DEFAULT 'draft',
  published_at TIMESTAMP,
  featured BOOLEAN DEFAULT FALSE,
  
  -- Media
  featured_image_url VARCHAR(500),
  gallery_images TEXT[],
  
  -- Relations
  related_books INTEGER[], -- Array of book IDs
  related_collections INTEGER[], -- Array of collection IDs
  
  -- Metadata
  author_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  meta_description TEXT
);

CREATE TYPE article_category AS ENUM (
  'acquisitions',
  'exhibitions', 
  'collections',
  'announcements',
  'research',
  'community'
);

CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
```

### Activity Tracking
```sql
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50), -- 'book', 'collection', 'article'
  entity_id INTEGER,
  action VARCHAR(50), -- 'created', 'updated', 'deleted', 'viewed'
  user_id INTEGER REFERENCES users(id),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```