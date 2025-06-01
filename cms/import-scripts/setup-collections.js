// Setup collections in Directus before importing
const { createDirectus, rest, authentication, createCollection, createField } = require('@directus/sdk');

const API_URL = 'http://localhost:8055';
const EMAIL = 'admin@hudsonstreetlibrary.org';
const PASSWORD = 'HudsonLibrary123!';

const directus = createDirectus(API_URL)
  .with(authentication())
  .with(rest());

async function setupCollections() {
  try {
    console.log('Setting up collections...');
    
    // Authenticate
    await directus.login(EMAIL, PASSWORD);
    console.log('Authenticated successfully');

    // Create books collection
    try {
      await directus.request(createCollection({
        collection: 'books',
        meta: {
          singleton: false,
          icon: 'book',
          display_template: '{{title}} - {{author_first_name}} {{author_last_name}}'
        }
      }));
      console.log('Created books collection');
    } catch (error) {
      if (error.errors?.[0]?.message?.includes('already exists')) {
        console.log('Books collection already exists');
      } else {
        throw error;
      }
    }

    // Create fields for books collection
    const bookFields = [
      { field: 'status', type: 'string', interface: 'select-dropdown' },
      { field: 'author_last_name', type: 'string', interface: 'input' },
      { field: 'author_first_name', type: 'string', interface: 'input' },
      { field: 'title', type: 'string', interface: 'input' },
      { field: 'publisher', type: 'string', interface: 'input' },
      { field: 'publication_date', type: 'string', interface: 'input' },
      { field: 'dimensions', type: 'string', interface: 'input' },
      { field: 'physical_description', type: 'text', interface: 'input-multiline' },
      { field: 'edition', type: 'string', interface: 'input' },
      { field: 'isbn', type: 'string', interface: 'input' },
      { field: 'contributors', type: 'text', interface: 'input-multiline' },
      { field: 'summary', type: 'text', interface: 'input-multiline' },
      { field: 'subjects', type: 'json', interface: 'tags' },
      { field: 'location', type: 'string', interface: 'input' },
      { field: 'price', type: 'float', interface: 'input' },
      { field: 'date_added', type: 'timestamp', interface: 'datetime' }
    ];

    for (const fieldConfig of bookFields) {
      try {
        await directus.request(createField('books', {
          field: fieldConfig.field,
          type: fieldConfig.type,
          meta: {
            interface: fieldConfig.interface
          }
        }));
        console.log(`Created field: ${fieldConfig.field}`);
      } catch (error) {
        if (error.errors?.[0]?.message?.includes('already exists')) {
          console.log(`Field ${fieldConfig.field} already exists`);
        } else {
          console.error(`Error creating field ${fieldConfig.field}:`, error.message);
        }
      }
    }

    console.log('\nCollections setup complete!');
    console.log('You can now run the import script.');

  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupCollections();