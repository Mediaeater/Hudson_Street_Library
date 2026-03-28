const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csv = fs.readFileSync('src/_data/books.csv', 'utf-8');
const records = parse(csv, { columns: true });

// Find and update Ink Drawings (ID 241)
const inkDrawings = records.find(r => r.id === '241');
if (inkDrawings) {
  inkDrawings.isbn_asin = '9780957529724';
  inkDrawings.publication_year = '2014';
  inkDrawings.height_cm = '26.0';
  inkDrawings.width_cm = '21.0';
  inkDrawings.page_count = '64';
  inkDrawings.binding = 'Paperback';
  inkDrawings.num_images = '60';

  inkDrawings.description = `<p>Exhibition catalog documenting George Condo's monumental ink drawings created over a six-month period in 2013-2014, marking a significant new direction in his practice. Published for Condo's solo exhibition at Skarstedt Gallery London (February 11–April 5, 2014), this catalog features full-plate images, details, and foldouts revealing the artist's exploration of "the extreme possibilities of ink on paper." Working with transparent color layers, Condo positioned his signature distorted figures within abstract spaces, drawing conceptual inspiration from color field painting techniques while maintaining his distinctive psychological intensity.</p>

<p>Born in 1957, George Condo pioneered "Psychological Cubism," his groundbreaking approach that departs from classical Cubism by representing multiple emotional and psychological states simultaneously within single figures rather than multiple spatial perspectives. Emerging from the 1980s East Village art scene alongside Jean-Michel Basquiat and Keith Haring, Condo developed his signature "Artificial Realism"—a synthesis of Old Master painting techniques with American pop sensibility and cartoon aesthetics. His distorted figures with bulbous faces, skewed limbs, and protruding eyes authentically represent the emotional complexity and psychological contradictions of modern life.</p>

<p>This body of ink drawings demonstrates Condo's continued investigation into the relationship between abstraction and figuration. The monumental scale of these works on paper—many approaching the size of paintings—allowed Condo to explore layered transparency and color interaction in ways distinct from his oil paintings. By positioning figures within abstract color fields, he created a dialogue between gestural abstraction and his psychological portraiture, expanding his vocabulary while remaining true to his exploration of "the disjointed human psyche."</p>

<p>The 64-page catalog, illustrated in color throughout with details and foldouts, provides intimate access to this exceptional series. Condo's work is held in major museum collections including MoMA, The Metropolitan Museum of Art, Whitney Museum, Louisiana Museum of Modern Art, Albright-Knox Art Gallery, Corcoran Gallery, and The Broad. Published by Skarstedt Gallery in an edition of limited availability.</p>`;

  inkDrawings.notes = `Exhibition at Skarstedt Gallery, London (February 11–April 5, 2014). Format: 26 × 21 cm (10.25 × 8.25 inches), 64 pages. Paperback, illustrated in color throughout. Published July 1, 2014. ISBN: 978-0-9575297-2-4. Monumental ink drawings created over six-month period exploring transparent color layers and abstract space. George Condo (b. 1957) coined the term "Psychological Cubism." His work is in collections at MoMA, Metropolitan Museum, Whitney Museum, Louisiana Museum, and The Broad.`;

  console.log('✅ Updated Ink Drawings (ID 241)');
}

// Find and update Painting Reconfigured (ID 242)
const paintingReconfig = records.find(r => r.id === '242');
if (paintingReconfig) {
  paintingReconfig.publication_year = '2015';
  paintingReconfig.page_count = '288';
  paintingReconfig.num_images = '250';
  paintingReconfig.image_url = '/assets/images/books/baker_simon_george_condo_painting_reconfigured_9780500093948.jpg';

  paintingReconfig.description = `<p>The definitive monograph on George Condo's career from 1984 to 2015, written by art historian and curator Simon Baker working in close collaboration with the artist. This comprehensive 288-page volume combines biographical, chronological, and thematic approaches to survey Condo's outrageous, unorthodox painting practice. With over 250 illustrations, the book includes an introductory essay on Condo's contradictory nature, a chapter exploring his phenomenal early career in the 1980s East Village scene, and three thematic chapters tracing his systematic reconstruction of painting techniques from Abstract Expressionism to Old Master traditions.</p>

<p>Born in 1957 in Concord, New Hampshire, George Condo emerged as a pioneer of Neo-Expressionist revival, coining the term "Psychological Cubism" to describe his approach of representing multiple emotional and psychological states simultaneously within single figures. Unlike classical Cubism's multiple spatial perspectives, Condo's fragmented faces and distorted bodies depict the internal contradictions and psychological complexity of his subjects. His "Artificial Realism" synthesizes Old Master technical precision with American pop culture, cartoon aesthetics, and visceral psychological content—creating what he describes as authentic representations of "the disjointed human psyche."</p>

<p>The volume explores Condo's relationship to abstraction, examining how he alternates between figuration and pure abstraction while maintaining psychological intensity throughout. Baker analyzes the darker dimensions of Condo's iconography—the grotesque faces, violent distortions, and unsettling humor that characterize his portrait subjects. The book traces influences from Velázquez, Goya, and Picasso to de Kooning and Guston, revealing how Condo reconstructs painting history through his distinctive lens. His approach combines technical virtuosity with deliberately crude passages, academic precision with cartoon simplicity, beauty with horror.</p>

<p>Published by Thames & Hudson in hardcover format with 288 pages and over 250 color illustrations. George Condo's work is held in major museum collections including MoMA, The Metropolitan Museum of Art, Whitney Museum, Louisiana Museum of Modern Art, Albright-Knox Art Gallery, Corcoran Gallery, Solomon R. Guggenheim Museum, and The Broad. Major retrospectives have been presented at New Museum (2011), Hayward Gallery (2011-2012), and Musée d'Art Moderne de Paris (2025-2026). This monograph represents the most comprehensive study of Condo's painting practice to date.</p>`;

  paintingReconfig.notes = `Published December 7, 2015 by Thames & Hudson. 288 pages, over 250 color illustrations. ISBN: 978-0-500-09394-8. Hardcover format: 32.0 × 24.4 × 3.0 cm. Text by Simon Baker. Comprehensive monograph covering Condo's career from 1984-2015, exploring his "Psychological Cubism" approach and systematic reconstruction of painting techniques. George Condo (b. 1957) is in collections at MoMA, Metropolitan Museum, Whitney Museum, Louisiana Museum, Guggenheim, and The Broad. Major retrospectives at New Museum, Hayward Gallery, and Musée d'Art Moderne de Paris.`;

  console.log('✅ Updated Painting Reconfigured (ID 242)');
}

// Find and update Mental States (ID 243)
const mentalStates = records.find(r => r.id === '243');
if (mentalStates) {
  mentalStates.isbn_asin = '9781853322891';
  mentalStates.publication_year = '2011';
  mentalStates.publisher = 'Hayward Gallery Publishing';
  mentalStates.height_cm = '29.8';
  mentalStates.width_cm = '28.0';
  mentalStates.page_count = '168';
  mentalStates.binding = 'Hardcover';
  mentalStates.num_images = '125';
  mentalStates.image_url = '/assets/images/books/condo_george_mental_states_9781853322891.jpg';

  mentalStates.description = `<p>Major exhibition catalog surveying George Condo's career from 1982 to 2011, published for his landmark touring retrospective at New Museum (New York), Museum Boijmans Van Beuningen (Rotterdam), Hayward Gallery (London), and Schirn Kunsthalle (Frankfurt) in 2011-2012. This comprehensive 168-page volume focuses on Condo's portrait paintings while including sculptural busts in materials including gold and bronze. Organized thematically with 125 color illustrations, the book explores Condo's engagement with art history, popular culture, and contemporary society through essays by Ralph Rugoff (New Museum Director), Laura Hoptman (MoMA curator), novelist Will Self, and fiction writer David Means.</p>

<p>George Condo (b. 1957) pioneered "Psychological Cubism," his term for representing multiple emotional and psychological states simultaneously within single figures—a departure from classical Cubism's spatial fragmentation. Emerging from New York's 1980s East Village scene alongside Basquiat and Haring, Condo developed "Artificial Realism," synthesizing Old Master techniques with pop sensibility and cartoon aesthetics. His distorted portraits with bulbous faces, multiple eyes, and fractured features authentically depict what he calls "the disjointed human psyche"—the emotional complexity and psychological contradictions of modern existence rendered through virtuoso painting combined with deliberately crude passages.</p>

<p>The "Mental States" exhibition and catalog examine Condo's systematic investigation of psychological portraiture across three decades. His subjects—whether based on observation or pure invention—exist in states of psychological flux, their features rearranged to express simultaneous, contradictory emotions. This approach extends to his sculptural busts in gold and bronze, which translate his painted distortions into three-dimensional form. The works engage art historical precedents from Velázquez and Goya through Picasso and de Kooning, while incorporating references from American popular culture, advertising, and cartoons to create what Condo terms "composites of the imagination."</p>

<p>Published by Hayward Gallery Publishing and distributed by D.A.P. in North America. Hardcover format, 11 × 11.75 inches, 168 pages with 125 color illustrations. Contributors: Ralph Rugoff, Laura Hoptman, Will Self, David Means. Condo's work is held in major collections including MoMA, The Metropolitan Museum, Whitney Museum, Louisiana Museum, Guggenheim, Tate, Centre Pompidou, and The Broad. This catalog represents the most significant survey of Condo's psychological portraiture from the early 1980s through 2011.</p>`;

  mentalStates.notes = `Exhibition catalog for touring retrospective: New Museum, New York (January–May 2011); Museum Boijmans Van Beuningen, Rotterdam (June–September 2011); Hayward Gallery, London (October 2011–January 2012); Schirn Kunsthalle, Frankfurt (February–May 2012). Published April 30, 2011 by Hayward Gallery Publishing. Hardcover, 11 × 11.75 inches (28.0 × 29.8 cm), 168 pages, 125 color illustrations. ISBN: 978-1-85332-289-1. Essays by Ralph Rugoff, Laura Hoptman, Will Self, David Means. Focus on portrait paintings and sculptural busts 1982-2011. George Condo (b. 1957) coined "Psychological Cubism." Collections: MoMA, Met, Whitney, Louisiana, Guggenheim, Tate, Pompidou.`;

  console.log('✅ Updated Mental States (ID 243)');
}

// Find and update Purple Book (ID 1545)
const purpleBook = records.find(r => r.id === '1545');
if (purpleBook) {
  purpleBook.title = 'Mister Nicotine: The George Condo Purple Book';
  purpleBook.publisher = 'Purple Institute';
  purpleBook.publication_year = '2015';
  purpleBook.height_cm = '29.7';
  purpleBook.width_cm = '21.0';
  purpleBook.binding = 'Softcover';
  purpleBook.image_url = '/assets/images/books/condo_george_purple_book.jpg';
  purpleBook.edition_printrun = 'Purple Books';

  purpleBook.description = `<p>Special artist book created by George Condo for Purple Institute's Purple Books series, a rare supplement to Purple Fashion magazine issue 23 (Spring/Summer 2015). Titled "Mister Nicotine," this publication represents Condo's collaboration with Purple—the influential Paris-based fashion and contemporary art magazine founded by Olivier Zahm and Elein Fleiss in 1992. Purple Books, launched as an extension of the magazine, commissions artists to create autonomous book works that exist at the intersection of artist publication, magazine supplement, and collectible edition.</p>

<p>Born in 1957, George Condo pioneered "Psychological Cubism," representing multiple emotional and psychological states simultaneously within single figures. His "Artificial Realism" synthesizes Old Master painting techniques with American pop culture and cartoon aesthetics, creating distorted portraits that authentically depict psychological complexity and contradiction. Emerging from New York's 1980s East Village scene, Condo has maintained close connections to fashion and music worlds throughout his career, collaborating with Kanye West on album artwork and participating in fashion magazine projects that blur boundaries between fine art and popular culture.</p>

<p>"Mister Nicotine" likely explores Condo's recurring themes of consumption, addiction, and psychological states through his signature visual language of fragmented faces, multiple eyes, and distorted features. The title evokes both the glamorous smoking culture historically associated with fashion imagery and Condo's darker investigations into compulsive behavior and altered consciousness. This format—between magazine and artist book—allowed Condo to reach Purple's international fashion and art audience while maintaining the conceptual autonomy of an independent artist publication.</p>

<p>Published by Purple Institute, Paris, 2015. Format: 21.0 × 29.7 cm, softcover. Part of the rare Purple Books series. George Condo's work is held in collections including MoMA, The Metropolitan Museum, Whitney Museum, Louisiana Museum, Guggenheim, and The Broad. This publication represents Condo's engagement with fashion world contexts and magazine-format artist books, extending his practice beyond traditional gallery and museum presentations.</p>`;

  purpleBook.notes = `Published 2015 by Purple Institute, Paris as Purple Book supplement to Purple Fashion magazine issue 23 (Spring/Summer 2015). Format: 21.0 × 29.7 cm. Softcover. Part of rare Purple Books series commissioning artists for autonomous book works. George Condo (b. 1957) coined "Psychological Cubism." His work bridges fine art and popular culture, including collaborations with fashion magazines and musicians. Collections: MoMA, Met, Whitney, Louisiana, Guggenheim, The Broad. Very rare publication.`;

  console.log('✅ Updated Purple Book (ID 1545)');
}

// Write updated CSV
fs.writeFileSync('src/_data/books.csv', stringify(records, { header: true, quoted: true }));
console.log('✅ CSV updated with enriched George Condo book data');
