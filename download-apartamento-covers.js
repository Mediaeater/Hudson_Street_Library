const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'src', 'assets', 'images', 'magazines', 'apartamento');

// Ensure directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to download image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

// Function to fetch page and extract image URL
function getImageUrl(issueNumber) {
  return new Promise((resolve, reject) => {
    const url = `https://www.apartamentomagazine.com/product/issue-${issueNumber}/`;

    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        // Look for the main product image
        // Common patterns: woocommerce-product-gallery__image, wp-post-image, product image
        const patterns = [
          /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/,
          /<div class="woocommerce-product-gallery__image"[^>]*>.*?<img[^>]+src="([^"]+)"/s,
          /<img[^>]+data-src="([^"]+)"[^>]*class="[^"]*attachment-shop_single[^"]*"/,
          /<meta property="og:image" content="([^"]+)"/
        ];

        let imageUrl = null;
        for (const pattern of patterns) {
          const match = data.match(pattern);
          if (match) {
            imageUrl = match[1];
            break;
          }
        }

        if (imageUrl) {
          // Clean up URL if needed
          imageUrl = imageUrl.split('?')[0]; // Remove query params
          resolve(imageUrl);
        } else {
          reject(new Error(`Could not find image URL for issue ${issueNumber}`));
        }
      });
    }).on('error', reject);
  });
}

// Download all covers
async function downloadAllCovers() {
  const issues = Array.from({ length: 34 }, (_, i) => i + 3); // Issues 3-36

  for (const issue of issues) {
    try {
      console.log(`Fetching image URL for issue #${issue}...`);
      const imageUrl = await getImageUrl(issue);
      console.log(`Found: ${imageUrl}`);

      const filepath = path.join(outputDir, `apartamento-${issue}.jpg`);
      console.log(`Downloading to: ${filepath}`);

      await downloadImage(imageUrl, filepath);
      console.log(`✓ Downloaded issue #${issue}`);

      // Small delay to be nice to the server
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`✗ Failed to download issue #${issue}:`, error.message);
    }
  }

  console.log('\nDownload complete!');
}

downloadAllCovers();
