/**
 * Hudson Street Library CMS Server
 * Express.js server with PostgreSQL backend
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hudson_library',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Make db available globally
global.db = db;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"]
        }
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/admin/api/', limiter);

// Static file serving
app.use('/assets', express.static(path.join(__dirname, '../src/assets')));

// API Routes
app.use('/admin/api/books', require('./api/books'));
app.use('/admin/api/books', require('./api/books-workflow'));
app.use('/admin/api/collections', require('./api/collections'));

// Dashboard API endpoints
app.get('/admin/api/dashboard/stats', async (req, res) => {
    try {
        // Get book statistics
        const bookStatsQuery = `
            SELECT 
                COUNT(*) as total_books,
                COUNT(*) FILTER (WHERE status = 'available') as available,
                COUNT(*) FILTER (WHERE status = 'checked_out') as checked_out,
                COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
                COUNT(*) FILTER (WHERE status IN ('missing', 'damaged', 'repair')) as issues,
                COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as books_added_this_month
            FROM books
        `;
        
        const bookStats = await db.query(bookStatsQuery);
        
        // Get collection statistics
        const collectionStatsQuery = `
            SELECT 
                COUNT(*) as total_collections,
                COUNT(*) FILTER (WHERE is_featured = true) as featured_collections
            FROM collections
        `;
        
        const collectionStats = await db.query(collectionStatsQuery);
        
        // Get books by category (based on collection categories)
        const categoryStatsQuery = `
            SELECT 
                c.category,
                COUNT(DISTINCT bc.book_id) as book_count
            FROM collections c
            LEFT JOIN book_collections bc ON c.id = bc.collection_id
            GROUP BY c.category
        `;
        
        const categoryStats = await db.query(categoryStatsQuery);
        
        const byCategory = categoryStats.rows.reduce((acc, row) => {
            acc[row.category] = parseInt(row.book_count) || 0;
            return acc;
        }, {});
        
        res.json({
            ...bookStats.rows[0],
            ...collectionStats.rows[0],
            by_category: byCategory,
            storage_used: 45, // Placeholder - implement actual storage calculation
            last_backup: 'Today' // Placeholder - implement actual backup tracking
        });
        
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Recent activity endpoint
app.get('/admin/api/activity/recent', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const query = `
            SELECT 
                entity_type,
                entity_id,
                action,
                details->>'entity_name' as entity_name,
                created_at
            FROM activity_log
            ORDER BY created_at DESC
            LIMIT $1
        `;
        
        const result = await db.query(query, [parseInt(limit)]);
        res.json(result.rows);
        
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await db.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await db.end();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`Hudson Street Library CMS server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;