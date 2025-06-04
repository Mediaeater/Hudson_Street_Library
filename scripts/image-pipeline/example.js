#!/usr/bin/env node

// Example usage of the Image Pipeline
const ImagePipeline = require('./image-pipeline');
const path = require('path');

async function runExample() {
  console.log('🎯 Hudson Street Library - Image Pipeline Example\n');
  
  // Initialize pipeline
  const pipeline = new ImagePipeline();
  await pipeline.initialize();
  
  try {
    // Example 1: Find a book cover by ISBN
    console.log('📖 Example 1: Finding book cover by ISBN');
    const isbn = '9780262035620'; // Example ISBN
    const result = await pipeline.finder.findBookImage(isbn);
    
    if (result) {
      console.log(`✅ Found image: ${result.source}`);
      console.log(`📥 Local path: ${result.localPath}`);
      
      // Example 2: Optimize the downloaded image
      console.log('\n⚡ Example 2: Optimizing downloaded image');
      const optimized = await pipeline.optimizer.optimizeImage(result.localPath);
      console.log(`✅ Generated ${optimized.optimized.length + optimized.thumbnails.length} variants`);
      
      // Example 3: Categorize the image
      console.log('\n🏷️  Example 3: Categorizing image');
      const category = await pipeline.categorizer.categorizeImage(result.localPath, {
        bookInfo: result.bookInfo,
        metadata: { isbn }
      });
      console.log(`✅ Categorized as: ${category}`);
      
      // Example 4: Get categorization suggestions
      console.log('\n💡 Example 4: Getting category suggestions');
      const suggestions = await pipeline.categorizer.suggestCategories(result.localPath, {
        bookInfo: result.bookInfo
      });
      
      if (suggestions.length > 0) {
        console.log('📋 Category suggestions:');
        suggestions.forEach((s, i) => {
          console.log(`   ${i + 1}. ${s.category} (${Math.round(s.confidence * 100)}%)`);
        });
      }
      
    } else {
      console.log('❌ No image found for ISBN');
    }
    
    // Example 5: Pipeline statistics
    console.log('\n📊 Example 5: Pipeline statistics');
    pipeline.printStats();
    
    // Example 6: Generate reports
    console.log('\n📋 Example 6: Optimization report');
    const optimizationReport = await pipeline.optimizer.getOptimizationReport();
    console.log(`Optimized images: ${optimizationReport.optimizedCount}`);
    console.log(`Thumbnails: ${optimizationReport.thumbnailCount}`);
    console.log(`Total size: ${optimizationReport.totalSizeMB} MB`);
    
  } catch (error) {
    console.error(`❌ Example failed: ${error.message}`);
  }
  
  console.log('\n✨ Example complete!');
  console.log('\nNext steps:');
  console.log('- Try: node cli.js upload --path ./your-images');
  console.log('- Try: node cli.js process');
  console.log('- Try: node cli.js find --missing --download --limit 5');
  console.log('- Try: node cli.js report --metadata --path ./src/assets/images');
}

// Run example
if (require.main === module) {
  runExample().catch(error => {
    console.error(`💥 Example error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = runExample;