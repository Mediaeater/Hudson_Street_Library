#!/usr/bin/env node

// News Pipeline CLI Interface
const NewsGenerator = require('./news-generator');
const BookEventPipeline = require('./event-pipeline');

class NewsPipelineCLI {
  constructor() {
    this.newsGenerator = new NewsGenerator();
    this.eventPipeline = new BookEventPipeline();
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const command = args[0];
    const options = this.parseOptions(args.slice(1));

    try {
      switch (command) {
        case 'generate':
          await this.handleGenerate(options);
          break;
        case 'add-book':
          await this.handleAddBook(options);
          break;
        case 'batch-books':
          await this.handleBatchBooks(options);
          break;
        case 'test':
          await this.handleTest(options);
          break;
        case 'status':
          await this.handleStatus(options);
          break;
        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Pipeline error: ${error.message}`);
      process.exit(1);
    }
  }

  async handleGenerate(options) {
    console.log('📰 Manual News Generation\n');
    
    const bookData = {
      title: options.title || 'Test Book',
      author_first_name: options.author_first || 'Test',
      author_last_name: options.author_last || 'Author',
      publisher: options.publisher || 'Test Publisher',
      year_published: options.year || '2024',
      isbn: options.isbn || '1234567890',
      subjects: options.subjects ? options.subjects.split(',') : ['photography'],
      summary: options.summary || 'A test book for the collection.'
    };

    const eventType = options.type || 'acquisition';
    
    console.log(`Generating news for: ${bookData.title} by ${bookData.author_first_name} ${bookData.author_last_name}`);
    
    const newsItem = await this.newsGenerator.generateNewsFromBook(bookData, eventType);
    
    console.log('\n✅ News item generated:');
    console.log(`   ID: ${newsItem.id}`);
    console.log(`   Title: ${newsItem.title}`);
    console.log(`   Category: ${newsItem.category}`);
    console.log(`   Featured: ${newsItem.featured}`);
    console.log(`   Excerpt: ${newsItem.excerpt}`);
  }

  async handleAddBook(options) {
    console.log('📚 Add New Book Pipeline\n');
    
    if (!options.title || !options.author_last) {
      console.error('❌ Title and author_last are required');
      console.log('Usage: node cli.js add-book --title "Book Title" --author_last "Author"');
      return;
    }

    const bookData = {
      title: options.title,
      author_first_name: options.author_first || '',
      author_last_name: options.author_last,
      publisher: options.publisher || '',
      year_published: options.year || new Date().getFullYear().toString(),
      isbn: options.isbn || '',
      subjects: options.subjects ? options.subjects.split(',') : [],
      summary: options.summary || ''
    };

    const pipelineOptions = {
      addToDatabase: !options.no_database,
      createPage: !options.no_page,
      processImages: !options.no_images,
      updateCollections: !options.no_collections,
      generateNews: !options.no_news,
      eventType: options.type || 'acquisition'
    };

    console.log(`Processing: ${bookData.title} by ${bookData.author_last_name}`);
    
    const result = await this.eventPipeline.processNewBook(bookData, pipelineOptions);
    
    console.log('\n✅ Book processing complete:');
    console.log(`   Events: ${result.events.join(', ')}`);
    console.log(`   Placement: ${result.results.placement?.type}/${result.results.placement?.collection}`);
    if (result.results.newsItem) {
      console.log(`   News: "${result.results.newsItem.title}"`);
    }
  }

  async handleBatchBooks(options) {
    console.log('📚 Batch Book Processing\n');
    
    if (!options.file) {
      console.error('❌ CSV file path required');
      console.log('Usage: node cli.js batch-books --file path/to/books.csv');
      return;
    }

    // This would load CSV and process each book
    console.log(`Loading books from: ${options.file}`);
    console.log('⚠️  Batch processing not yet implemented');
  }

  async handleTest(options) {
    console.log('🧪 Testing News Pipeline\n');
    
    // Test with sample book data
    const testBooks = [
      {
        title: 'Test Photography Book',
        author_first_name: 'Jane',
        author_last_name: 'Photographer',
        publisher: 'Aperture',
        year_published: '2024',
        isbn: '9781234567890',
        subjects: ['street photography', 'urban'],
        summary: 'A comprehensive look at contemporary street photography in urban environments.'
      },
      {
        title: 'Fashion Forward: Avant-Garde Design',
        author_first_name: 'Rei',
        author_last_name: 'Kawakubo',
        publisher: 'Fashion Institute',
        year_published: '2023',
        isbn: '9780987654321',
        subjects: ['fashion', 'design', 'avant-garde'],
        summary: 'Exploring radical approaches to fashion design and conceptual clothing.'
      }
    ];

    console.log('Testing news generation for sample books...\n');
    
    for (const book of testBooks) {
      console.log(`📖 Testing: ${book.title}`);
      
      try {
        const newsItem = await this.newsGenerator.generateNewsFromBook(book, 'acquisition');
        console.log(`   ✅ Generated: "${newsItem.title}"`);
        console.log(`   📝 Excerpt: ${newsItem.excerpt}`);
        console.log('');
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    }
  }

  async handleStatus(options) {
    console.log('ℹ️  News Pipeline Status\n');
    
    try {
      // Check news data
      const newsData = await this.newsGenerator.loadNewsData();
      console.log(`📰 News Items: ${newsData.length}`);
      
      if (newsData.length > 0) {
        const recent = newsData[0];
        console.log(`   Latest: "${recent.title}" (${recent.date})`);
        
        const featured = newsData.filter(item => item.featured);
        console.log(`   Featured: ${featured.length}`);
        
        const categories = [...new Set(newsData.map(item => item.category))];
        console.log(`   Categories: ${categories.join(', ')}`);
      }

      // Check pipeline configuration
      console.log('\n⚙️  Pipeline Configuration:');
      console.log(`   Auto News: ${this.eventPipeline.config.autoNews}`);
      console.log(`   Auto Images: ${this.eventPipeline.config.autoImageProcessing}`);
      console.log(`   Auto Collections: ${this.eventPipeline.config.autoCollectionAssignment}`);

    } catch (error) {
      console.error(`❌ Status check failed: ${error.message}`);
    }
  }

  parseOptions(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        const key = arg.substring(2).replace(/-/g, '_');
        const nextArg = args[i + 1];
        
        if (nextArg && !nextArg.startsWith('--')) {
          options[key] = nextArg;
          i++; // Skip next arg as it's a value
        } else {
          options[key] = true; // Boolean flag
        }
      }
    }
    
    return options;
  }

  showHelp() {
    console.log(`
📰 Hudson Street Library - News Pipeline CLI

USAGE:
  node cli.js <command> [options]

COMMANDS:
  generate     Generate a news item from book data
  add-book     Add a new book through complete pipeline
  batch-books  Process multiple books from CSV
  test         Run tests with sample data
  status       Show pipeline status

GENERATE OPTIONS:
  --title <title>        Book title
  --author-first <name>  Author first name
  --author-last <name>   Author last name (required)
  --publisher <pub>      Publisher name
  --year <year>          Publication year
  --isbn <isbn>          ISBN number
  --subjects <list>      Comma-separated subjects
  --summary <text>       Book summary
  --type <type>          Event type (acquisition, digitization, feature)

ADD-BOOK OPTIONS:
  --title <title>        Book title (required)
  --author-last <name>   Author last name (required)
  --author-first <name>  Author first name
  --publisher <pub>      Publisher name
  --year <year>          Publication year
  --isbn <isbn>          ISBN number
  --subjects <list>      Comma-separated subjects
  --summary <text>       Book summary
  --type <type>          Event type (acquisition, digitization, feature)
  --no-database          Skip database addition
  --no-page              Skip page creation
  --no-images            Skip image processing
  --no-collections       Skip collection updates
  --no-news              Skip news generation

BATCH-BOOKS OPTIONS:
  --file <path>          Path to CSV file with book data

EXAMPLES:
  # Generate news for a book
  node cli.js generate --title "Street Photography Today" --author-last "Smith" --type acquisition

  # Add a new book through complete pipeline
  node cli.js add-book --title "NYC in Photos" --author-last "Johnson" --subjects "nyc,photography"

  # Test the system
  node cli.js test

  # Check status
  node cli.js status

  # Process batch from CSV
  node cli.js batch-books --file ./new-acquisitions.csv
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new NewsPipelineCLI();
  cli.run().catch(error => {
    console.error(`💥 Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = NewsPipelineCLI;