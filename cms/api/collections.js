/**
 * Collections API Handler for Hudson Street Library CMS
 * Handles CRUD operations for collections with PostgreSQL backend
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const slugify = require('slugify');
const router = express.Router();

// Multer configuration for hero image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../src/assets/images/collections');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'collection-' + uniqueSuffix + path.extname(file.originalname));
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
 * GET /admin/api/collections
 * List collections with filtering, searching, and pagination
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search,
            category,
            visibility,
            featured,
            sort = 'name_asc'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];
        let paramIndex = 1;

        if (search) {
            whereConditions.push(`(
                name ILIKE $${paramIndex} OR 
                description ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }

        if (category) {
            whereConditions.push(`category = $${paramIndex}`);
            queryParams.push(category);
            paramIndex++;
        }

        if (visibility === 'public') {
            whereConditions.push(`is_public = true`);
        } else if (visibility === 'private') {
            whereConditions.push(`is_public = false`);
        }

        if (featured === 'true') {
            whereConditions.push(`is_featured = true`);
        }

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Build ORDER clause
        const sortMap = {
            'name_asc': 'name ASC',
            'name_desc': 'name DESC',
            'books_desc': 'book_count DESC',
            'books_asc': 'book_count ASC',
            'date_desc': 'created_at DESC',
            'date_asc': 'created_at ASC'
        };
        const orderClause = `ORDER BY ${sortMap[sort] || 'name ASC'}`;

        // Main query
        const query = `
            SELECT 
                id, name, slug, description, category,
                is_featured, is_public, color_scheme,
                hero_image_url, book_count, created_at
            FROM collections 
            ${whereClause}
            ${orderClause}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        queryParams.push(parseInt(limit), offset);

        const collections = await db.query(query, queryParams);

        // Count query for pagination
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM collections 
            ${whereClause}
        `;
        const countParams = queryParams.slice(0, -2); // Remove limit and offset
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            collections: collections.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /admin/api/collections/stats
 * Get collection statistics for dashboard
 */
router.get('/stats', async (req, res) => {
    try {
        // Total collections
        const totalQuery = 'SELECT COUNT(*) as total FROM collections';
        const totalResult = await db.query(totalQuery);
        const total = parseInt(totalResult.rows[0].total);

        // Collections by category
        const categoryQuery = `
            SELECT category, COUNT(*) as count
            FROM collections
            GROUP BY category
        `;
        const categoryResult = await db.query(categoryQuery);
        const byCategory = categoryResult.rows.reduce((acc, row) => {
            acc[row.category] = parseInt(row.count);
            return acc;
        }, {});

        // Featured collections count
        const featuredQuery = 'SELECT COUNT(*) as count FROM collections WHERE is_featured = true';
        const featuredResult = await db.query(featuredQuery);
        const featuredCount = parseInt(featuredResult.rows[0].count);

        res.json({
            total,
            by_category: byCategory,
            featured: featuredCount
        });

    } catch (error) {
        console.error('Error fetching collection stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /admin/api/collections/:id
 * Get a single collection by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT c.*,
                   u.first_name, u.last_name,
                   CONCAT(u.first_name, ' ', u.last_name) as creator_name
            FROM collections c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.id = $1
        `;

        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        // Get books in this collection
        const booksQuery = `
            SELECT b.id, b.title, b.author_first, b.author_last,
                   b.cover_image_url, bc.display_order
            FROM books b
            JOIN book_collections bc ON b.id = bc.book_id
            WHERE bc.collection_id = $1
            ORDER BY bc.display_order ASC, b.title ASC
        `;
        const booksResult = await db.query(booksQuery, [id]);

        const collection = result.rows[0];
        collection.books = booksResult.rows;

        res.json(collection);

    } catch (error) {
        console.error('Error fetching collection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /admin/api/collections
 * Create a new collection
 */
router.post('/', upload.single('hero_image'), async (req, res) => {
    try {
        const collectionData = req.body;
        
        // Generate slug from name
        const slug = slugify(collectionData.name, { 
            lower: true, 
            strict: true,
            remove: /[*+~.()'"!:@]/g 
        });

        // Handle file upload
        let heroImageUrl = collectionData.hero_image_url || null;
        if (req.file) {
            const processedImage = await processHeroImage(req.file);
            heroImageUrl = processedImage.url;
        }

        // Insert collection
        const insertQuery = `
            INSERT INTO collections (
                name, slug, description, category, parent_collection_id,
                display_order, is_featured, is_public, color_scheme,
                hero_image_url, curator_notes, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) RETURNING id
        `;

        const values = [
            collectionData.name,
            slug,
            collectionData.description || null,
            collectionData.category,
            collectionData.parent_collection_id || null,
            parseInt(collectionData.display_order) || 0,
            collectionData.is_featured === '1',
            collectionData.is_public !== '0', // Default to public
            collectionData.color_scheme || null,
            heroImageUrl,
            collectionData.curator_notes || null,
            req.user?.id || 1 // Default to admin user
        ];

        const result = await db.query(insertQuery, values);
        const collectionId = result.rows[0].id;

        // Generate collection page
        await generateCollectionPage(collectionId);

        res.status(201).json({ 
            id: collectionId, 
            message: 'Collection created successfully',
            slug: slug 
        });

    } catch (error) {
        console.error('Error creating collection:', error);
        
        // Clean up uploaded file if error occurred
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        
        if (error.code === '23505' && error.constraint === 'collections_slug_key') {
            res.status(400).json({ error: 'A collection with this name already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/**
 * PUT /admin/api/collections/:id
 * Update an existing collection
 */
router.put('/:id', upload.single('hero_image'), async (req, res) => {
    try {
        const { id } = req.params;
        const collectionData = req.body;

        // Check if collection exists
        const existingCollection = await db.query('SELECT * FROM collections WHERE id = $1', [id]);
        if (existingCollection.rows.length === 0) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        const currentCollection = existingCollection.rows[0];

        // Handle file upload
        let heroImageUrl = collectionData.hero_image_url || currentCollection.hero_image_url;
        if (req.file) {
            const processedImage = await processHeroImage(req.file);
            heroImageUrl = processedImage.url;
            
            // Delete old image if it exists
            if (currentCollection.hero_image_url) {
                await deleteOldImage(currentCollection.hero_image_url);
            }
        }

        // Update collection
        const updateQuery = `
            UPDATE collections SET
                name = $1, description = $2, category = $3,
                parent_collection_id = $4, display_order = $5,
                is_featured = $6, is_public = $7, color_scheme = $8,
                hero_image_url = $9, curator_notes = $10,
                updated_at = NOW()
            WHERE id = $11
        `;

        const values = [
            collectionData.name,
            collectionData.description || null,
            collectionData.category,
            collectionData.parent_collection_id || null,
            parseInt(collectionData.display_order) || 0,
            collectionData.is_featured === '1',
            collectionData.is_public !== '0',
            collectionData.color_scheme || null,
            heroImageUrl,
            collectionData.curator_notes || null,
            id
        ];

        await db.query(updateQuery, values);

        // Regenerate collection page
        await generateCollectionPage(id);

        res.json({ 
            id: parseInt(id), 
            message: 'Collection updated successfully' 
        });

    } catch (error) {
        console.error('Error updating collection:', error);
        
        // Clean up uploaded file if error occurred
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /admin/api/collections/:id
 * Delete a collection
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get collection info before deletion
        const collectionResult = await db.query('SELECT hero_image_url FROM collections WHERE id = $1', [id]);
        if (collectionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        const collection = collectionResult.rows[0];

        // Remove books from collection (but don't delete the books)
        await db.query('DELETE FROM book_collections WHERE collection_id = $1', [id]);

        // Delete collection
        await db.query('DELETE FROM collections WHERE id = $1', [id]);

        // Delete hero image if it exists
        if (collection.hero_image_url) {
            await deleteOldImage(collection.hero_image_url);
        }

        // Delete collection page
        await deleteCollectionPage(id);

        res.json({ message: 'Collection deleted successfully' });

    } catch (error) {
        console.error('Error deleting collection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /admin/api/collections/:id/books
 * Add books to a collection
 */
router.post('/:id/books', async (req, res) => {
    try {
        const { id } = req.params;
        const { bookIds } = req.body;

        if (!Array.isArray(bookIds) || bookIds.length === 0) {
            return res.status(400).json({ error: 'Book IDs array is required' });
        }

        // Check if collection exists
        const collectionExists = await db.query('SELECT id FROM collections WHERE id = $1', [id]);
        if (collectionExists.rows.length === 0) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        // Add books to collection (ignore duplicates)
        const values = bookIds.map((bookId, index) => 
            `($1, $${index + 2})`
        ).join(', ');

        const query = `
            INSERT INTO book_collections (collection_id, book_id)
            VALUES ${values}
            ON CONFLICT (collection_id, book_id) DO NOTHING
        `;

        await db.query(query, [id, ...bookIds]);

        // Update collection book count
        await updateCollectionBookCount(id);

        res.json({ message: 'Books added to collection successfully' });

    } catch (error) {
        console.error('Error adding books to collection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /admin/api/collections/:id/books/:bookId
 * Remove a book from a collection
 */
router.delete('/:id/books/:bookId', async (req, res) => {
    try {
        const { id, bookId } = req.params;

        await db.query('DELETE FROM book_collections WHERE collection_id = $1 AND book_id = $2', [id, bookId]);

        // Update collection book count
        await updateCollectionBookCount(id);

        res.json({ message: 'Book removed from collection successfully' });

    } catch (error) {
        console.error('Error removing book from collection:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Helper Functions
 */

// Process uploaded hero image
async function processHeroImage(file) {
    try {
        const filename = path.parse(file.filename).name;
        const outputPath = path.join(path.dirname(file.path), `${filename}-processed.jpg`);
        
        // Resize and optimize image for hero display
        await sharp(file.path)
            .resize(1200, 600, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 85 })
            .toFile(outputPath);

        // Delete original
        await fs.unlink(file.path);

        return {
            url: `/assets/images/collections/${filename}-processed.jpg`,
            path: outputPath
        };
    } catch (error) {
        console.error('Error processing hero image:', error);
        throw error;
    }
}

// Update collection book count
async function updateCollectionBookCount(collectionId) {
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

// Generate collection page (integrate with existing Eleventy build)
async function generateCollectionPage(collectionId) {
    // This would trigger Eleventy to regenerate the collection page
    console.log(`Generating page for collection ${collectionId}`);
}

// Delete collection page
async function deleteCollectionPage(collectionId) {
    // Implementation to remove collection page from build
    console.log(`Deleting page for collection ${collectionId}`);
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