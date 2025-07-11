const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config();

// Test the improved search functionality
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';

// Helper function for HTTP requests
function httpRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const request = protocol.get(url, {
            headers: { 
                'User-Agent': 'Test Script',
                'Accept': 'application/json'
            },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        request.on('error', reject);
    });
}

async function testBookSearch() {
    // Test cases: books without ISBNs
    const testBooks = [
        { title: "The Americans", author: "Robert Frank", isbn: "" },
        { title: "Camera Lucida", author: "Roland Barthes", isbn: "" },
        { title: "On Photography", author: "Susan Sontag", isbn: "" }
    ];
    
    console.log("Testing improved book cover search without ISBNs:\n");
    
    for (const book of testBooks) {
        console.log(`\nSearching for: "${book.title}" by ${book.author}`);
        
        // Test Google Books API with improved search
        try {
            const apiKeyParam = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : '';
            
            // Try exact title and author in quotes
            const exactQuery = encodeURIComponent(`intitle:"${book.title}" inauthor:"${book.author}"`);
            let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${exactQuery}${apiKeyParam}&maxResults=3`;
            
            console.log(`  Exact search: intitle:"${book.title}" inauthor:"${book.author}"`);
            let data = await httpRequest(apiUrl);
            
            if (data && data.items && data.items.length > 0) {
                console.log(`  ✅ Found ${data.items.length} results`);
                const item = data.items[0].volumeInfo;
                console.log(`  Title: ${item.title}`);
                console.log(`  Authors: ${(item.authors || []).join(', ')}`);
                if (item.imageLinks) {
                    console.log(`  Cover available: Yes`);
                }
            } else {
                console.log(`  ❌ No results with exact search`);
                
                // Try broader search
                const generalQuery = encodeURIComponent(`${book.title} ${book.author}`);
                apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${generalQuery}${apiKeyParam}&maxResults=3`;
                console.log(`  General search: ${book.title} ${book.author}`);
                
                data = await httpRequest(apiUrl);
                if (data && data.items && data.items.length > 0) {
                    console.log(`  ✅ Found ${data.items.length} results with general search`);
                }
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        
        // Test Open Library search
        try {
            const query = encodeURIComponent(`${book.title} ${book.author}`);
            const searchUrl = `https://openlibrary.org/search.json?q=${query}&limit=1`;
            
            console.log(`  \nOpen Library search: ${book.title} ${book.author}`);
            const searchResults = await httpRequest(searchUrl);
            
            if (searchResults && searchResults.docs && searchResults.docs.length > 0) {
                const doc = searchResults.docs[0];
                console.log(`  ✅ Found: ${doc.title} by ${(doc.author_name || []).join(', ')}`);
                if (doc.cover_i) {
                    console.log(`  Cover ID available: ${doc.cover_i}`);
                }
            } else {
                console.log(`  ❌ No results`);
            }
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
    }
}

testBookSearch().catch(console.error);