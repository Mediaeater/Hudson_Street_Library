/**
 * Book Workflow Management
 * Handles the streamlined book addition workflow with image processing,
 * automatic collection assignment, and batch operations
 */

class BookWorkflow {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.bookData = {};
        this.selectedCollections = [];
        this.selectedSubjects = [];
        this.uploadedImages = {};
        this.isDirty = false;
        this.autoSaveInterval = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupImageUpload();
        this.setupAutocomplete();
        this.updateStepIndicator();
        this.setupAutoSave();
    }

    // Helper to safely add event listener with null check
    safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    setupEventListeners() {
        // Navigation buttons
        this.safeAddEventListener('next-step-btn', 'click', () => this.nextStep());
        this.safeAddEventListener('prev-step-btn', 'click', () => this.prevStep());
        this.safeAddEventListener('publish-btn', 'click', () => this.publishBook());

        // Form actions
        this.safeAddEventListener('save-draft-btn', 'click', () => this.saveDraft());
        this.safeAddEventListener('batch-mode-btn', 'click', () => this.openBatchMode());

        // Form change tracking
        this.safeAddEventListener('book-workflow-form', 'input', () => {
            this.isDirty = true;
            this.validateCurrentStep();
            this.updatePreview();
        });

        // ISBN lookup
        this.safeAddEventListener('isbn', 'blur-sm', () => this.lookupBookByISBN());

        // Title-based category detection
        this.safeAddEventListener('title', 'input', debounce(() => this.detectCategory(), 500));
        this.safeAddEventListener('description', 'input', debounce(() => this.detectCategory(), 500));

        // Subject management
        this.setupSubjectManagement();

        // Collection search
        this.safeAddEventListener('collection-search', 'input', debounce((e) => this.searchCollections(e.target.value), 300));
        
        // Image processing
        this.setupImageProcessing();
        
        // Batch mode
        this.setupBatchMode();
        
        // Character counters
        this.setupCharacterCounters();
        
        // Auto-suggestions
        this.setupAutoSuggestions();
    }

    setupFormValidation() {
        const requiredFields = ['title', 'status'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => this.validateField(fieldId));
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });
    }

    validateField(fieldId) {
        const field = document.getElementById(fieldId);
        const value = field.value.trim();
        
        let isValid = true;
        let errorMessage = '';
        
        switch (fieldId) {
            case 'title':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Title is required';
                } else if (value.length > 500) {
                    isValid = false;
                    errorMessage = 'Title must be less than 500 characters';
                }
                break;
                
            case 'status':
                if (!value) {
                    isValid = false;
                    errorMessage = 'Status is required';
                }
                break;
                
            case 'isbn':
                if (value && !this.validateISBN(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid ISBN';
                }
                break;
                
            case 'publication_year':
                if (value) {
                    const year = parseInt(value);
                    const currentYear = new Date().getFullYear();
                    if (year < 1800 || year > currentYear + 2) {
                        isValid = false;
                        errorMessage = 'Please enter a valid publication year';
                    }
                }
                break;
        }
        
        this.showFieldValidation(fieldId, isValid, errorMessage);
        return isValid;
    }

    validateISBN(isbn) {
        // Remove hyphens and spaces
        const cleanISBN = isbn.replace(/[-\s]/g, '');
        
        // Check ISBN-10
        if (cleanISBN.length === 10) {
            return this.validateISBN10(cleanISBN);
        }
        
        // Check ISBN-13
        if (cleanISBN.length === 13) {
            return this.validateISBN13(cleanISBN);
        }
        
        return false;
    }

    validateISBN10(isbn) {
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(isbn[i]) * (10 - i);
        }
        const checkDigit = isbn[9].toLowerCase() === 'x' ? 10 : parseInt(isbn[9]);
        return (sum + checkDigit) % 11 === 0;
    }

    validateISBN13(isbn) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = parseInt(isbn[12]);
        return (sum + checkDigit) % 10 === 0;
    }

    showFieldValidation(fieldId, isValid, errorMessage) {
        const field = document.getElementById(fieldId);
        const existingError = document.getElementById(`${fieldId}-error`);
        
        // Remove existing error
        if (existingError) {
            existingError.remove();
        }
        
        // Update field styling
        if (isValid) {
            field.classList.remove('border-red-500');
            field.classList.add('border-gray-300');
        } else {
            field.classList.remove('border-gray-300');
            field.classList.add('border-red-500');
            
            // Add error message
            const errorElement = document.createElement('div');
            errorElement.id = `${fieldId}-error`;
            errorElement.className = 'text-red-500 text-sm mt-1';
            errorElement.textContent = errorMessage;
            field.parentNode.appendChild(errorElement);
        }
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);
        
        if (errorElement) {
            errorElement.remove();
        }
        
        field.classList.remove('border-red-500');
        field.classList.add('border-gray-300');
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('cover-upload-area');
        const fileInput = document.getElementById('cover-image');
        
        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-teal-400', 'bg-teal-50');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-teal-400', 'bg-teal-50');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-teal-400', 'bg-teal-50');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageUpload(files[0]);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleImageUpload(e.target.files[0]);
            }
        });
        
        // URL input
        document.getElementById('cover_image_url').addEventListener('input', debounce((e) => {
            if (e.target.value) {
                this.loadImageFromURL(e.target.value);
            }
        }, 500));
    }

    async handleImageUpload(file) {
        // Validate file type and size
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
            showToast('Image file must be less than 10MB', 'error');
            return;
        }
        
        // Show upload progress
        this.showUploadProgress();
        
        try {
            // Create FormData for upload
            const formData = new FormData();
            formData.append('image', file);
            formData.append('type', 'book-cover');
            
            // Get processing options
            const autoCrop = document.getElementById('auto-crop').checked;
            const enhanceQuality = document.getElementById('enhance-quality').checked;
            const removeBackground = document.getElementById('remove-background').checked;
            
            formData.append('auto_crop', autoCrop);
            formData.append('enhance_quality', enhanceQuality);
            formData.append('remove_background', removeBackground);
            
            // Upload and process image
            const response = await fetch('/admin/api/media/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const result = await response.json();
            
            // Store uploaded image data
            this.uploadedImages.cover = {
                url: result.url,
                originalName: file.name,
                size: file.size,
                type: file.type,
                dimensions: result.dimensions,
                processed: result.processed
            };
            
            // Show preview
            this.showImagePreview(result.url, result);
            
            // Hide upload progress
            this.hideUploadProgress();
            
            showToast('Image uploaded successfully', 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.hideUploadProgress();
            showToast('Failed to upload image', 'error');
        }
    }

    showUploadProgress() {
        document.getElementById('upload-prompt').classList.add('hidden');
        document.getElementById('upload-progress').classList.remove('hidden');
        
        // Simulate progress for now - in real implementation, track actual upload progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            
            document.getElementById('progress-bar').style.width = `${progress}%`;
            document.getElementById('progress-text').textContent = `${Math.round(progress)}%`;
        }, 200);
    }

    hideUploadProgress() {
        document.getElementById('upload-progress').classList.add('hidden');
        document.getElementById('upload-prompt').classList.remove('hidden');
    }

    showImagePreview(imageUrl, imageData) {
        const noImagePreview = document.getElementById('no-image-preview');
        const imagePreview = document.getElementById('image-preview');
        const previewImage = document.getElementById('preview-image');
        
        noImagePreview.classList.add('hidden');
        imagePreview.classList.remove('hidden');
        
        previewImage.src = imageUrl;
        
        // Update image details
        if (imageData) {
            document.getElementById('image-dimensions').textContent = 
                `${imageData.dimensions?.width || '?'} × ${imageData.dimensions?.height || '?'}px`;
            document.getElementById('image-size').textContent = this.formatFileSize(imageData.size || 0);
            document.getElementById('image-format').textContent = imageData.type || 'Unknown';
            
            if (imageData.dimensions) {
                const ratio = (imageData.dimensions.width / imageData.dimensions.height).toFixed(2);
                document.getElementById('image-ratio').textContent = `${ratio}:1`;
            }
        }
        
        // Setup image actions
        this.setupImageActions();
    }

    setupImageActions() {
        document.getElementById('rotate-left').addEventListener('click', () => this.rotateImage(-90));
        document.getElementById('rotate-right').addEventListener('click', () => this.rotateImage(90));
        document.getElementById('remove-image').addEventListener('click', () => this.removeImage());
    }

    async loadImageFromURL(url) {
        try {
            // Validate URL
            new URL(url);
            
            // Load image to check if it's valid
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.uploadedImages.cover = {
                    url: url,
                    originalName: 'External Image',
                    type: 'image/jpeg',
                    dimensions: { width: img.width, height: img.height }
                };
                
                this.showImagePreview(url, this.uploadedImages.cover);
            };
            
            img.onerror = () => {
                showToast('Unable to load image from URL', 'error');
            };
            
            img.src = url;
            
        } catch (error) {
            showToast('Please enter a valid URL', 'error');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async lookupBookByISBN() {
        const isbnField = document.getElementById('isbn');
        const isbn = isbnField.value.trim();
        
        if (!isbn || !this.validateISBN(isbn)) {
            return;
        }
        
        try {
            // Show loading indicator
            const loadingIndicator = this.createLoadingIndicator();
            isbnField.parentNode.appendChild(loadingIndicator);
            
            // Lookup book details
            const response = await fetch(`/admin/api/books/lookup/isbn/${isbn}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const bookData = await response.json();
                this.populateBookData(bookData);
                showToast('Book details auto-populated from ISBN', 'success');
            }
            
        } catch (error) {
            console.error('ISBN lookup error:', error);
            showToast('Unable to fetch book details for this ISBN', 'warning');
        } finally {
            // Remove loading indicator
            const loadingIndicator = isbnField.parentNode.querySelector('.loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    }

    populateBookData(data) {
        // Populate form fields with fetched data
        const fieldMappings = {
            'title': data.title,
            'author_first': data.author_first,
            'author_last': data.author_last,
            'publisher': data.publisher,
            'publication_year': data.publication_year,
            'page_count': data.page_count,
            'summary': data.summary,
            'description': data.description
        };
        
        Object.entries(fieldMappings).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
                this.isDirty = true;
            }
        });
        
        // Load cover image if available
        if (data.cover_image_url) {
            document.getElementById('cover_image_url').value = data.cover_image_url;
            this.loadImageFromURL(data.cover_image_url);
        }
        
        // Auto-detect subjects and collections
        if (data.subjects) {
            this.selectedSubjects = Array.isArray(data.subjects) ? data.subjects : [data.subjects];
            this.updateSubjectTags();
        }
        
        // Trigger category detection
        this.detectCategory();
    }

    async detectCategory() {
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const subjects = this.selectedSubjects.join(', ');
        
        if (!title && !description && !subjects) {
            return;
        }
        
        try {
            const response = await fetch('/admin/api/books/detect-category', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    title,
                    description,
                    subjects
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.updateDetectedCategory(result);
                this.suggestCollections(result);
            }
            
        } catch (error) {
            console.error('Category detection error:', error);
        }
    }

    updateDetectedCategory(result) {
        const categoryElement = document.getElementById('detected-category');
        
        if (result.category) {
            const confidence = Math.round(result.confidence * 100);
            const categoryIcons = {
                photography: 'fa-camera',
                art: 'fa-palette',
                fashion: 'fa-tshirt',
                ephemera: 'fa-newspaper',
                design: 'fa-pencil-ruler',
                special: 'fa-star'
            };
            
            categoryElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <i class="fas ${categoryIcons[result.category] || 'fa-book'} text-teal-600"></i>
                        <span class="font-medium capitalize">${result.category}</span>
                        <span class="text-sm text-gray-500">(${confidence}% confidence)</span>
                    </div>
                    <button type="button" class="text-xs text-teal-600 hover:text-teal-700" onclick="bookWorkflow.redetectCategory()">
                        Redetect
                    </button>
                </div>
            `;
        }
    }

    async suggestCollections(categoryResult) {
        try {
            const response = await fetch('/admin/api/collections/suggest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    category: categoryResult.category,
                    title: document.getElementById('title').value,
                    subjects: this.selectedSubjects,
                    keywords: categoryResult.keywords || []
                })
            });
            
            if (response.ok) {
                const suggestions = await response.json();
                this.displayCollectionSuggestions(suggestions);
            }
            
        } catch (error) {
            console.error('Collection suggestion error:', error);
        }
    }

    displayCollectionSuggestions(suggestions) {
        const container = document.getElementById('suggested-collections');
        
        if (!suggestions || suggestions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-2xl mb-3"></i>
                    <div>No matching collections found</div>
                    <div class="text-sm">You can manually search and add collections</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = suggestions.map(collection => `
            <div class="collection-suggestion p-4 border border-gray-200 rounded-lg hover:border-teal-300 cursor-pointer"
                 data-collection-id="${collection.id}"
                 onclick="bookWorkflow.toggleCollection(${collection.id}, '${collection.name}', '${collection.category}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 rounded-full bg-${this.getCategoryColor(collection.category)}-500"></div>
                        <div>
                            <div class="font-medium text-gray-900">${collection.name}</div>
                            <div class="text-sm text-gray-500 capitalize">${collection.category} • ${collection.book_count} books</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-sm">
                            ${Math.round(collection.relevance * 100)}% match
                        </span>
                        <div class="collection-checkbox">
                            <i class="fas fa-plus text-gray-400"></i>
                        </div>
                    </div>
                </div>
                ${collection.description ? `<div class="text-sm text-gray-600 mt-2">${collection.description}</div>` : ''}
            </div>
        `).join('');
    }

    toggleCollection(collectionId, collectionName, collectionCategory) {
        const index = this.selectedCollections.findIndex(c => c.id === collectionId);
        
        if (index === -1) {
            // Add collection
            this.selectedCollections.push({
                id: collectionId,
                name: collectionName,
                category: collectionCategory
            });
        } else {
            // Remove collection
            this.selectedCollections.splice(index, 1);
        }
        
        this.updateSelectedCollections();
        this.updateCollectionSuggestionUI(collectionId, index === -1);
    }

    updateSelectedCollections() {
        const container = document.getElementById('selected-collections');
        const noCollections = document.getElementById('no-collections-selected');
        
        if (this.selectedCollections.length === 0) {
            noCollections.classList.remove('hidden');
            container.innerHTML = '';
            container.appendChild(noCollections);
        } else {
            noCollections.classList.add('hidden');
            
            container.innerHTML = this.selectedCollections.map(collection => `
                <div class="selected-collection p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 rounded-full bg-${this.getCategoryColor(collection.category)}-500"></div>
                            <div>
                                <div class="font-medium text-gray-900">${collection.name}</div>
                                <div class="text-sm text-gray-500 capitalize">${collection.category}</div>
                            </div>
                        </div>
                        <button type="button" class="text-red-500 hover:text-red-700" 
                                onclick="bookWorkflow.toggleCollection(${collection.id}, '${collection.name}', '${collection.category}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        // Update category summary
        this.updateCategorySummary();
        
        // Update hidden input
        document.getElementById('collections-input').value = JSON.stringify(this.selectedCollections.map(c => c.id));
    }

    updateCollectionSuggestionUI(collectionId, isSelected) {
        const suggestion = document.querySelector(`.collection-suggestion[data-collection-id="${collectionId}"]`);
        if (suggestion) {
            const checkbox = suggestion.querySelector('.collection-checkbox i');
            if (isSelected) {
                suggestion.classList.add('border-teal-500', 'bg-teal-50');
                checkbox.className = 'fas fa-check text-teal-600';
            } else {
                suggestion.classList.remove('border-teal-500', 'bg-teal-50');
                checkbox.className = 'fas fa-plus text-gray-400';
            }
        }
    }

    getCategoryColor(category) {
        const colors = {
            photography: 'blue',
            art: 'purple',
            fashion: 'pink',
            ephemera: 'green',
            design: 'indigo',
            special: 'yellow'
        };
        return colors[category] || 'gray';
    }

    updateCategorySummary() {
        const counts = {};
        this.selectedCollections.forEach(collection => {
            counts[collection.category] = (counts[collection.category] || 0) + 1;
        });
        
        Object.keys(counts).forEach(category => {
            const element = document.getElementById(`${category}-count`);
            if (element) {
                element.textContent = counts[category];
            }
        });
        
        // Reset counts for categories not in selection
        ['photography', 'art', 'fashion', 'ephemera', 'design', 'special'].forEach(category => {
            if (!counts[category]) {
                const element = document.getElementById(`${category}-count`);
                if (element) {
                    element.textContent = '0';
                }
            }
        });
    }

    setupSubjectManagement() {
        const subjectsInput = document.getElementById('subjects-input');
        const subjectsTags = document.getElementById('subjects-tags');
        
        subjectsInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                this.addSubject(subjectsInput.value.trim());
                subjectsInput.value = '';
            }
        });
        
        subjectsInput.addEventListener('input', debounce(() => {
            this.showSubjectSuggestions(subjectsInput.value);
        }, 300));
    }

    addSubject(subject) {
        if (!subject || this.selectedSubjects.includes(subject)) {
            return;
        }
        
        this.selectedSubjects.push(subject);
        this.updateSubjectTags();
        this.detectCategory(); // Re-run category detection
        
        // Update hidden input
        document.getElementById('subjects-array-input').value = JSON.stringify(this.selectedSubjects);
    }

    removeSubject(subject) {
        const index = this.selectedSubjects.indexOf(subject);
        if (index > -1) {
            this.selectedSubjects.splice(index, 1);
            this.updateSubjectTags();
            this.detectCategory(); // Re-run category detection
            
            // Update hidden input
            document.getElementById('subjects-array-input').value = JSON.stringify(this.selectedSubjects);
        }
    }

    updateSubjectTags() {
        const container = document.getElementById('subjects-tags');
        
        container.innerHTML = this.selectedSubjects.map(subject => `
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-teal-100 text-teal-800">
                ${subject}
                <button type="button" class="ml-2 text-teal-600 hover:text-teal-800" 
                        onclick="bookWorkflow.removeSubject('${subject}')">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </span>
        `).join('');
    }

    async showSubjectSuggestions(query) {
        if (!query || query.length < 2) {
            document.getElementById('suggested-subjects').classList.add('hidden');
            return;
        }
        
        try {
            const response = await fetch(`/admin/api/subjects/suggest?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const suggestions = await response.json();
                this.displaySubjectSuggestions(suggestions.filter(s => !this.selectedSubjects.includes(s)));
            }
            
        } catch (error) {
            console.error('Subject suggestion error:', error);
        }
    }

    displaySubjectSuggestions(suggestions) {
        const container = document.getElementById('suggested-subjects');
        const list = document.getElementById('suggested-subjects-list');
        
        if (suggestions.length === 0) {
            container.classList.add('hidden');
            return;
        }
        
        list.innerHTML = suggestions.map(subject => `
            <button type="button" class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-sm hover:bg-gray-200"
                    onclick="bookWorkflow.addSubject('${subject}')">
                ${subject}
            </button>
        `).join('');
        
        container.classList.remove('hidden');
    }

    setupCharacterCounters() {
        const fields = [
            { id: 'title', max: 500 },
            { id: 'summary', max: 500 },
            { id: 'description', max: 1000 }
        ];
        
        fields.forEach(field => {
            const input = document.getElementById(field.id);
            const counter = document.getElementById(`${field.id}-counter`);
            
            if (input && counter) {
                input.addEventListener('input', () => {
                    const length = input.value.length;
                    counter.textContent = length;
                    
                    if (length > field.max) {
                        counter.parentElement.classList.add('text-red-500');
                    } else {
                        counter.parentElement.classList.remove('text-red-500');
                    }
                });
            }
        });
    }

    setupAutoSuggestions() {
        // Setup publisher autocomplete
        this.loadPublisherSuggestions();
    }

    async loadPublisherSuggestions() {
        try {
            const response = await fetch('/admin/api/books/publishers', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const publishers = await response.json();
                const datalist = document.getElementById('publishers-list');
                
                datalist.innerHTML = publishers.map(publisher => 
                    `<option value="${publisher}">`
                ).join('');
            }
            
        } catch (error) {
            console.error('Error loading publishers:', error);
        }
    }

    // Step Navigation
    nextStep() {
        if (this.validateCurrentStep()) {
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateStepDisplay();
                this.updateStepIndicator();
                
                // Special handling for collection suggestions on step 3
                if (this.currentStep === 3) {
                    this.loadCollectionSuggestions();
                }
                
                // Update preview on step 4
                if (this.currentStep === 4) {
                    this.updatePreview();
                    this.updateChecklist();
                }
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
            this.updateStepIndicator();
        }
    }

    updateStepDisplay() {
        // Hide all steps
        for (let i = 1; i <= this.totalSteps; i++) {
            document.getElementById(`step-${i}`).classList.add('hidden');
        }
        
        // Show current step
        document.getElementById(`step-${this.currentStep}`).classList.remove('hidden');
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prev-step-btn');
        const nextBtn = document.getElementById('next-step-btn');
        const publishBtn = document.getElementById('publish-btn');
        
        if (this.currentStep === 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.classList.add('hidden');
            publishBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            publishBtn.classList.add('hidden');
        }
    }

    updateStepIndicator() {
        for (let i = 1; i <= this.totalSteps; i++) {
            const indicator = document.querySelector(`[data-step="${i}"]`);
            const connector = indicator.parentElement.nextElementSibling;
            
            if (i < this.currentStep) {
                // Completed step
                indicator.classList.remove('bg-gray-300', 'text-gray-600', 'bg-teal-600', 'text-white');
                indicator.classList.add('bg-green-600', 'text-white');
                indicator.innerHTML = '<i class="fas fa-check text-xs"></i>';
                
                if (connector) {
                    connector.classList.remove('bg-gray-300');
                    connector.classList.add('bg-green-600');
                }
            } else if (i === this.currentStep) {
                // Current step
                indicator.classList.remove('bg-gray-300', 'text-gray-600', 'bg-green-600');
                indicator.classList.add('bg-teal-600', 'text-white');
                indicator.textContent = i;
                
                if (connector) {
                    connector.classList.remove('bg-green-600');
                    connector.classList.add('bg-gray-300');
                }
            } else {
                // Future step
                indicator.classList.remove('bg-teal-600', 'text-white', 'bg-green-600');
                indicator.classList.add('bg-gray-300', 'text-gray-600');
                indicator.textContent = i;
                
                if (connector) {
                    connector.classList.remove('bg-green-600');
                    connector.classList.add('bg-gray-300');
                }
            }
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return this.validateField('title') && this.validateField('status');
            case 2:
                // Image step is optional but validate if URL is provided
                const imageUrl = document.getElementById('cover_image_url').value;
                return !imageUrl || this.isValidURL(imageUrl);
            case 3:
                // Collections step is optional
                return true;
            case 4:
                // Final validation
                return this.validateAllFields();
            default:
                return true;
        }
    }

    validateAllFields() {
        const requiredFields = ['title', 'status'];
        let allValid = true;
        
        requiredFields.forEach(fieldId => {
            if (!this.validateField(fieldId)) {
                allValid = false;
            }
        });
        
        return allValid;
    }

    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Preview and Publishing
    updatePreview() {
        if (this.currentStep !== 4) return;
        
        // Update book preview
        const formData = new FormData(document.getElementById('book-workflow-form'));
        
        document.getElementById('preview-title').textContent = formData.get('title') || 'Book Title';
        
        const authorFirst = formData.get('author_first') || '';
        const authorLast = formData.get('author_last') || '';
        const authorDisplay = [authorFirst, authorLast].filter(Boolean).join(' ') || 'Author Name';
        document.getElementById('preview-author').textContent = authorDisplay;
        
        document.getElementById('preview-publisher').textContent = formData.get('publisher') || '-';
        document.getElementById('preview-year').textContent = formData.get('publication_year') || '-';
        document.getElementById('preview-isbn').textContent = formData.get('isbn') || '-';
        document.getElementById('preview-status').textContent = formData.get('status') || '-';
        
        const shelf = formData.get('location_shelf') || '';
        const section = formData.get('location_section') || '';
        const location = [shelf, section].filter(Boolean).join(' - ') || '-';
        document.getElementById('preview-location').textContent = location;
        
        document.getElementById('preview-summary').textContent = formData.get('summary') || '-';
        document.getElementById('preview-description').textContent = formData.get('description') || '-';
        
        // Update cover image
        if (this.uploadedImages.cover) {
            document.getElementById('preview-cover').src = this.uploadedImages.cover.url;
        }
        
        // Update collections
        const collectionsContainer = document.getElementById('preview-collections');
        if (this.selectedCollections.length > 0) {
            collectionsContainer.innerHTML = this.selectedCollections.map(collection => `
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${this.getCategoryColor(collection.category)}-100 text-${this.getCategoryColor(collection.category)}-800">
                    ${collection.name}
                </span>
            `).join('');
        } else {
            collectionsContainer.innerHTML = '<span class="text-gray-500 text-sm">No collections selected</span>';
        }
        
        // Update SEO preview
        const title = formData.get('title') || 'Book Title';
        const authorLast = formData.get('author_last') || 'author';
        const bookId = formData.get('id') || 'ID';
        document.getElementById('seo-title').textContent = `${title} - Hudson Street Library`;
        document.getElementById('seo-url').textContent = `https://hudsonstreetlibrary.com/books/${this.generateSlug(authorLast)}_${this.generateSlug(title)}_${bookId}`;

        const description = formData.get('summary') || formData.get('description') || 'Book description will appear here in search results...';
        document.getElementById('seo-description').textContent = description.substring(0, 160) + (description.length > 160 ? '...' : '');
    }

    generateSlug(title) {
        return title.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    updateChecklist() {
        const checks = {
            'check-title': !!document.getElementById('title').value,
            'check-status': !!document.getElementById('status').value,
            'check-image': !!this.uploadedImages.cover,
            'check-collections': this.selectedCollections.length > 0,
            'check-description': !!(document.getElementById('summary').value || document.getElementById('description').value)
        };
        
        Object.entries(checks).forEach(([checkId, isValid]) => {
            const element = document.getElementById(checkId);
            const icon = element.querySelector('i');
            
            if (isValid) {
                icon.className = 'fas fa-check text-green-500 mr-2';
            } else {
                icon.className = 'fas fa-times text-red-500 mr-2';
            }
        });
    }

    // Auto-save functionality
    setupAutoSave() {
        // Store interval ID so it can be cleared later
        this.autoSaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.autoSave();
            }
        }, 30000); // Auto-save every 30 seconds
    }

    // Cleanup method to prevent memory leaks
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    async autoSave() {
        try {
            const formData = this.collectFormData();
            
            const response = await fetch('/admin/api/books/auto-save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    ...formData,
                    collections: this.selectedCollections,
                    subjects: this.selectedSubjects,
                    images: this.uploadedImages
                })
            });
            
            if (response.ok) {
                this.isDirty = false;
                // Show subtle auto-save indicator
                this.showAutoSaveIndicator();
            }
            
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }

    showAutoSaveIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'fixed top-4 right-4 bg-green-100 text-green-800 px-3 py-2 rounded-lg text-sm z-50';
        indicator.innerHTML = '<i class="fas fa-check mr-2"></i>Auto-saved';
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }

    // Form submission
    async publishBook() {
        if (!this.validateAllFields()) {
            showToast('Please complete all required fields', 'error');
            return;
        }
        
        const publishBtn = document.getElementById('publish-btn');
        const originalText = publishBtn.innerHTML;
        
        try {
            publishBtn.disabled = true;
            publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Publishing...';
            
            const formData = this.collectFormData();
            
            const response = await fetch('/admin/api/books', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    ...formData,
                    collections: this.selectedCollections.map(c => c.id),
                    subjects: this.selectedSubjects,
                    cover_image_url: this.uploadedImages.cover?.url,
                    publish_status: document.querySelector('input[name="publish_status"]:checked')?.value || 'published'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                showToast('Book published successfully!', 'success');
                
                // Redirect to book detail page
                setTimeout(() => {
                    window.location.href = `/admin/books/${result.id}`;
                }, 1000);
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to publish book', 'error');
            }
            
        } catch (error) {
            console.error('Publish error:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            publishBtn.disabled = false;
            publishBtn.innerHTML = originalText;
        }
    }

    async saveDraft() {
        const formData = this.collectFormData();
        
        try {
            const response = await fetch('/admin/api/books/draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    ...formData,
                    collections: this.selectedCollections.map(c => c.id),
                    subjects: this.selectedSubjects,
                    cover_image_url: this.uploadedImages.cover?.url,
                    status: 'draft'
                })
            });
            
            if (response.ok) {
                showToast('Draft saved successfully!', 'success');
                this.isDirty = false;
            } else {
                showToast('Failed to save draft', 'error');
            }
            
        } catch (error) {
            console.error('Save draft error:', error);
            showToast('Network error. Please try again.', 'error');
        }
    }

    collectFormData() {
        const form = document.getElementById('book-workflow-form');
        const formData = new FormData(form);
        const data = {};
        
        // Convert FormData to regular object
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    // Batch operations
    setupBatchMode() {
        document.getElementById('close-batch-modal').addEventListener('click', () => {
            document.getElementById('batch-mode-modal').classList.add('hidden');
        });
        
        document.querySelectorAll('.batch-import-method').forEach(button => {
            button.addEventListener('click', (e) => {
                const method = e.currentTarget.dataset.method;
                this.loadBatchImportMethod(method);
                
                // Update button styles
                document.querySelectorAll('.batch-import-method').forEach(btn => {
                    btn.classList.remove('border-teal-500', 'bg-teal-50');
                });
                e.currentTarget.classList.add('border-teal-500', 'bg-teal-50');
            });
        });
    }

    openBatchMode() {
        document.getElementById('batch-mode-modal').classList.remove('hidden');
        this.loadBatchImportMethod('csv'); // Default to CSV
    }

    loadBatchImportMethod(method) {
        const content = document.getElementById('batch-import-content');
        
        switch (method) {
            case 'csv':
                content.innerHTML = this.getBatchCSVTemplate();
                this.setupCSVImport();
                break;
            case 'isbn':
                content.innerHTML = this.getBatchISBNTemplate();
                this.setupISBNBatch();
                break;
            case 'manual':
                content.innerHTML = this.getBatchManualTemplate();
                this.setupManualBatch();
                break;
        }
    }

    getBatchCSVTemplate() {
        return `
            <div class="space-y-4">
                <div>
                    <h4 class="text-sm font-medium text-gray-900 mb-2">Upload CSV File</h4>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input type="file" id="csv-file" accept=".csv" class="hidden">
                        <i class="fas fa-file-csv text-3xl text-gray-400 mb-3"></i>
                        <div class="text-sm text-gray-600 mb-2">
                            <button type="button" onclick="document.getElementById('csv-file').click()" class="text-teal-600 hover:text-teal-700">
                                Click to upload
                            </button> or drag and drop your CSV file
                        </div>
                        <div class="text-xs text-gray-500">
                            Maximum file size: 5MB
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="text-sm font-medium text-gray-900 mb-2">CSV Format Requirements</h4>
                    <div class="bg-gray-50 p-3 rounded-sm text-sm">
                        <div class="font-medium mb-2">Required columns:</div>
                        <div class="text-gray-600">title, status</div>
                        <div class="font-medium mt-3 mb-2">Optional columns:</div>
                        <div class="text-gray-600">author_first, author_last, publisher, publication_year, isbn, summary, description, tags, subjects</div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button type="button" class="btn-secondary" onclick="bookWorkflow.downloadSampleCSV()">
                        <i class="fas fa-download mr-2"></i>Download Sample CSV
                    </button>
                    <button type="button" id="process-csv" class="btn-primary" disabled>
                        <i class="fas fa-upload mr-2"></i>Process CSV
                    </button>
                </div>
            </div>
        `;
    }

    getBatchISBNTemplate() {
        return `
            <div class="space-y-4">
                <div>
                    <h4 class="text-sm font-medium text-gray-900 mb-2">ISBN List</h4>
                    <textarea id="isbn-list" rows="10" class="form-input w-full" 
                              placeholder="Enter one ISBN per line...&#10;9780123456789&#10;978-0-12-345678-9&#10;0123456789"></textarea>
                    <div class="text-sm text-gray-500 mt-2">
                        Enter one ISBN per line. Both ISBN-10 and ISBN-13 formats are supported.
                    </div>
                </div>
                
                <div>
                    <h4 class="text-sm font-medium text-gray-900 mb-2">Default Settings</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="batch-status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select id="batch-status" class="form-input w-full">
                                <option value="available">Available</option>
                                <option value="checked_out">Checked Out</option>
                                <option value="reserved">Reserved</option>
                            </select>
                        </div>
                        <div>
                            <label for="batch-section" class="block text-sm font-medium text-gray-700 mb-1">Section</label>
                            <input type="text" id="batch-section" class="form-input w-full" placeholder="e.g., Photography">
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button type="button" id="validate-isbns" class="btn-secondary">
                        <i class="fas fa-check mr-2"></i>Validate ISBNs
                    </button>
                    <button type="button" id="fetch-isbn-details" class="btn-primary" disabled>
                        <i class="fas fa-download mr-2"></i>Fetch Book Details
                    </button>
                </div>
            </div>
        `;
    }

    getBatchManualTemplate() {
        return `
            <div class="space-y-4">
                <div class="flex justify-between items-center">
                    <h4 class="text-sm font-medium text-gray-900">Quick Add Books</h4>
                    <button type="button" id="add-manual-book" class="btn-secondary text-sm">
                        <i class="fas fa-plus mr-1"></i>Add Book
                    </button>
                </div>
                
                <div id="manual-books-list" class="space-y-3 max-h-96 overflow-y-auto">
                    <!-- Manual book entries will be added here -->
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button type="button" id="clear-all-manual" class="btn-secondary">
                        <i class="fas fa-trash mr-2"></i>Clear All
                    </button>
                    <button type="button" id="save-manual-books" class="btn-primary" disabled>
                        <i class="fas fa-save mr-2"></i>Save All Books
                    </button>
                </div>
            </div>
        `;
    }

    // Utility functions
    getAuthToken() {
        // In a real implementation, this would retrieve the JWT token from localStorage or cookies
        return localStorage.getItem('auth_token') || '';
    }

    createLoadingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'loading-indicator flex items-center text-sm text-gray-500 mt-2';
        indicator.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
        return indicator;
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize workflow when page loads
let bookWorkflow;
document.addEventListener('DOMContentLoaded', function() {
    bookWorkflow = new BookWorkflow();
});

// Prevent navigation away with unsaved changes
window.addEventListener('beforeunload', function (e) {
    if (bookWorkflow && bookWorkflow.isDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});