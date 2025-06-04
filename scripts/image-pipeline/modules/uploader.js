// Image Upload and Folder Management Module
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ImageUploader {
  constructor(config) {
    this.config = config;
  }

  async uploadImage(imagePath, options = {}) {
    console.log(`📤 Uploading image: ${path.basename(imagePath)}`);
    
    try {
      // Validate file exists and is readable
      await fs.access(imagePath, fs.constants.R_OK);
      
      // Generate unique filename to prevent conflicts
      const filename = await this.generateUniqueFilename(imagePath);
      const uploadPath = path.join(this.config.directories.incoming, filename);
      
      // Copy to incoming directory
      await fs.copyFile(imagePath, uploadPath);
      
      console.log(`✅ Uploaded to: ${uploadPath}`);
      return uploadPath;
      
    } catch (error) {
      console.error(`❌ Upload failed: ${error.message}`);
      throw error;
    }
  }

  async uploadMultiple(imagePaths, options = {}) {
    console.log(`📤 Uploading ${imagePaths.length} images...`);
    
    const results = [];
    for (const imagePath of imagePaths) {
      try {
        const uploadedPath = await this.uploadImage(imagePath, options);
        results.push({ 
          success: true, 
          originalPath: imagePath, 
          uploadedPath 
        });
      } catch (error) {
        results.push({ 
          success: false, 
          originalPath: imagePath, 
          error: error.message 
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Successfully uploaded ${successful}/${imagePaths.length} images`);
    
    return results;
  }

  async scanFolder(folderPath, options = {}) {
    console.log(`📁 Scanning folder: ${folderPath}`);
    
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      const imageFiles = [];
      
      for (const file of files) {
        const fullPath = path.join(folderPath, file.name);
        
        if (file.isFile() && this.isImageFile(file.name)) {
          imageFiles.push(fullPath);
        } else if (file.isDirectory() && options.recursive) {
          const subFiles = await this.scanFolder(fullPath, options);
          imageFiles.push(...subFiles);
        }
      }
      
      console.log(`📊 Found ${imageFiles.length} image files`);
      return imageFiles;
      
    } catch (error) {
      console.error(`❌ Scan failed: ${error.message}`);
      throw error;
    }
  }

  async addToIncoming(sourcePath, metadata = {}) {
    console.log(`➕ Adding to incoming: ${path.basename(sourcePath)}`);
    
    try {
      const filename = this.generateDescriptiveFilename(sourcePath, metadata);
      const incomingPath = path.join(this.config.directories.incoming, filename);
      
      await fs.copyFile(sourcePath, incomingPath);
      
      // Create metadata sidecar file
      const metadataPath = incomingPath + '.meta.json';
      await fs.writeFile(metadataPath, JSON.stringify({
        originalPath: sourcePath,
        addedAt: new Date().toISOString(),
        metadata
      }, null, 2));
      
      console.log(`✅ Added to incoming with metadata`);
      return { imagePath: incomingPath, metadataPath };
      
    } catch (error) {
      console.error(`❌ Failed to add to incoming: ${error.message}`);
      throw error;
    }
  }

  async organizeIncoming() {
    console.log(`🗂️  Organizing incoming directory...`);
    
    try {
      const incomingDir = this.config.directories.incoming;
      const files = await fs.readdir(incomingDir);
      
      const organized = {
        images: [],
        metadata: [],
        processed: 0
      };
      
      for (const file of files) {
        const filePath = path.join(incomingDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          if (this.isImageFile(file)) {
            organized.images.push(filePath);
          } else if (file.endsWith('.meta.json')) {
            organized.metadata.push(filePath);
          }
        }
      }
      
      console.log(`📊 Incoming inventory:`);
      console.log(`   Images: ${organized.images.length}`);
      console.log(`   Metadata files: ${organized.metadata.length}`);
      
      return organized;
      
    } catch (error) {
      console.error(`❌ Failed to organize incoming: ${error.message}`);
      throw error;
    }
  }

  async generateUniqueFilename(originalPath) {
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(originalPath + timestamp).digest('hex').substring(0, 8);
    
    return `${basename}_${timestamp}_${hash}${ext}`;
  }

  generateDescriptiveFilename(originalPath, metadata = {}) {
    const ext = path.extname(originalPath);
    let name = path.basename(originalPath, ext);
    
    // Add metadata to filename if available
    if (metadata.title) {
      name = this.sanitizeFilename(metadata.title);
    } else if (metadata.isbn) {
      name = `isbn_${metadata.isbn}`;
    }
    
    return `${name}${ext}`;
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w\-_.]/g, '')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.config.supportedTypes.includes(ext);
  }

  async getIncomingCount() {
    try {
      const files = await fs.readdir(this.config.directories.incoming);
      return files.filter(file => this.isImageFile(file)).length;
    } catch {
      return 0;
    }
  }

  async clearProcessed() {
    console.log(`🗑️  Clearing processed files...`);
    
    const processedDir = this.config.directories.processing;
    try {
      const files = await fs.readdir(processedDir);
      let cleared = 0;
      
      for (const file of files) {
        await fs.unlink(path.join(processedDir, file));
        cleared++;
      }
      
      console.log(`✅ Cleared ${cleared} processed files`);
      return cleared;
    } catch (error) {
      console.error(`❌ Failed to clear processed files: ${error.message}`);
      return 0;
    }
  }
}

module.exports = ImageUploader;