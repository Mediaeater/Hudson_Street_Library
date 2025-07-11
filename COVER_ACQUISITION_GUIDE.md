# BOOK COVER ACQUISITION GUIDE - DO NOT DEVIATE

## ⚠️ IMPORTANT: USE ONLY THE ESTABLISHED WORKING SYSTEM

### THE ONLY CORRECT WAY TO ACQUIRE COVERS:

```bash
# USE THIS SCRIPT AND ONLY THIS SCRIPT
node acquire-covers-respectful.js --limit [number]

# For specific artists/searches, modify the existing script
# DO NOT create new scripts
```

### WHY THIS MATTERS:
1. **acquire-covers-respectful.js** saves covers with the EXACT naming pattern the website expects
2. It saves DIRECTLY to `src/assets/images/books/`
3. Format: `Author_Name_Book_Title_ISBN.jpg` or `Author_Name_Book_Title_noISBN.jpg`
4. The website looks for this EXACT pattern

### ❌ DO NOT DO THIS:
- DO NOT create new acquisition scripts
- DO NOT use the image pipeline for book covers
- DO NOT save to incoming-images directory
- DO NOT use different naming conventions
- DO NOT try to "improve" the working system

### ✅ CORRECT PROCESS:
1. Check current coverage:
   ```bash
   ls -1 src/assets/images/books/*.jpg | wc -l
   ```

2. Run acquisition:
   ```bash
   node acquire-covers-respectful.js --limit 50
   ```

3. For specific artists, MODIFY the existing script's search parameters, don't create new scripts

4. Commit and push:
   ```bash
   git add -A && git commit -m "Add book covers using established system" && git push
   ```

### THE IMAGE PIPELINE IS NOT FOR BOOK COVERS
- The `scripts/image-pipeline/` is for OTHER images
- It categorizes images into art, music, etc.
- It creates optimized versions with size suffixes
- IT WILL BREAK BOOK COVER DISPLAY

### IF COVERS DON'T SHOW ON WEBSITE:
1. Check the naming: Must be `Author_Title_ISBN.jpg` format
2. Check the location: Must be in `src/assets/images/books/`
3. Check the CSV: Books need valid author/title data
4. DO NOT create new scripts to "fix" it

### REFERENCE THE WORKING SYSTEM:
- Yesterday's approach: See CURRENT-STATUS.md
- Working script: acquire-covers-respectful.js
- Success rate: 96%+ with proper delays

## 🚨 FINAL WARNING:
The system that works has been established. Use it. Don't reinvent it.
Creating new scripts or using the image pipeline will BREAK the website display.

---
Last updated: July 11, 2025
NEVER modify this guide without explicit approval