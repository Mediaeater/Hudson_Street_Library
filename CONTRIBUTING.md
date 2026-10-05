# Contributing to Hudson Street Library

Thank you for your interest in contributing to the Hudson Street Library project. This project manages a specialized photography book collection using "Data as Code" principles.

## 🚨 Critical Golden Rules

Before you start, please be aware of these strict constraints to ensure data integrity and build stability:

1.  **Covers go through one path. Do not write new cover scripts.**
    *   What is missing: `npm run covers:report` (`node scripts/covers/report.js`, flags `--wing`, `--tag`, `--grouping`, `--ids`).
    *   Put a cover on a row: `npm run covers:attach -- <id> <file-or-url>` (`node scripts/covers/attach.js`). One row and one image per run. It checks the bytes are an image, names the file, saves it and sets `image_url`.
    *   There is no bulk downloader. A cover is chosen and looked at by a person, one book at a time.
2.  **The row names its cover.** A page shows the file in the row's `image_url`, which starts with a slash.
    *   New files are named `{author_last}_{author_first}_{title}_{isbn}.jpg`, lowercase with underscores. `attach.js` does this for you.
    *   Do not rename a cover file without updating `image_url` in the same commit.
3.  **Data Source of Truth**: `src/_data/catalog/art.csv` is the master database.
    *   Do not edit derived JSON files manually if they are generated from this CSV.

## Development Workflow

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start Local Server**:
    ```bash
    npm start
    ```
    Access the site at `http://localhost:8080`.

3.  **Run Tests**:
    ```bash
    npm test
    ```

## Documentation Map

*   **`README.md`**: High-level overview and quick start.
*   **`docs/DEVELOPMENT-WORKFLOW.md`**: Detailed guide for developers.
*   **`docs/BOOK_WORKFLOW_GUIDE.md`**: How to add and manage book entries.
*   **`CSV_STRATEGY.md`**: Guidelines for maintaining the `books.csv` data file.

## Code Style

*   **JavaScript**: Use modern ES6+ features.
*   **CSS**: We use Tailwind CSS. Avoid writing custom CSS classes if a Tailwind utility exists.
*   **Formatting**: Please leave files in a clean state (no `console.log` debugging leftovers).

## Need Help?

Check the `docs/` folder for specific guides or open an issue if you find a discrepancy between the documentation and the code.
