const fs = require('fs');

const newsPath = 'src/_data/news.json';
const news = JSON.parse(fs.readFileSync(newsPath, 'utf-8'));

// Find March 2026 acquisitions news item (ID 12)
const marchNews = news.find(n => n.id === 12);

if (marchNews) {
  // Update Condo paragraph to add "Signed copy."
  marchNews.content = marchNews.content.replace(
    'Condo\'s work is held in collections at MoMA, The Metropolitan Museum, and Whitney Museum.</p>',
    'Condo\'s work is held in collections at MoMA, The Metropolitan Museum, and Whitney Museum. <em>Signed copy.</em></p>'
  );

  // Update Clark paragraph to add "Signed copy."
  marchNews.content = marchNews.content.replace(
    'Published in conjunction with the Dashwood Projects exhibition (March 25–April 4, 2026).</p>',
    'Published in conjunction with the Dashwood Projects exhibition (March 25–April 4, 2026). <em>Signed copy.</em></p>'
  );

  // Update One Picture Book intro to mention signed prints
  marchNews.content = marchNews.content.replace(
    'Four essential volumes from Nazraeli\'s acclaimed limited edition series, each limited to 500 numbered copies with removable signed prints:',
    'Four essential volumes from Nazraeli\'s acclaimed limited edition series, each limited to 500 numbered copies and including a removable, signed, original print (approximately 5×7 inches):'
  );

  // Update Desjardin paragraph to add "Signed copy."
  marchNews.content = marchNews.content.replace(
    'This comprehensive study explores how artists have used the book form as primary artistic medium, from conceptual art to contemporary publishing practices.</p>',
    'This comprehensive study explores how artists have used the book form as primary artistic medium, from conceptual art to contemporary publishing practices. <em>Signed copy.</em></p>'
  );

  console.log('✅ Updated March 2026 news item with signed copy notations');
} else {
  console.log('❌ March 2026 news item not found');
}

// Write updated news
fs.writeFileSync(newsPath, JSON.stringify(news, null, 2));
console.log('✅ Saved updated news.json');
