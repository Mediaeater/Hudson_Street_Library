/**
 * Books API Handler for Hudson Street Library CMS
 * Handles CRUD operations for books with PostgreSQL backend
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const slugify = require('slugify');
const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../src/assets/images/books');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'book-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = allowedTypes.test(file.mimetype);
        
        if (mimeType && extName) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

/**
 * GET /admin/api/books
 * List books with filtering, searching, and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 25,
            search,
            status,
            collection,
            sort = 'title_asc'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (search) {
            whereConditions.push(`(
                title ILIKE $${paramIndex} OR 
                author_first ILIKE $${paramIndex} OR 
                author_last ILIKE $${paramIndex} OR 
                publisher ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (collection) {
            whereConditions.push(`$${paramIndex} = ANY(collection_ids)`);
            queryParams.push(parseInt(collection));
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Build ORDER clause
        const sortMap = {
            'title_asc': 'title ASC',
            'title_desc': 'title DESC',
            'author_asc': 'author_last ASC, author_first ASC',
            'author_desc': 'author_last DESC, author_first DESC',
            'date_desc': 'created_at DESC',
            'date_asc': 'created_at ASC'
        };
        const orderClause = `ORDER BY ${sortMap[sort] || 'title ASC'}`;

        // Main query
        const query = `
            SELECT 
                id, title, author_first, author_last,
                CONCAT(author_first, ' ', author_last) as author_display,
                publisher, publication_year, isbn_13 as isbn,
                status, location_shelf, location_section,
                cover_image_url, created_at, updated_at,
                collection_ids
            FROM books 
            ${whereClause}
            ${orderClause}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        const books = await db.query(query, queryParams);

        // Count query for pagination
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM books 
            ${whereClause}
        `;
        const countParams = queryParams.slice(0, -2); // Remove limit and offset
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        // Stats query
        const statsQuery = `
            SELECT 
                status,
                COUNT(*) as count
            FROM books
            GROUP BY status
        `;
        const statsResult = await db.query(statsQuery);
        const stats = statsResult.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
        }, {});

        // Calculate issues (missing + damaged + repair)
        stats.issues = (stats.missing || 0) + (stats.damaged || 0) + (stats.repair || 0);

        res.json({
            books: books.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            stats
        });

    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /admin/api/books/:id
 * Get a single book by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT b.*, 
                   array_agg(
                       json_build_object(
                           'id', c.id,
                           'name', c.name,
                           'slug', c.slug
                       )
                   ) FILTER (WHERE c.id IS NOT NULL) as collections
            FROM books b
            LEFT JOIN book_collections bc ON b.id = bc.book_id
            LEFT JOIN collections c ON bc.collection_id = c.id
            WHERE b.id = $1
            GROUP BY b.id
        `;

        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Error fetching book:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /admin/api/books
 * Create a new book
 */
router.post('/', upload.single('cover_image'), async (req, res) => {
    try {
        const bookData = req.body;
        
        // Generate slug from title
        const slug = slugify(bookData.title, { 
            lower: true, 
            strict: true,
            remove: /[*+~.()'"!:@]/g 
        });

        // Handle file upload
        let coverImageUrl = bookData.cover_image_url || null;
        if (req.file) {
            // Process uploaded image
            const processedImage = await processBookCover(req.file);
            coverImageUrl = processedImage.url;
        }

        // Parse arrays
        const tags = bookData.tags ? bookData.tags.split(',').map(t => t.trim()) : [];
        const subjects = bookData.subjects ? bookData.subjects.split(',').map(s => s.trim()) : [];
        const collections = bookData.collections ? 
            (Array.isArray(bookData.collections) ? bookData.collections : [bookData.collections]) : [];

        // Insert book
        const insertQuery = `
            INSERT INTO books (
                title, author_first, author_last, publisher, publication_year,
                isbn_13, height_cm, width_cm, depth_cm, page_count, binding_type,
                status, location_shelf, location_section, accession_number,
                acquisition_date, price_paid, summary, description,
                tags, subjects, cover_image_url, slug,
                is_featured, is_staff_pick, is_new_acquisition
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19,
                $20, $21, $22, $23, $24, $25, $26
            ) RETURNING id
        `;

        const values = [
            bookData.title,
            bookData.author_first || null,
            bookData.author_last || null,
            bookData.publisher || null,
            bookData.publication_year ? parseInt(bookData.publication_year) : null,
            bookData.isbn || null,
            bookData.height_cm ? parseFloat(bookData.height_cm) : null,
            bookData.width_cm ? parseFloat(bookData.width_cm) : null,
            bookData.depth_cm ? parseFloat(bookData.depth_cm) : null,
            bookData.page_count ? parseInt(bookData.page_count) : null,
            bookData.binding_type || null,
            bookData.status || 'available',
            bookData.location_shelf || null,
            bookData.location_section || null,
            bookData.accession_number || null,
            bookData.acquisition_date || null,
            bookData.price_paid ? parseFloat(bookData.price_paid) : null,
            bookData.summary || null,
            bookData.description || null,
            tags,
            subjects,
            coverImageUrl,
            slug,
            bookData.is_featured === '1',
            bookData.is_staff_pick === '1',
            bookData.is_new_acquisition === '1'
        ];

        const result = await db.query(insertQuery, values);
        const bookId = result.rows[0].id;

        // Add to collections
        if (collections.length > 0) {
            await addBookToCollections(bookId, collections);
        }

        // Generate book page
        await generateBookPage(bookId);

        // Update collection counts
        await updateCollectionCounts(collections);

        // Generate news item if new acquisition
        if (bookData.is_new_acquisition === '1') {
            await generateAcquisitionNews(bookId);
        }

        res.status(201).json({ 
            id: bookId, 
            message: 'Book created successfully',
            slug: slug 
        });

    } catch (error) {
        console.error('Error creating book:', error);
        
        // Clean up uploaded file if error occurred
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /admin/api/books/:id
 * Update an existing book
 */
router.put('/:id', upload.single('cover_image'), async (req, res) => {
    try {
        const { id } = req.params;
        const bookData = req.body;

        // Check if book exists
        const existingBook = await db.query('SELECT * FROM books WHERE id = $1', [id]);
        if (existingBook.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const currentBook = existingBook.rows[0];

        // Handle file upload
        let coverImageUrl = bookData.cover_image_url || currentBook.cover_image_url;
        if (req.file) {
            const processedImage = await processBookCover(req.file);
            coverImageUrl = processedImage.url;
            
            // Delete old image if it exists and is not a default
            if (currentBook.cover_image_url && 
                !currentBook.cover_image_url.includes('placeholder')) {
                await deleteOldImage(currentBook.cover_image_url);
            }
        }

        // Parse arrays
        const tags = bookData.tags ? bookData.tags.split(',').map(t => t.trim()) : [];
        const subjects = bookData.subjects ? bookData.subjects.split(',').map(s => s.trim()) : [];
        const collections = bookData.collections ? 
            (Array.isArray(bookData.collections) ? bookData.collections : [bookData.collections]) : [];

        // Update book
        const updateQuery = `
            UPDATE books SET
                title = $1, author_first = $2, author_last = $3,
                publisher = $4, publication_year = $5, isbn_13 = $6,
                height_cm = $7, width_cm = $8, depth_cm = $9,
                page_count = $10, binding_type = $11, status = $12,
                location_shelf = $13, location_section = $14,
                accession_number = $15, acquisition_date = $16,
                price_paid = $17, summary = $18, description = $19,
                tags = $20, subjects = $21, cover_image_url = $22,
                is_featured = $23, is_staff_pick = $24,
                is_new_acquisition = $25, updated_at = NOW()
            WHERE id = $26
        `;

        const values = [
            bookData.title,
            bookData.author_first || null,
            bookData.author_last || null,
            bookData.publisher || null,
            bookData.publication_year ? parseInt(bookData.publication_year) : null,
            bookData.isbn || null,
            bookData.height_cm ? parseFloat(bookData.height_cm) : null,
            bookData.width_cm ? parseFloat(bookData.width_cm) : null,
            bookData.depth_cm ? parseFloat(bookData.depth_cm) : null,
            bookData.page_count ? parseInt(bookData.page_count) : null,
            bookData.binding_type || null,
            bookData.status || 'available',
            bookData.location_shelf || null,
            bookData.location_section || null,
            bookData.accession_number || null,
            bookData.acquisition_date || null,
            bookData.price_paid ? parseFloat(bookData.price_paid) : null,
            bookData.summary || null,
            bookData.description || null,
            tags,
            subjects,
            coverImageUrl,
            bookData.is_featured === '1',
            bookData.is_staff_pick === '1',
            bookData.is_new_acquisition === '1',
            id
        ];

        await db.query(updateQuery, values);

        // Update collections
        await db.query('DELETE FROM book_collections WHERE book_id = $1', [id]);
        if (collections.length > 0) {
            await addBookToCollections(id, collections);
        }

        // Regenerate book page
        await generateBookPage(id);

        // Update collection counts
        await updateAllCollectionCounts();

        res.json({ 
            id: parseInt(id), 
            message: 'Book updated successfully' 
        });

    } catch (error) {
        console.error('Error updating book:', error);
        
        // Clean up uploaded file if error occurred
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /admin/api/books/:id
 * Delete a book
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get book info before deletion
        const bookResult = await db.query('SELECT cover_image_url FROM books WHERE id = $1', [id]);
        if (bookResult.rows.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const book = bookResult.rows[0];

        // Delete from collections
        await db.query('DELETE FROM book_collections WHERE book_id = $1', [id]);

        // Delete book
        await db.query('DELETE FROM books WHERE id = $1', [id]);

        // Delete cover image if it exists
        if (book.cover_image_url && !book.cover_image_url.includes('placeholder')) {
            await deleteOldImage(book.cover_image_url);
        }

        // Delete book page
        await deleteBookPage(id);

        // Update collection counts
        await updateAllCollectionCounts();

        res.json({ message: 'Book deleted successfully' });

    } catch (error) {
        console.error('Error deleting book:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Helper Functions
 */

// Process uploaded book cover
async function processBookCover(file) {
    try {
        const filename = path.parse(file.filename).name;
        const outputPath = path.join(path.dirname(file.path), `${filename}-processed.jpg`);
        
        // Resize and optimize image
        await sharp(file.path)
            .resize(600, 800, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 85 })
            .toFile(outputPath);

        // Delete original
        await fs.unlink(file.path);

        return {
            url: `/assets/images/books/${filename}-processed.jpg`,
            path: outputPath
        };
    } catch (error) {
        console.error('Error processing book cover:', error);
        throw error;
    }
}

// Add book to collections
async function addBookToCollections(bookId, collectionIds) {
    if (collectionIds.length === 0) return;

    const values = collectionIds.map((collectionId, index) => 
        `($1, $${index + 2})`
    ).join(', ');

    const query = `
        INSERT INTO book_collections (book_id, collection_id)
        VALUES ${values}
    `;

    await db.query(query, [bookId, ...collectionIds]);
}

// Update collection counts
async function updateCollectionCounts(collectionIds) {
    for (const collectionId of collectionIds) {
        await db.query(`
            UPDATE collections 
            SET book_count = (
                SELECT COUNT(*) 
                FROM book_collections 
                WHERE collection_id = $1
            )
            WHERE id = $1
        `, [collectionId]);
    }
}

// Update all collection counts
async function updateAllCollectionCounts() {
    await db.query(`
        UPDATE collections 
        SET book_count = (
            SELECT COUNT(*) 
            FROM book_collections 
            WHERE collection_id = collections.id
        )
    `);
}

// Generate book page (integrate with existing Eleventy build)
async function generateBookPage(bookId) {
    // This would trigger Eleventy to regenerate the book page
    // Implementation depends on your build setup
    console.log(`Generating page for book ${bookId}`);
}

// Delete book page
async function deleteBookPage(bookId) {
    // Implementation to remove book page from build
    console.log(`Deleting page for book ${bookId}`);
}

// Generate acquisition news
async function generateAcquisitionNews(bookId) {
    // Integration with news pipeline
    console.log(`Generating news for book ${bookId}`);
}

// Delete old image file
async function deleteOldImage(imageUrl) {
    try {
        const imagePath = path.join(__dirname, '../../src', imageUrl);
        await fs.unlink(imagePath);
    } catch (error) {
        console.error('Error deleting old image:', error);
    }
}

module.exports = router;