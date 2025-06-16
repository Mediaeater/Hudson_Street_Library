/**
 * Batch Operations for Book Management
 * Handles CSV import, ISBN batch lookup, and manual batch entry
 */

class BatchOperations {
    constructor() {
        this.currentMethod = null;
        this.csvData = [];
        this.validatedISBNs = [];
        this.manualBooks = [];
        this.importProgress = {
            total: 0,
            processed: 0,
            success: 0,
            errors: 0
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // CSV Import Events
        this.setupCSVImport();
        
        // ISBN Batch Events
        this.setupISBNBatch();
        
        // Manual Entry Events
        this.setupManualEntry();
    }

    setupCSVImport() {
        const csvFileInput = document.getElementById('csv-file-input');
        const csvDropZone = document.getElementById('csv-drop-zone');
        const csvValidateBtn = document.getElementById('csv-validate');
        const csvImportBtn = document.getElementById('csv-import');
        const downloadTemplateBtn = document.getElementById('download-csv-template');

        if (csvFileInput) {
            csvFileInput.addEventListener('change', (e) => this.handleCSVFile(e.target.files[0]));
        }

        if (csvDropZone) {
            csvDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                csvDropZone.classList.add('dragover');
            });

            csvDropZone.addEventListener('dragleave', () => {
                csvDropZone.classList.remove('dragover');
            });

            csvDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                csvDropZone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleCSVFile(files[0]);
                }
            });
        }

        if (csvValidateBtn) {
            csvValidateBtn.addEventListener('click', () => this.validateCSVData());
        }

        if (csvImportBtn) {
            csvImportBtn.addEventListener('click', () => this.importCSVBooks());
        }

        if (downloadTemplateBtn) {
            downloadTemplateBtn.addEventListener('click', () => this.downloadCSVTemplate());
        }
    }

    setupISBNBatch() {
        const isbnTextarea = document.getElementById('isbn-textarea');
        const validateISBNBtn = document.getElementById('validate-isbn-list');
        const fetchISBNBtn = document.getElementById('fetch-isbn-books');
        const importISBNBtn = document.getElementById('isbn-import-books');

        if (isbnTextarea) {
            isbnTextarea.addEventListener('input', () => this.updateISBNCount());
        }

        if (validateISBNBtn) {
            validateISBNBtn.addEventListener('click', () => this.validateISBNList());
        }

        if (fetchISBNBtn) {
            fetchISBNBtn.addEventListener('click', () => this.fetchISBNDetails());
        }

        if (importISBNBtn) {
            importISBNBtn.addEventListener('click', () => this.importISBNBooks());
        }
    }

    setupManualEntry() {
        const addBookBtn = document.getElementById('add-manual-book-row');
        const clearBooksBtn = document.getElementById('clear-manual-books');
        const saveBooksBtn = document.getElementById('save-manual-books');
        const applyBulkBtn = document.getElementById('apply-bulk-settings');

        if (addBookBtn) {
            addBookBtn.addEventListener('click', () => this.addManualBookRow());
        }

        if (clearBooksBtn) {
            clearBooksBtn.addEventListener('click', () => this.clearManualBooks());
        }

        if (saveBooksBtn) {
            saveBooksBtn.addEventListener('click', () => this.saveManualBooks());
        }

        if (applyBulkBtn) {
            applyBulkBtn.addEventListener('click', () => this.applyBulkSettings());
        }

        // Add initial book row
        this.addManualBookRow();
    }

    // CSV Import Methods
    async handleCSVFile(file) {
        if (!file || !file.name.endsWith('.csv')) {
            showToast('Please select a valid CSV file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            showToast('File size must be less than 5MB', 'error');
            return;
        }

        try {
            const text = await file.text();
            this.csvData = this.parseCSV(text);
            
            if (this.csvData.length === 0) {
                showToast('No data found in CSV file', 'error');
                return;
            }

            this.displayCSVPreview();
            document.getElementById('csv-preview').classList.remove('hidden');
            document.getElementById('csv-validate').disabled = false;

        } catch (error) {
            console.error('CSV file reading error:', error);
            showToast('Error reading CSV file', 'error');
        }
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    displayCSVPreview() {
        const table = document.getElementById('csv-preview-table');
        const rowCount = document.getElementById('csv-row-count');
        
        if (this.csvData.length === 0) return;

        // Create table header
        const headers = Object.keys(this.csvData[0]);
        const headerRow = headers.map(h => `<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">${h}</th>`).join('');
        
        // Create table rows (show first 10 rows)
        const rows = this.csvData.slice(0, 10).map(row => {
            const cells = headers.map(h => `<td class="px-3 py-2 text-sm text-gray-900">${row[h] || ''}</td>`).join('');
            return `<tr class="border-t border-gray-200">${cells}</tr>`;
        }).join('');

        table.innerHTML = `
            <thead class="bg-gray-50">
                <tr>${headerRow}</tr>
            </thead>
            <tbody>${rows}</tbody>
        `;

        rowCount.textContent = this.csvData.length;
    }

    async validateCSVData() {
        const validateBtn = document.getElementById('csv-validate');
        const importBtn = document.getElementById('csv-import');
        
        validateBtn.disabled = true;
        validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';

        try {
            const response = await fetch('/admin/api/books/validate-csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ data: this.csvData })
            });

            const results = await response.json();
            this.displayValidationResults(results);

            if (results.valid > 0) {
                importBtn.disabled = false;
            }

        } catch (error) {
            console.error('Validation error:', error);
            showToast('Error validating CSV data', 'error');
        } finally {
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Validate Data';
        }
    }

    displayValidationResults(results) {
        const validCount = document.getElementById('csv-valid-count');
        const errorCount = document.getElementById('csv-error-count');
        const errorsDiv = document.getElementById('csv-errors');
        const errorsList = document.getElementById('csv-errors-list');
        const successDiv = document.getElementById('csv-success');
        const readyCount = document.getElementById('csv-ready-count');

        validCount.textContent = results.valid || 0;
        errorCount.textContent = results.errors?.length || 0;

        if (results.errors && results.errors.length > 0) {
            errorsList.innerHTML = results.errors.map(error => `
                <div class="flex items-start space-x-2">
                    <span class="font-medium">Row ${error.row}:</span>
                    <span>${error.message}</span>
                </div>
            `).join('');
            errorsDiv.classList.remove('hidden');
        } else {
            errorsDiv.classList.add('hidden');
        }

        if (results.valid > 0) {
            readyCount.textContent = results.valid;
            successDiv.classList.remove('hidden');
        } else {
            successDiv.classList.add('hidden');
        }

        document.getElementById('csv-validation-results').classList.remove('hidden');
    }

    async importCSVBooks() {
        const importBtn = document.getElementById('csv-import');
        const progressDiv = document.getElementById('csv-import-progress');
        
        importBtn.disabled = true;
        progressDiv.classList.remove('hidden');

        try {
            const response = await fetch('/admin/api/books/batch/csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ books: this.csvData })
            });

            if (response.ok) {
                const results = await response.json();
                this.displayImportResults(results);
            } else {
                throw new Error('Import failed');
            }

        } catch (error) {
            console.error('Import error:', error);
            showToast('Error importing books', 'error');
        } finally {
            importBtn.disabled = false;
            progressDiv.classList.add('hidden');
        }
    }

    downloadCSVTemplate() {
        const template = [
            ['title', 'author_first', 'author_last', 'publisher', 'publication_year', 'isbn', 'status', 'location_shelf', 'location_section', 'summary', 'description', 'tags', 'subjects'],
            ['Sample Book Title', 'John', 'Doe', 'Sample Publisher', '2023', '9781234567890', 'available', 'A1', 'Photography', 'Brief summary', 'Detailed description', 'photography,art', 'Photography,Art History']
        ];

        const csvContent = template.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'book-import-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // ISBN Batch Methods
    updateISBNCount() {
        const textarea = document.getElementById('isbn-textarea');
        const countSpan = document.getElementById('isbn-count');
        
        if (textarea && countSpan) {
            const isbns = textarea.value.split('\n').filter(line => line.trim());
            countSpan.textContent = isbns.length;
        }
    }

    async validateISBNList() {
        const textarea = document.getElementById('isbn-textarea');
        const validateBtn = document.getElementById('validate-isbn-list');
        
        const isbns = textarea.value.split('\n').filter(line => line.trim());
        
        if (isbns.length === 0) {
            showToast('Please enter at least one ISBN', 'error');
            return;
        }

        validateBtn.disabled = true;
        validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';

        try {
            const response = await fetch('/admin/api/books/validate-isbns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ isbns })
            });

            const results = await response.json();
            this.displayISBNValidationResults(results);

        } catch (error) {
            console.error('ISBN validation error:', error);
            showToast('Error validating ISBNs', 'error');
        } finally {
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Validate ISBNs';
        }
    }

    displayISBNValidationResults(results) {
        const validCount = document.getElementById('isbn-valid-count');
        const invalidCount = document.getElementById('isbn-invalid-count');
        const duplicateCount = document.getElementById('isbn-duplicate-count');
        const invalidList = document.getElementById('isbn-invalid-list');
        const invalidItems = document.getElementById('isbn-invalid-items');
        const fetchBtn = document.getElementById('fetch-isbn-books');

        validCount.textContent = results.valid?.length || 0;
        invalidCount.textContent = results.invalid?.length || 0;
        duplicateCount.textContent = results.duplicates?.length || 0;

        if (results.invalid && results.invalid.length > 0) {
            invalidItems.innerHTML = results.invalid.map(isbn => `
                <div class="text-sm">${isbn}</div>
            `).join('');
            invalidList.classList.remove('hidden');
        } else {
            invalidList.classList.add('hidden');
        }

        if (results.valid && results.valid.length > 0) {
            this.validatedISBNs = results.valid;
            fetchBtn.disabled = false;
        }

        document.getElementById('isbn-validation-results').classList.remove('hidden');
    }

    async fetchISBNDetails() {
        const fetchBtn = document.getElementById('fetch-isbn-books');
        const progressDiv = document.getElementById('isbn-fetch-progress');
        const progressBar = document.getElementById('isbn-progress-bar');
        const progressText = document.getElementById('isbn-progress-text');
        const progressPercent = document.getElementById('isbn-progress-percent');
        const statusDiv = document.getElementById('isbn-fetch-status');

        fetchBtn.disabled = true;
        progressDiv.classList.remove('hidden');

        const defaultSettings = {
            status: document.getElementById('isbn-default-status').value,
            location_section: document.getElementById('isbn-default-section').value,
            location_shelf: document.getElementById('isbn-default-shelf').value,
            is_new_acquisition: document.getElementById('isbn-new-acquisition').checked,
            auto_collections: document.getElementById('isbn-auto-collections').checked
        };

        try {
            const response = await fetch('/admin/api/books/batch/isbn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ 
                    isbns: this.validatedISBNs,
                    defaultSettings 
                })
            });

            if (response.ok) {
                const results = await response.json();
                this.displayISBNFetchResults(results);
            } else {
                throw new Error('Failed to fetch book details');
            }

        } catch (error) {
            console.error('ISBN fetch error:', error);
            showToast('Error fetching book details', 'error');
        } finally {
            fetchBtn.disabled = false;
            progressDiv.classList.add('hidden');
        }
    }

    displayISBNFetchResults(results) {
        const foundCount = document.getElementById('isbn-found-count');
        const partialCount = document.getElementById('isbn-partial-count');
        const notFoundCount = document.getElementById('isbn-notfound-count');
        const preview = document.getElementById('isbn-books-preview');
        const importBtn = document.getElementById('isbn-import-books');

        foundCount.textContent = results.found?.length || 0;
        partialCount.textContent = results.partial?.length || 0;
        notFoundCount.textContent = results.notFound?.length || 0;

        if (results.found && results.found.length > 0) {
            preview.innerHTML = results.found.map(book => `
                <div class="flex items-center space-x-3 p-2 bg-white rounded border">
                    <img src="${book.cover_image_url || '/assets/images/placeholder-book.svg'}" 
                         alt="${book.title}" class="w-8 h-10 object-cover rounded">
                    <div class="flex-1">
                        <div class="font-medium text-sm">${book.title}</div>
                        <div class="text-xs text-gray-500">
                            ${book.author_first} ${book.author_last} • ${book.publisher}
                        </div>
                    </div>
                    <div class="text-xs text-gray-400">${book.isbn}</div>
                </div>
            `).join('');

            importBtn.disabled = false;
        }

        document.getElementById('isbn-fetch-results').classList.remove('hidden');
    }

    // Manual Entry Methods
    addManualBookRow() {
        const container = document.getElementById('manual-books-container');
        const bookIndex = this.manualBooks.length;
        
        const bookRow = document.createElement('div');
        bookRow.className = 'manual-book-row p-4 bg-white border border-gray-200 rounded-lg';
        bookRow.dataset.index = bookIndex;
        
        bookRow.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <h5 class="text-sm font-medium text-gray-900">Book ${bookIndex + 1}</h5>
                <button type="button" class="text-red-500 hover:text-red-700" onclick="batchOps.removeManualBookRow(${bookIndex})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Title *</label>
                    <input type="text" class="form-input w-full text-sm" 
                           data-field="title" placeholder="Book title" required>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Author First Name</label>
                    <input type="text" class="form-input w-full text-sm" 
                           data-field="author_first" placeholder="First name">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Author Last Name</label>
                    <input type="text" class="form-input w-full text-sm" 
                           data-field="author_last" placeholder="Last name">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Publisher</label>
                    <input type="text" class="form-input w-full text-sm" 
                           data-field="publisher" placeholder="Publisher">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Year</label>
                    <input type="number" class="form-input w-full text-sm" 
                           data-field="publication_year" placeholder="YYYY" min="1800" max="2030">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                    <select class="form-input w-full text-sm" data-field="status" required>
                        <option value="available">Available</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="reserved">Reserved</option>
                        <option value="missing">Missing</option>
                        <option value="damaged">Damaged</option>
                        <option value="repair">In Repair</option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Summary</label>
                    <input type="text" class="form-input w-full text-sm" 
                           data-field="summary" placeholder="Brief summary">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Section</label>
                    <input type="text" class="form-input w-full text-sm" 
                           data-field="location_section" placeholder="e.g., Photography">
                </div>
            </div>
        `;
        
        container.appendChild(bookRow);
        
        // Add event listeners for this row
        bookRow.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', () => this.updateManualBookData(bookIndex));
        });
        
        // Initialize book data
        this.manualBooks[bookIndex] = {};
        this.updateManualBookCount();
    }

    removeManualBookRow(index) {
        const row = document.querySelector(`[data-index="${index}"]`);
        if (row) {
            row.remove();
            this.manualBooks.splice(index, 1);
            this.updateManualBookCount();
            
            // Update remaining row indices
            document.querySelectorAll('.manual-book-row').forEach((row, newIndex) => {
                row.dataset.index = newIndex;
                row.querySelector('h5').textContent = `Book ${newIndex + 1}`;
                
                // Update remove button onclick
                const removeBtn = row.querySelector('button[onclick]');
                if (removeBtn) {
                    removeBtn.setAttribute('onclick', `batchOps.removeManualBookRow(${newIndex})`);
                }
            });
        }
    }

    updateManualBookData(index) {
        const row = document.querySelector(`[data-index="${index}"]`);
        if (!row) return;
        
        const bookData = {};
        row.querySelectorAll('[data-field]').forEach(input => {
            const field = input.dataset.field;
            bookData[field] = input.value;
        });
        
        this.manualBooks[index] = bookData;
        this.updateManualBookCount();
    }

    updateManualBookCount() {
        const count = this.manualBooks.filter(book => book.title && book.status).length;
        const countSpan = document.getElementById('manual-book-count');
        const saveBtn = document.getElementById('save-manual-books');
        
        if (countSpan) {
            countSpan.textContent = count;
        }
        
        if (saveBtn) {
            saveBtn.disabled = count === 0;
        }
    }

    applyBulkSettings() {
        const bulkStatus = document.getElementById('manual-bulk-status').value;
        const bulkSection = document.getElementById('manual-bulk-section').value;
        
        document.querySelectorAll('.manual-book-row').forEach((row, index) => {
            if (bulkStatus) {
                const statusSelect = row.querySelector('[data-field="status"]');
                if (statusSelect) {
                    statusSelect.value = bulkStatus;
                    this.manualBooks[index].status = bulkStatus;
                }
            }
            
            if (bulkSection) {
                const sectionInput = row.querySelector('[data-field="location_section"]');
                if (sectionInput) {
                    sectionInput.value = bulkSection;
                    this.manualBooks[index].location_section = bulkSection;
                }
            }
        });
        
        this.updateManualBookCount();
        showToast('Bulk settings applied', 'success');
    }

    clearManualBooks() {
        if (confirm('Are you sure you want to clear all manually entered books?')) {
            document.getElementById('manual-books-container').innerHTML = '';
            this.manualBooks = [];
            this.updateManualBookCount();
            this.addManualBookRow(); // Add one empty row
        }
    }

    async saveManualBooks() {
        const validBooks = this.manualBooks.filter(book => book.title && book.status);
        
        if (validBooks.length === 0) {
            showToast('No valid books to save', 'error');
            return;
        }

        const saveBtn = document.getElementById('save-manual-books');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        try {
            const response = await fetch('/admin/api/books/batch/manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ books: validBooks })
            });

            if (response.ok) {
                const results = await response.json();
                showToast(`Successfully saved ${results.success} books`, 'success');
                
                // Clear the form
                this.clearManualBooks();
            } else {
                throw new Error('Failed to save books');
            }

        } catch (error) {
            console.error('Save error:', error);
            showToast('Error saving books', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save All Books';
        }
    }

    // Utility Methods
    displayImportResults(results) {
        const resultsDiv = document.getElementById('csv-import-results');
        const successCount = document.getElementById('import-success-count');
        const warningCount = document.getElementById('import-warning-count');
        const errorCount = document.getElementById('import-error-count');
        
        successCount.textContent = results.success || 0;
        warningCount.textContent = results.warnings || 0;
        errorCount.textContent = results.errors || 0;
        
        resultsDiv.classList.remove('hidden');
        document.getElementById('csv-import-progress').classList.add('hidden');
        
        showToast(`Import complete: ${results.success} books imported successfully`, 'success');
    }

    getAuthToken() {
        return localStorage.getItem('auth_token') || '';
    }
}

// Initialize batch operations
let batchOps;
document.addEventListener('DOMContentLoaded', function() {
    batchOps = new BatchOperations();
});

// Global functions for onclick handlers
window.batchOps = batchOps;