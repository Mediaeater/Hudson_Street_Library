const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

async function fetchButtCovers() {
  const baseUrl = 'https://buttmagazine.com/library/';
  const issueData = [];

  console.log('Fetching Butt Magazine library page...');

  try {
    // Fetch the main library page
    const response = await axios.get(baseUrl);
    const $ = cheerio.load(response.data);

    // Find all issue links
    $('a[href*="/library/butt-"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const issueMatch = href.match(/butt-(\d+)/);

      if (issueMatch) {
        const issueNum = parseInt(issueMatch[1]);
        if (issueNum >= 3 && issueNum <= 37) {
          // Try to find image in the link
          const img = $(elem).find('img');
          let imgSrc = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');

          issueData.push({
            issue: issueNum,
            url: href,
            imageSrc: imgSrc
          });
        }
      }
    });

    // Sort by issue number
    issueData.sort((a, b) => a.issue - b.issue);

    console.log(`\nFound ${issueData.length} issues:`);
    issueData.forEach(item => {
      console.log(`Issue #${item.issue}: ${item.imageSrc || 'No image found'}`);
    });

    // Save to JSON
    await fs.writeFile(
      path.join(__dirname, 'butt-covers.json'),
      JSON.stringify(issueData, null, 2)
    );

    console.log('\nSaved to scripts/butt-covers.json');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchButtCovers();
