const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Mapping of volume numbers to Nazraeli product page slugs
const volumes = [
  { num: 44, slug: 'sage-sohier-one-picture-book-two-44-to-utah-85', filename: 'Sohier_One_Picture_Book_Two_Vol_44_-_To_Utah_85_noISBN.jpg' },
  { num: 43, slug: 'jeff-dunas-one-picture-book-two-43-highway-61-to-honeyboy', filename: 'Dunas_One_Picture_Book_Two_Vol_43_-_Highway_61_to_Honeyboy_noISBN.jpg' },
  { num: 42, slug: 'mimi-plumb-one-picture-book-two-42-lookout-on-highway-74', filename: 'Plumb_One_Picture_Book_Two_Vol_42_-_Lookout_on_Highway_74_noISBN.jpg' },
  { num: 41, slug: 'lucas-foglia-one-picture-book-two-41-living-on-lava', filename: 'Foglia_One_Picture_Book_Two_Vol_41_-_Living_on_Lava_noISBN.jpg' },
  { num: 40, slug: 'carrie-mae-weems-one-picture-book-two-40-sea-islands-ap', filename: 'Weems_One_Picture_Book_Two_Vol_40_-_Sea_Islands_AP_noISBN.jpg' },
  { num: 1, slug: 'michael-kenna-one-picture-book-two-1-dmz-the-38th-parallel', filename: 'Kenna_One_Picture_Book_Two_Vol_1_-_DMZ_The_38th_Parallel_noISBN.jpg' },
];

const outputDir = path.join(__dirname, '../src/assets/images/books');

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function fetchImageUrl(slug) {
  return new Promise((resolve, reject) => {
    const url = `https://www.nazraeli.com/opb2/${slug}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Extract image URL from page HTML
        const match = data.match(/"image":\s*"(http[^"]+\.jpg[^"]*)"/);
        if (match) {
          resolve(match[1]);
        } else {
          reject(new Error(`Could not find image URL for ${slug}`));
        }
      });
    }).on('error', reject);
  });
}

async function processVolume(volume) {
  try {
    console.log(`\nProcessing Volume #${volume.num}...`);
    const imageUrl = await fetchImageUrl(volume.slug);
    console.log(`Found image URL: ${imageUrl.substring(0, 80)}...`);

    const filepath = path.join(outputDir, volume.filename);
    await downloadImage(imageUrl, filepath);

    // Wait a bit between requests to be polite
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`✗ Error processing Volume #${volume.num}: ${error.message}`);
  }
}

async function main() {
  console.log('Starting One Picture Book Two cover download...\n');

  for (const volume of volumes) {
    await processVolume(volume);
  }

  console.log('\n✓ Download complete!');
}

main().catch(console.error);
