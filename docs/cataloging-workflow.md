# Hudson Street Library - Cataloging Workflow

Complete guide for adding books to the catalog. This document covers the CSV structure, cover images, required fields, classification systems, and git workflow.

## Quick Start

The fastest way to add a book:

```bash
# 1. Add book metadata
node scripts/add-book-from-text.js --interactive

# 2. Add cover image (see naming convention below)
cp cover.jpg src/assets/images/books/Author_Title_ISBN.jpg

# 3. Commit changes
git add src/_data/books.csv src/assets/images/books/
git commit -m "Add Author - Book Title"
git push
```

## CSV Structure

Books are stored in `/src/_data/books.csv`. The file contains 34 fields (columns):

### Core Identification (Fields 1-7)

1. **id** - Sequential unique identifier (e.g., 1682)
2. **author_last** - Author's last name (e.g., "Yuskavage")
3. **author_first** - Author's first name (e.g., "Lisa")
4. **author_full_name** - Complete name as displayed (e.g., "Lisa Yuskavage")
5. **title** - Full book title
6. **publisher** - Publishing house or institution
7. **publication_year** - Four-digit year (YYYY format)

### Physical Description (Fields 8-13)

8. **height_cm** - Height in centimeters
9. **width_cm** - Width in centimeters
10. **depth_cm** - Depth/thickness in centimeters
11. **binding** - Binding type (Hardcover, Softcover, Paperback, Magazine, etc.)
12. **page_count** - Total number of pages
13. **edition_printrun** - Edition info (e.g., "First Edition", "Edition of 500 copies")

### Identification Numbers (Field 14)

14. **isbn_asin** - ISBN-10, ISBN-13, or ASIN
    - Format with hyphens: 978-1-83866-811-2
    - Or without: 9781838668112

### Contributors (Fields 15-18)

15. **editor** - Editor name(s)
16. **contributors** - Additional contributors (authors, photographers, essayists)
17. **is_signed_inscribed** - Boolean (true/false) - Is this copy signed or inscribed?
18. **designer** - Book designer or design studio

### Content (Field 19)

19. **description** - Detailed description of the book's content, context, and significance
    - Include exhibition details if applicable
    - Note special features (essays, interviews, plates)
    - Bilingual text information

### Links (Fields 20-21)

20. **artist_url** - Artist's website
21. **publisher_url** - Publisher's website

### Organization (Fields 22-26)

22. **collection_grouping** - Collection name(s) (e.g., "Photography", "Magazines")
23. **tags** - Comma-separated keywords
24. **classification** - General subject classification
25. **bisac** - BISAC subject codes (Book Industry Standard)
26. **lcc** - Library of Congress Classification (see section below)

### Library Management (Fields 27-29)

27. **location** - Physical location (e.g., "Hudson Street Library, NYC" or specific shelving like "Clipper")
28. **accession_no** - Accession date in YYYY-MM-DD format (e.g., "2026-01-24")
29. **image_url** - Cover image path (see naming convention below)

### Additional Data (Fields 30-34)

30. **price** - Purchase price (optional)
31. **weight_g** - Weight in grams
32. **language** - Language(s) of text (e.g., "English", "Spanish, English")
33. **num_images** - Number of images in book
34. **notes** - Additional notes (binding details, printing method, special features)

## Cover Image Guidelines

### Naming Convention

Cover images follow a strict naming pattern:

```
Author_Title_ISBN.jpg
```

**Examples:**
- `Yuskavage_Lisa_Yuskavage_Contemporary_Artists_978_1_83866_811_2.jpg`
- `Bischof_Meta_Cars_978_3_907179_87_1.jpg`
- `Gates_1965-Malcolm-in-Winter_978_1_910844_77_9.jpg`

**Rules:**
- Replace spaces with underscores
- Remove special characters (colons, quotes, etc.) or replace with hyphens
- Use full ISBN with underscores replacing hyphens
- Keep file extension lowercase (.jpg preferred)
- Maximum ~100 characters total for compatibility

### Location

All cover images are stored in:
```
/src/assets/images/books/
```

In the CSV, the path is:
```
/assets/images/books/Filename.jpg
```

### Image Specifications

**Recommended:**
- Format: JPG or PNG
- Dimensions: 600x800px minimum (3:4 aspect ratio preferred)
- File size: Under 2MB for web performance
- Resolution: 72-150 DPI (web optimized)
- Color mode: RGB

**Quality:**
- Clear, high-quality scan or photograph
- Good lighting, no shadows
- Straight alignment (not skewed)
- Clean background preferred

## Required Fields

Minimum fields needed for a valid book entry:

1. **id** - Automatically assigned by script
2. **author_last** - At minimum, author surname
3. **title** - Book title
4. **publisher** - Publishing house
5. **publication_year** - Year published

## Optional But Recommended Fields

These fields significantly improve cataloging and discoverability:

### High Priority
- **isbn_asin** - Essential for identification and lookup
- **lcc** - Library of Congress Classification (field 25)
- **dimensions** (height_cm, width_cm, depth_cm) - For physical reference
- **designer** - Important for art and design books
- **description** - Context and content summary
- **accession_no** - Date added to collection (YYYY-MM-DD format)

### Medium Priority
- **binding** - Helps with identification
- **page_count** - Useful for reference
- **edition_printrun** - Important for limited editions
- **is_signed_inscribed** - Valuable for special copies
- **tags** - Improves search and categorization
- **language** - Important for bilingual books

### Lower Priority
- **editor**, **contributors** - Attribution
- **artist_url**, **publisher_url** - Reference links
- **price**, **weight_g** - Collection management
- **num_images**, **notes** - Additional details

## Library of Congress Classification (LCC)

LCC codes are stored in **field 25** (lcc column).

### Format

Standard LCC notation with class, subclass, and Cutter number:

```
N6537.Y87 A4 2026
TR647.P54 A7 2025
ND237.Y87 A4 2006
```

**Structure:**
- **N6537** - Class and number (Contemporary American artists)
- **.Y87** - Cutter number for artist (Yuskavage)
- **A4** - Work designation (monograph/catalog)
- **2026** - Year (publication or acquisition)

### Common LCC Classes for Art Books

**Fine Arts (N)**
- N6537 - Contemporary American artists (individual)
- N7433.4 - Contemporary artists by nationality
- ND237 - American painters (individual)
- NE2012 - Printmaking (individual printmakers)

**Photography (TR)**
- TR647 - Photographers (individual monographs)
- TR650 - Photography collections

**Graphic Arts (NC)**
- NC975 - Illustration
- NC998 - Comic books and graphic novels

**Architecture (NA)**
- HT168 - Urban planning and public spaces

### Examples from Collection

```csv
lcc
N6537.G38 A4 2025          (Theaster Gates)
TR647.M85 S34 2023         (Maxime Muller - Photography)
ND237.Y87 A4 2006          (Lisa Yuskavage - Painting)
N7433.4.W45 R48 2025       (Lawrence Weiner)
HT168.N5 M47 2025          (Public Spaces NY)
N6537.W66 A4 2025          (Christopher Wool)
PN6728.R49 M37 2025        (Kerry James Marshall - Graphic Novel)
```

## Accession Dates

Accession dates track when books entered the collection.

### Format

Use **YYYY-MM-DD** format in the **accession_no** field (field 27):

```
2026-01-24
2026-01-17
2025-12-26
```

### Purpose

1. **Recently Added Page** - Books automatically appear on the Recently Added collection page based on accession date
2. **Collection Tracking** - Monitor acquisition patterns
3. **Cataloging History** - Know when items were processed

### Best Practices

- Use actual date book was acquired or cataloged
- For batch additions, use the same date
- For retroactive cataloging, use approximate dates or leave blank
- Date format must be exact: YYYY-MM-DD

## Recently Added Page

The Recently Added collection page is **manually maintained** at:
```
/src/collections/recently_added.html
```

### Current Status

**Manual process** - Each book entry is hand-coded in HTML. The page is updated when new books are added.

### Future Automation

Once automation is complete, the page will:
- Auto-generate from books.csv
- Sort by accession_no (most recent first)
- Display most recent 20-30 additions
- Update on each build

### What's Shown

For each book:
- Cover image
- LCC classification
- Title and author
- Publisher and year
- Physical description
- Contributors and designer
- Signed status
- Accession date
- Description excerpt
- Keywords/tags
- Link to full book page

## Signed Copies

Mark signed or inscribed copies in **field 16** (is_signed_inscribed).

### Values

- `true` - Book is signed and/or inscribed
- `false` - Book is not signed
- *(empty)* - Unknown or not applicable

### Examples

```csv
is_signed_inscribed
true              (Lisa Yuskavage - signed by artist)
true              (Christopher Wool - signed copies)
false             (Most unsigned books)
```

### Display

Signed books show "Signed: Yes" on:
- Book detail pages
- Recently Added listings
- Search results

## Git Workflow

### Adding New Books

1. **Add book to CSV**
   ```bash
   # Use interactive script (recommended)
   node scripts/add-book-from-text.js --interactive

   # Or edit CSV directly
   vim src/_data/books.csv
   ```

2. **Add cover image**
   ```bash
   # Copy to correct location with correct name
   cp ~/cover.jpg src/assets/images/books/Author_Title_ISBN.jpg
   ```

3. **Stage changes**
   ```bash
   git add src/_data/books.csv
   git add src/assets/images/books/
   ```

4. **Commit with clear message**
   ```bash
   git commit -m "Add Lisa Yuskavage Contemporary Artists Series

   - Added 2026 Phaidon monograph
   - Signed copy, accession date 2026-01-24
   - Cover image included

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

5. **Push to main**
   ```bash
   git push origin main
   ```

### Commit Message Format

**Structure:**
```
Add Author - Book Title

- Brief detail 1
- Brief detail 2
- Cover/metadata notes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Examples:**

Single book:
```
Add Beni Bischof Meta Cars

- Nieves 2025 edition
- Added LCC classification
- Cover included

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Multiple books:
```
Add three Theaster Gates books

- 1965: Malcolm in Winter (White Cube 2025)
- Unto Thee (Smart Museum 2025)
- Black Chapel (Hatje Cantz)
- All with LCC classifications

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

Updates:
```
Update Christopher Wool books with LCC classifications

- Added Library of Congress codes
- Standardized publisher names
- No cover changes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Best Practices

- **Atomic commits** - One logical change per commit
- **Meaningful messages** - Describe what and why
- **Test before commit** - Run `npm run build` locally
- **Check status** - Use `git status` to verify what's staged
- **Pull before push** - Get latest changes with `git pull`

## Complete Examples

### Example 1: Recent Addition (Lisa Yuskavage)

```csv
id,author_last,author_first,author_full_name,title,publisher,publication_year,height_cm,width_cm,depth_cm,binding,page_count,edition_printrun,isbn_asin,editor,contributors,is_signed_inscribed,designer,description,artist_url,publisher_url,collection_grouping,tags,classification,bisac,lcc,location,accession_no,image_url,price,weight_g,language,num_images,notes

1682,Yuskavage,Lisa,Lisa Yuskavage,Lisa Yuskavage (Contemporary Artists Series),Phaidon Press,2026,29.0,25.0,,Paperback,160,,978-1-83866-811-2,,"Ariel Levy, Barry Schwabsky, Lena Dunham; Photography by Jason Schmidt",true,Phaidon Design,"The definitive monograph on the innovative American painter Lisa Yuskavage, published as part of Phaidon's Contemporary Artists Series. Documents over two decades of her work, known for its bold, eccentric, and exhibitionist characters that challenge the conventions of figurative painting. Includes never-before-seen photographs of her studio by Jason Schmidt and essays that explore the tension in her work between the sacred and profane, high art and popular culture.",https://www.davidzwirner.com/artists/lisa-yuskavage,https://www.phaidon.com/en-us/products/lisa-yuskavage,,"Art, Painting, Contemporary Art, Women Artists",Individual Artist Monographs,,,"Hudson Street Library, NYC",2026-01-24,/assets/images/books/Yuskavage_Lisa_Yuskavage_Contemporary_Artists_978_1_83866_811_2.jpg,,1080,,,
```

**Cover image:**
- Location: `/src/assets/images/books/Yuskavage_Lisa_Yuskavage_Contemporary_Artists_978_1_83866_811_2.jpg`
- 1080g weight noted in weight_g field
- Signed copy (is_signed_inscribed = true)
- Accession date: January 24, 2026

### Example 2: MOS Architects Book

```csv
1680,Meredith,Michael,Michael Meredith and Hilary Sample (MOS),Public Spaces NY,Park Books,2025,23.0,15.5,,Paperback,632,,978-3-03860-434-1,,,false,Studio Lin,"A sequel to Vacant Spaces NY, this volume documents and analyzes Manhattan's public realm—parks, streets, community gardens, POPS (Privately Owned Public Spaces), and waterfronts. It examines the legal, regulatory, and management structures that shape these spaces, arguing that public space is never neutral. The book includes detailed mappings and speculative illustrations on how design facilitates or hinders inclusion in the US's densest city.",https://mos.nyc/,https://www.park-books.com/en/product/public-spaces-ny/1661,,"Architecture, Urban Planning, NYC, Design, Public Space",Architecture,,,"Hudson Street Library, NYC",2026-01-24,/assets/images/books/Meredith_Public_Spaces_NY_978_3_03860_434_1.jpg,,1000,,,
```

**Notes:**
- Author field shows both architects: "Michael Meredith and Hilary Sample (MOS)"
- Studio Lin as designer
- 632 pages, substantial architecture book
- Weight: 1000g

### Example 3: Artist Book with Limited Edition (Lawrence Weiner)

```csv
1678,Weiner,Lawrence,Lawrence Weiner,Revue Faire: 49: Lawrence Weiner,Editions Empire,2024,30.0,21.0,,Paperback,62,,9791095991458,,,false,,"The 49th issue of the critical graphic design journal is about Lawrence Weiner and his relationship with typography, titled We Are Ships at Sea, Not Ducks On a Pond and written by Joris Kritis. Its glossy, full-colour pages honor Weiner's use of graphic design, which has always in turn fascinated graphic designers. What makes Weiner's work seductive is his resolutely non-apologetic method of displaying words without need for any explanation. A comparative analysis is made of different voices about Weiner's use of graphics and typography. Next to a speculative history of Weiner's formal language, two interviews with graphic designer Linda Van Deursen and artist Nora Turato discuss Weiner's enduring legacy.",,,,Graphic Design; Typography; Artist Book; Magazine,Individual Artist Book,,,"Hudson Street Library, NYC",2026-01-17,/assets/images/books/Weiner_Revue_Faire_49_Lawrence_Weiner_9791095991458.jpg,,,"English, French",,Staple Bound; Black-and-White; Mixed
```

**Notes:**
- Bilingual text noted in language field
- Magazine/journal format
- Additional binding details in notes field
- Multiple tags for discoverability

### Example 4: Signed Limited Edition (Christopher Wool)

```csv
1672,Wool,Christopher,Christopher Wool,Maybe Maybe Not,Inktree Editions,2001,,,,,"Edition of 300, signed",,,,,true,,"Limited edition artist's book published by Inktree Editions, 2001. Edition of 300 copies, each signed and numbered by the artist. Signed by the artist.",http://wool735.com/,,Art,,,,,Clipper,2026-01-10,/assets/images/placeholder-book.svg,,,,,English
```

**Notes:**
- Edition info in edition_printrun: "Edition of 300, signed"
- is_signed_inscribed = true
- Location: "Clipper" (specific shelf/collection)
- Placeholder cover (to be replaced)

## Workflow Tips

### For Single Books

1. Use the interactive script for speed
2. Have publisher and year ready (helps ISBN lookup)
3. Add cover image immediately after CSV entry
4. Test locally before committing
5. Write descriptive commit message

### For Batch Additions

1. Prepare a text file with all books
2. Run batch mode: `node scripts/add-book-from-text.js --file books.txt`
3. Add all cover images at once
4. Review CSV for accuracy
5. Commit as logical group

### For Books Without ISBNs

1. Leave isbn_asin field empty or add later
2. Ensure publisher and year are accurate
3. Manual cover image required
4. Consider adding edition info to edition_printrun

### For Rare/Special Books

1. Note edition size in edition_printrun
2. Mark signed status in is_signed_inscribed
3. Add detailed description
4. Include designer credit if known
5. Document any special features in notes field

### Quality Checklist

Before committing:

- [ ] ID is unique and sequential
- [ ] Author name is correct and complete
- [ ] Title is accurate (check capitalization)
- [ ] Publisher is standardized
- [ ] Year is four digits
- [ ] ISBN format is correct (if present)
- [ ] Cover image exists at specified path
- [ ] Cover filename matches convention
- [ ] Accession date is YYYY-MM-DD format
- [ ] LCC is formatted correctly (if added)
- [ ] Description is informative
- [ ] Tags are relevant and comma-separated
- [ ] Location is specified

## Common Issues

### Cover Image Not Showing

**Problem:** Book page shows placeholder instead of cover.

**Solutions:**
- Verify image exists at path specified in image_url
- Check filename matches exactly (case-sensitive)
- Ensure image is in `/src/assets/images/books/`
- Rebuild site: `npm run build`

### CSV Parse Errors

**Problem:** Site build fails with CSV error.

**Solutions:**
- Check for unescaped quotes in description
- Verify no extra commas in fields
- Ensure each row has 34 fields
- Use CSV editor or script to validate

### Duplicate IDs

**Problem:** Two books with same ID.

**Solutions:**
- Check last book in CSV for highest ID
- Use script (auto-assigns next ID)
- Manually increment from last ID

### LCC Format Issues

**Problem:** LCC classification not displaying correctly.

**Solutions:**
- Follow format: CLASS.CUTTER WORK YEAR
- No spaces except between main parts
- Use periods, not commas
- Verify against Library of Congress standards

## Resources

### Tools

- **add-book-from-text.js** - Interactive book addition script
- **books.csv** - Main catalog database
- **CSV editor** - Excel, LibreOffice, vim, VS Code
- **Git** - Version control

### Documentation

- `/docs/ADD-BOOK-GUIDE.md` - Script usage guide
- `/docs/BOOK_WORKFLOW_GUIDE.md` - CMS workflow (future)
- `/docs/CONTENT_MANAGER_GUIDE.md` - Content management
- This file - Complete cataloging reference

### External References

- Library of Congress Classification: https://www.loc.gov/catdir/cpso/lcco/
- BISAC Subject Codes: https://bisg.org/page/bisacsubjectcodes
- ISBN Database: https://isbnsearch.org/
- Google Books API: For ISBN lookups

## Support

For questions or issues:

1. Check this documentation
2. Review recent commits for examples
3. Test changes locally before pushing
4. Use git status to verify staging
5. Consult other docs in `/docs/` folder

---

*Last updated: January 2026*
*Maintained at: /docs/cataloging-workflow.md*
