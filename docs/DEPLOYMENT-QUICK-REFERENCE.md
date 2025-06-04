# Deployment Quick Reference

## 🚀 Deploy Changes

```bash
git add .
git commit -m "Your changes"
git push origin main
# ✨ Site automatically deploys in ~2-3 minutes
```

## 📊 Monitor Deployment

1. **GitHub Actions**: Go to repo → Actions tab
2. **Status**: Look for "Build and Deploy to GitHub Pages" workflow
3. **Live Site**: https://hudsonstreetlibrary.com (updates after successful deploy)

## 🔧 Local Development

```bash
# Start development server
npm start
# → Visit http://localhost:8080

# Test build locally
npm run build
# → Check _site/ directory

# Clean build files
npm run clean
```

## ⚡ Quick Status Check

| Status | Meaning |
|--------|---------|
| ✅ Green | Deployment successful |
| 🟡 Yellow | Deployment in progress |
| ❌ Red | Deployment failed (check logs) |

## 🚨 If Deployment Fails

1. **Check Actions tab** for error logs
2. **Test locally**: `npm run build`
3. **Common issues**:
   - CSV formatting errors
   - Missing image files
   - Template syntax errors
4. **Emergency rollback**: `git revert HEAD && git push`

## 📋 Full Documentation

- **Complete Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Technical Details**: [GITHUB-ACTIONS-PIPELINE.md](GITHUB-ACTIONS-PIPELINE.md)

---

**Live Site**: https://hudsonstreetlibrary.com  
**Admin**: Repository Settings → Pages (must be set to "GitHub Actions")