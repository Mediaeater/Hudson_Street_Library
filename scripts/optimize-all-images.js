#!/usr/bin/env node

const Image = require('@11ty/eleventy-img');
const fs = require('fs').promises;
const path = require('path');

async function findAllImages(dir) {
  const images = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subImages = await findAllImages(fullPath);
      images.push(...subImages);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        images.push(fullPath);
      }
    }
  }
  
  return images;
}

async function optimizeImage(imagePath) {
  const outputDir = path.join(__dirname, '../_site/assets/images/optimized');
  
  try {
    console.log(`📸 Optimizing: ${path.relative(process.cwd(), imagePath)}`);
    
    const stats = await Image(imagePath, {
      widths: [300, 600, 900, 1200],
      formats: ['webp', 'jpeg'],
      outputDir: outputDir,
      urlPath: '/assets/images/optimized/',
      filenameFormat: function (id, src, width, format) {
        const originalName = path.basename(src, path.extname(src));
        return `${originalName}-${width}w.${format}`;
      }
    });
    
    const sizes = Object.keys(stats).map(format => stats[format].length).reduce((a, b) => a + b, 0);
    console.log(`   ✅ Generated ${sizes} optimized variants`);
    
    return stats;
    
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Image Optimization...\n');
  
  const assetsDir = path.join(__dirname, '../src/assets/images');
  
  try {
    // Find all images
    console.log('🔍 Scanning for images...');
    const allImages = await findAllImages(assetsDir);
    console.log(`Found ${allImages.length} images to optimize\n`);
    
    if (allImages.length === 0) {
      console.log('No images found to optimize.');
      return;
    }
    
    // Create output directory
    const outputDir = path.join(__dirname, '../_site/assets/images/optimized');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Optimize images in batches
    const batchSize = 5;
    let processed = 0;
    let successful = 0;
    
    for (let i = 0; i < allImages.length; i += batchSize) {
      const batch = allImages.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allImages.length/batchSize)}`);
      
      const promises = batch.map(async (imagePath) => {
        const result = await optimizeImage(imagePath);
        processed++;
        if (result) successful++;
        return result;
      });
      
      await Promise.all(promises);
    }
    
    console.log(`\n✅ Optimization Complete!`);
    console.log(`   Processed: ${processed} images`);
    console.log(`   Successful: ${successful} images`);
    console.log(`   Failed: ${processed - successful} images`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { optimizeImage, findAllImages };