# Contributing to Hudson Street Library

Thank you for your interest in contributing to the Hudson Street Library project. This project manages a specialized photography book collection using "Data as Code" principles.

## 🚨 Critical Golden Rules

Before you start, please be aware of these strict constraints to ensure data integrity and build stability:

1.  **Do Not Create New Acquisition Scripts**: Use the existing consolidated script `scripts/covers/acquire-covers.js`.
    *   Usage: `node scripts/covers/acquire-covers.js --limit 50`
    *   This script enforces the specific file naming conventions required by the site.
2.  **File Naming is Strict**: Covers MUST be named `Author_Name_Book_Title_ISBN.jpg`.
    *   The frontend JavaScript relies on this exact pattern.
    *   Do not manually rename files without updating the database logic.
3.  **Data Source of Truth**: `src/_data/books.csv` is the master database.
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
