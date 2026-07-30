# Hudson Street Library - Documentation Index

> **Central navigation hub for all project documentation**
> Last Updated: December 8, 2025

---

## Quick Links

| Document | Purpose | Audience |
|----------|---------|----------|
| [README](../README.md) | Project overview and quick start | Everyone |
| [DEPLOYMENT](DEPLOYMENT.md) | Complete deployment guide | DevOps, Developers |
| [CONTRIBUTING](../CONTRIBUTING.md) | Contribution guidelines | Contributors |
| [ADD-BOOK-GUIDE](ADD-BOOK-GUIDE.md) | Adding new books | Content Managers |

---

## Getting Started

### For New Developers

1. **[Project README](../README.md)** - Project overview, technology stack, quick commands
2. **[DEPLOYMENT](DEPLOYMENT.md)** - How deployment works
3. **[System Overview](architecture/SYSTEM-OVERVIEW.md)** - Architecture overview

### For Content Managers

1. **[ADD-BOOK-GUIDE](ADD-BOOK-GUIDE.md)** - Adding new books (interactive CLI)

### For DevOps

1. **[DEPLOYMENT](DEPLOYMENT.md)** - Main deployment guide
2. **[GitHub Actions Pipeline](GITHUB-ACTIONS-PIPELINE.md)** - CI/CD details
3. **[Deployment Quick Reference](DEPLOYMENT-QUICK-REFERENCE.md)** - Essential commands

---

## Documentation by System

### Core Application

- [Project README](../README.md) - Main documentation
- [System Overview](architecture/SYSTEM-OVERVIEW.md) - Architecture
- [Design System](../src/design-system.md) - UI/UX standards

### Data Management

- [CSV Strategy](CSV_STRATEGY.md) - Data source of truth
- [CSV Workflow Guide](CSV_WORKFLOW_GUIDE.md) - How books move through the build
- [Data Structures](DATA-STRUCTURES.md) - Schema and formats

### Build System

- [Build System](BUILD-SYSTEM.md) - How Eleventy builds the site
- [Template System](TEMPLATE-SYSTEM.md) - Nunjucks templates

### Image & Cover System

- [Image System Documentation](IMAGE-SYSTEM-DOCUMENTATION.md) - Image pipeline
- [Cover Acquisition](COVER-ACQUISITION.md) - Book cover strategies
- [Image Cache](../scripts/utils/README-image-cache.md) - Caching system

### Frontend

- [Frontend Development](FRONTEND-DEVELOPMENT.md) - JS, CSS, templates
- [Aggregate Views](AGGREGATE-VIEWS.md) - Clickable metadata
- [Quick Start Search](QUICK-START-SEARCH.md) - Search features
- [Path Structure](PATH-STRUCTURE.md) - URL routing

### News & Content

- [News Pipeline](NEWS-PIPELINE-DOCUMENTATION.md) - Automated news generation

### API & Integration

- [API Coverage Enhancement](API-COVERAGE-ENHANCEMENT.md) - API strategies
- [Free API Options](FREE-API-OPTIONS.md) - Available APIs

### Testing & Security

- [Testing Patterns](TESTING-PATTERNS.md) - Testing strategy and conventions
- [Security Documentation](SECURITY.md) - Security policies
- [Troubleshooting](TROUBLESHOOTING.md) - Common problems

---

## Scripts Documentation

### Utility Scripts

- [Logging System](../scripts/utils/README-logging.md) - Logging utilities
- [CSV Handler](../scripts/utils/csv-handler-README.md) - CSV processing
- [Image Cache](../scripts/utils/README-image-cache.md) - Image caching

### Pipeline Documentation

- [Scripts Library](../scripts/lib/README.md) - Shared utilities

### Scripts Documentation

- [Quick Start](../scripts/docs/QUICK-START.md) - Getting started
- [API Reference](../scripts/docs/API-REFERENCE.md) - Internal APIs

---

## Archive

Historical documentation moved to `docs/archive/`:

- `archive/2025-11-deployment-cleanup/` - Old deployment guides
- `archive/2025-07-current-status.md` - July 2025 status snapshot
- `archive/2025-07-work-in-progress.md` - July 2025 WIP
- `archive/unrealized-cms-plan/` - PostgreSQL CMS plans and web admin panel (not implemented)
- `archive/2026-03-datasette-setup/` - Datasette setup reports and integration summaries
- `archive/daily-logs-2025/` - Historical daily logs
- `archive/2026-05-cms-removal/` - Docs for the deleted Express+PostgreSQL CMS
- `archive/2026-05-completed-plans/` - Shipped plans and one-time completion reports
- `archive/2026-05-obsolete-test-docs/` - Docs for a custom test runner that doesn't exist
- `archive/2026-05-migration-artifacts/` - Migration summaries for finished module reorganizations

---

## Documentation Statistics

- **Active Documentation**: ~30 files
- **Archived Documentation**: ~25 files
- **Last Full Audit**: March 2026

---

**Maintained By**: Hudson Street Library Team
