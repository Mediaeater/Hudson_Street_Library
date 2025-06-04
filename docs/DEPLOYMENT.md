# Deployment Documentation

## Overview

The Hudson Street Library website is now deployed using GitHub Actions and GitHub Pages. The site is automatically built and deployed whenever changes are pushed to the `main` branch.

## How It Works

1. **Push to Main**: When you push changes to the `main` branch
2. **GitHub Actions**: Automatically triggers the build workflow
3. **Build Process**: 
   - Installs Node.js dependencies
   - Runs Eleventy to build the site
   - Outputs static files to `_site/`
4. **Deploy**: The built site is deployed to GitHub Pages

**📋 For detailed pipeline documentation, see [GITHUB-ACTIONS-PIPELINE.md](GITHUB-ACTIONS-PIPELINE.md)**

## Important Notes

- The `_site/` directory is **no longer tracked in git**
- All builds happen automatically in GitHub Actions
- The site is served from the GitHub Pages environment

## Local Development

To work on the site locally:

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build the site
npm build

# Clean build directory
npm clean
```

## GitHub Pages Configuration

**IMPORTANT**: You need to configure GitHub Pages in your repository settings:

1. Go to Settings → Pages
2. Under "Source", select "GitHub Actions" (not "Deploy from a branch")
3. Save the changes

## Deployment Status

You can monitor deployments:
- Go to the "Actions" tab in your GitHub repository
- Look for the "Build and Deploy to GitHub Pages" workflow
- Check the status of recent runs

## Troubleshooting

### If the site doesn't update:
1. Check the Actions tab for build errors
2. Ensure GitHub Pages is set to use "GitHub Actions" as source
3. Clear your browser cache
4. Wait a few minutes for GitHub Pages cache to update

### If builds fail:
1. Check the error logs in GitHub Actions
2. Run `npm install` and `npm build` locally to test
3. Ensure all file paths are correct
4. Check that all required files are committed

## Benefits of This Approach

1. **Clean Repository**: No built files in version control
2. **Automated Builds**: No manual building required
3. **Consistency**: Same build process for everyone
4. **History**: Can see build logs and deployment history
5. **Rollback**: Easy to revert to previous versions

## Custom Domain (if applicable)

The `CNAME` file in the root directory is automatically copied during build. If you need to change the domain, edit this file and commit the change.