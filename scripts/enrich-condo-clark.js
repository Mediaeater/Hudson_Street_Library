const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csv = fs.readFileSync('src/_data/books.csv', 'utf-8');
const records = parse(csv, { columns: true });

// Find and update George Condo book (ID 1759)
const condoBook = records.find(r => r.id === '1759');
if (condoBook) {
  condoBook.isbn = '9786185039455';
  condoBook.height = '25.4'; // 10 inches
  condoBook.width = '25.4';  // 10 inches
  condoBook.num_images = '85'; // 78 color + 7 b&w
  condoBook.pub_date = '2026-05-26';

  condoBook.description = `Exhibition catalog for George Condo's "The Mad and the Lonely" at DESTE Foundation Project Space, Slaughterhouse, Hydra, Greece (June 18–October 31, 2024). This intimate presentation of small-scale paintings and sculptures explores themes of madness, loneliness, and psychological isolation through Condo's signature "Psychological Cubism" style—his groundbreaking approach that departs from classical Cubism by representing multiple emotional and psychological states simultaneously within a single figure rather than multiple spatial perspectives.

Born in 1957, George Condo emerged from the 1980s East Village art scene alongside Jean-Michel Basquiat and Keith Haring as a pioneer of Neo-Expressionist revival. His work synthesizes Old Master painting techniques with American pop sensibility and cartoon aesthetics, creating what he terms "Artificial Realism." Condo's distorted figures with exaggerated features—bulbous faces, skewed limbs, protruding eyes—authentically represent the emotional complexity and psychological contradictions of modern life.

For this special installation at the historic Slaughterhouse venue on Hydra, Condo incorporated ancient polychromatic Greek painting methods with minimalist sculpture, creating a unique site-specific presentation. The works depict "disparate souls rejected by society," captured in portraits installed within the former animal cages of the slaughterhouse—a haunting architectural dialogue between containment, isolation, and psychological states. The exhibition represents Condo's ongoing investigation into what he describes as "the disjointed human psyche," offering both hideous examination and dark humor.

The DESTE Foundation for Contemporary Art, established in 1983 by Greek collector Dakis Joannou, operates the Slaughterhouse Project Space as an annual summer exhibition venue featuring site-specific installations by internationally significant contemporary artists. Condo's work is held in major museum collections including MoMA, The Metropolitan Museum of Art, Whitney Museum, and Louisiana Museum of Modern Art. A major retrospective at Musée d'Art Moderne de Paris (October 2025–February 2026) surveyed his 50+ year career.`;

  condoBook.notes = `Exhibition at DESTE Foundation Project Space, Slaughterhouse, Hydra, Greece (June 18–October 31, 2024). Format: 10 × 10 inches, 116 pages. 78 color and 7 b&w illustrations. Published May 26, 2026. George Condo (b. 1957) coined the term "Psychological Cubism" to describe his artistic approach. His work is in collections at MoMA, Metropolitan Museum, Whitney Museum, Louisiana Museum, Albright-Knox, Corcoran Gallery, and The Broad. Major retrospective at Musée d'Art Moderne de Paris (2025-2026). Signed copy.`;

  console.log('✅ Updated George Condo book');
}

// Find and update Larry Clark book (ID 1760)
const clarkBook = records.find(r => r.id === '1760');
if (clarkBook) {
  clarkBook.description = `Collaborative artist book presenting photographs by Larry Clark paired with drawings by James Gilroy, documenting ten interconnected narratives shared between two lifelong friends who first met in downtown New York during the early 1970s. The stories span their parallel experiences from the 1950s through the 1970s and beyond, preserved as transcriptions of recorded conversations between the artists—candid recollections of youth, artistic life, danger, liberation, and survival in an era that claimed many of their peers.

Larry Clark (b. 1943, Tulsa, Oklahoma) pioneered confessional documentary photography with his groundbreaking photobook Tulsa (1971), which intimately documented drug use, sex, and violence among teenagers in his hometown between 1963-1971. The book caused a sensation within the photographic community and established Clark's raw, uninhibited approach that influenced generations of photographers including Nan Goldin and Ryan McGinley. His 1995 film Kids, written by 19-year-old Harmony Korine, became an instant classic that defined youth culture in 1990s New York. Clark's work fundamentally challenged boundaries of acceptable subject matter and photographer-subject relationships.

James Gilroy (b. 1948, New York City) is a contemporary abstract figurative painter formally trained at The New York Phoenix School of Design and Art Students League of New York, where he studied for over a decade. His practice emphasizes layered color that "transmutes and blends together as an alchemy of color," combining rigorous anatomical understanding with emotional expressionism. Gilroy represents the New York figurative expressionist tradition, bringing visual painting practice to complement Clark's photographic eye.

The two met through mutual connection Ralph Gibson in the early 1970s and "became fast friends" amid the social upheaval of downtown Manhattan. As Gilroy recalls: "Back then, you walked down the block and maybe ran into somebody or into a situation. We'd just get pulled into something every day." Economic conditions allowed them to "work two or three days and make enough cash for the month" then travel extensively. Many of their peers didn't survive the era's dangerous lifestyle. Now in their 80s and 70s, Clark and Gilroy remain "still standing," offering rare perspective on both the liberation and tragedy of that formative period.

Published by Dashwood Projects in conjunction with their March 25–April 4, 2026 exhibition. Dashwood Projects opened in 2024 as the exhibition and publishing extension of Dashwood Books, the influential independent photography bookstore founded in 2005 by David Strettell (formerly Cultural Director of Magnum Photos). The collaboration represents a mature, reflective perspective on an era that shaped contemporary photography and art, filtered through multiple artistic practices and decades of friendship.`;

  clarkBook.notes = `Exhibition at Dashwood Projects, New York (March 25–April 4, 2026). Book signing March 26, 2026. 94 pages softcover. Larry Clark (b. 1943) is renowned for Tulsa (1971), Teenage Lust (1983), and Kids (1995 film). James Gilroy (b. 1948) trained at Art Students League of New York. The artists met in downtown NYC in early 1970s through Ralph Gibson. Clark's work is foundational to confessional documentary photography and influenced Nan Goldin, Ryan McGinley, and contemporary photographers. This collaboration documents ten narratives from their shared experiences across five decades. Signed copy.`;

  console.log('✅ Updated Larry Clark & James Gilroy book');
}

// Write updated CSV
fs.writeFileSync('src/_data/books.csv', stringify(records, { header: true, quoted: true }));
console.log('✅ CSV updated with enriched book data');
