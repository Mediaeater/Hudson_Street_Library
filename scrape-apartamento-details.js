const https = require('https');
const fs = require('fs');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');

// Function to fetch URL content
function fetchURL(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Function to extract issue details from archive page
function extractIssueDetails(html, issueNumber) {
    const details = {
        season: '',
        year: '',
        cover: '',
        contributors: [],
        description: ''
    };

    // Extract season/year (e.g., "Autumn/Winter 2012-13")
    const seasonMatch = html.match(/(Spring\/Summer|Autumn\/Winter)\s+(\d{4}(?:-\d{2,4})?)/i);
    if (seasonMatch) {
        details.season = seasonMatch[1];
        details.year = seasonMatch[2].split('-')[0]; // Get first year
    }

    // Extract cover subject
    const coverMatch = html.match(/Cover(?:\s+Subject)?:?\s*([^<\n]+)/i) ||
                      html.match(/<h2[^>]*>([^<]+)<\/h2>/);
    if (coverMatch) {
        details.cover = coverMatch[1].trim();
    }

    // Extract contributors (look for lists of names)
    const contributorsSection = html.match(/Contributors?:?\s*<ul[^>]*>(.*?)<\/ul>/is) ||
                               html.match(/Featured:?\s*<ul[^>]*>(.*?)<\/ul>/is);
    if (contributorsSection) {
        const names = contributorsSection[1].match(/<li[^>]*>([^<]+)/g);
        if (names) {
            details.contributors = names.map(n => n.replace(/<li[^>]*>/, '').trim());
        }
    }

    return details;
}

async function main() {
    console.log('Scraping Apartamento issue details...\n');

    // Read existing CSV
    const csvPath = './src/_data/books.csv';
    const books = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
            .pipe(csv())
            .on('data', (row) => books.push(row))
            .on('end', resolve)
            .on('error', reject);
    });

    // Process Apartamento issues
    for (let i = 3; i <= 36; i++) {
        const issueTitle = `Apartamento Issue ${i}`;
        const bookIndex = books.findIndex(b => b.title === issueTitle);

        if (bookIndex === -1) {
            console.log(`⚠️  ${issueTitle} not found in CSV`);
            continue;
        }

        try {
            console.log(`Fetching details for ${issueTitle}...`);
            const url = `https://www.apartamentomagazine.com/magazine/issue-${i}/`;
            const html = await fetchURL(url);
            const details = extractIssueDetails(html, i);

            // Update CSV row
            if (details.year) {
                books[bookIndex].publication_year = details.year;
            }

            if (details.cover || details.contributors.length > 0) {
                let desc = `Apartamento is a biannual interior design magazine exploring lived-in spaces and the lives of their inhabitants. `;

                if (details.season && details.year) {
                    desc += `Issue ${i} (${details.season} ${details.year})`;
                } else {
                    desc += `Issue ${i}`;
                }

                if (details.cover) {
                    desc += ` features ${details.cover} on the cover`;
                }

                if (details.contributors.length > 0 && details.contributors.length <= 10) {
                    desc += `. Contributors include: ${details.contributors.slice(0, 10).join(', ')}`;
                } else if (details.contributors.length > 10) {
                    desc += `. Contributors include: ${details.contributors.slice(0, 10).join(', ')}, and others`;
                }

                desc += '.';
                books[bookIndex].description = desc;
            }

            console.log(`✓ ${issueTitle}: ${details.year || 'no year'}, ${details.contributors.length} contributors`);

            // Small delay to be polite
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.log(`✗ ${issueTitle}: ${error.message}`);
        }
    }

    // Write back to CSV
    const headers = Object.keys(books[0]);
    const csvData = stringify(books, { header: true, columns: headers });

    fs.writeFileSync(csvPath, csvData);
    console.log(`\n✓ Updated ${csvPath}`);
}

main().catch(console.error);
