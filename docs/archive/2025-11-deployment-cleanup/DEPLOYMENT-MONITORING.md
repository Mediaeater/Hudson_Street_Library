# Deployment Monitoring & Status Dashboard

## 🎛️ Monitoring Overview

The Hudson Street Library deployment pipeline provides multiple ways to monitor build and deployment status. This guide covers all available monitoring tools and dashboards.

## 📊 Primary Monitoring Locations

### 1. GitHub Actions Dashboard
**URL**: https://github.com/Mediaeater/Hudson_Street_Library/actions
**Purpose**: Real-time build and deployment status

**What You'll See**:
- ✅ Successful deployments (green checkmark)
- ❌ Failed deployments (red X)
- 🟡 In-progress deployments (yellow circle)
- ⏸️ Cancelled/skipped runs (gray)

**Key Information**:
- Commit SHA that triggered the build
- Build duration
- Detailed logs for each step
- Artifact downloads

### 2. GitHub Pages Environment
**URL**: https://github.com/Mediaeater/Hudson_Street_Library/deployments
**Purpose**: Deployment history and live site status

**What You'll See**:
- Active deployment status
- Deployment URL (https://hudsonstreetlibrary.com)
- Deployment timestamps
- Environment details

### 3. Live Site Status
**URL**: https://hudsonstreetlibrary.com
**Purpose**: Verify site is accessible and updated

**Verification Methods**:
- Check browser developer tools for latest timestamp
- Look for your recent changes
- Test site functionality

## 🔍 Local Monitoring Tools

### Deployment Status Checker
```bash
# Run comprehensive status check
npm run deploy:check

# Or run script directly
./scripts/check-deployment.sh
```

**What It Checks**:
- ✅ Local build status
- 🌿 Current git branch
- 📝 Latest commit info
- ⚠️ Uncommitted changes
- 📤 Unpushed commits
- 🔗 Quick access links

### Local Development Monitoring
```bash
# Start development server with live reload
npm start
# Monitor at http://localhost:8080

# Test production build locally
npm run build
# Check output in _site/ directory
```

## 📈 Deployment Metrics

### Typical Build Times
- **Average**: 45-90 seconds
- **Dependencies Install**: 15-30 seconds
- **Eleventy Build**: 10-20 seconds
- **Deployment**: 20-40 seconds

### Performance Indicators

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Build Time | < 2 min | 2-5 min | > 5 min |
| Success Rate | > 95% | 85-95% | < 85% |
| Site Response | < 3 sec | 3-10 sec | > 10 sec |

## 🚨 Alert Conditions

### Build Failures
**Triggers**:
- Eleventy compilation errors
- Missing dependencies
- File path issues
- CSV/JSON data format errors

**Notification Methods**:
- GitHub email notifications (if enabled)
- GitHub mobile app notifications
- Actions tab shows red status

### Deployment Failures
**Triggers**:
- GitHub Pages service issues
- Artifact upload failures
- Permission problems

**Response Actions**:
1. Check GitHub status page
2. Retry deployment
3. Review permissions settings

## 📱 Notification Setup

### GitHub Notifications
1. Go to Settings → Notifications
2. Enable "Actions" notifications
3. Choose email/web notification preferences
4. Set up mobile app notifications

### Browser Bookmarks
Add these bookmarks for quick access:
- **Actions**: `https://github.com/Mediaeater/Hudson_Street_Library/actions`
- **Deployments**: `https://github.com/Mediaeater/Hudson_Street_Library/deployments`
- **Live Site**: `https://hudsonstreetlibrary.com`

## 🔧 Troubleshooting Dashboard

### Quick Diagnostic Commands
```bash
# Check repository status
git status
git log --oneline -5

# Verify build locally
npm ci
npm run build

# Check deployment status
npm run deploy:check

# View recent commits
git log --oneline --graph -10
```

### Common Issues & Solutions

#### 1. Build Hanging or Slow
**Symptoms**: Build takes > 5 minutes
**Diagnostics**:
```bash
# Check for large files
du -sh src/assets/images/*
find src/ -size +10M
```
**Solutions**:
- Optimize large images
- Check for infinite loops in templates
- Review dependency updates

#### 2. Site Not Updating
**Symptoms**: Changes don't appear on live site
**Diagnostics**:
1. Check Actions tab for deployment status
2. Verify commit was pushed: `git log --oneline -3`
3. Clear browser cache
4. Check GitHub Pages configuration

**Solutions**:
- Wait 2-5 minutes for propagation
- Hard refresh browser (Ctrl+Shift+R)
- Check DNS/CDN cache

#### 3. Template Errors
**Symptoms**: Build fails with template errors
**Diagnostics**:
```bash
# Test specific template compilation
npx eleventy --dryrun
npm run build 2>&1 | grep -i error
```

## 📊 Monitoring Automation

### GitHub Status Checks
The repository can be configured with branch protection rules requiring successful deployment before merging:

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Require status checks: "Build and Deploy to GitHub Pages"

### Integration with Development Workflow
```bash
# Pre-push hook (optional)
#!/bin/bash
echo "Running pre-push checks..."
npm run build || exit 1
echo "✅ Local build successful"
```

## 📈 Deployment Analytics

### Tracking Deployment Frequency
```bash
# Count deployments this week
gh api repos/Mediaeater/Hudson_Street_Library/actions/runs \
  --field created=">$(date -d '7 days ago' '+%Y-%m-%d')" \
  | jq '.workflow_runs | length'
```

### Success Rate Analysis
View Actions tab and look for patterns:
- Time of day when failures occur
- Types of changes that cause failures
- Duration trends over time

## 🔗 External Monitoring

### Third-Party Services
Consider setting up external monitoring:

- **UptimeRobot**: Monitor site availability
- **GTmetrix**: Performance monitoring
- **GitHub Status**: Monitor GitHub services

### Custom Monitoring
```bash
# Simple site availability check
curl -I https://hudsonstreetlibrary.com
# Should return: HTTP/1.1 200 OK
```

## 📋 Monitoring Checklist

### Daily (Automated)
- ✅ Site accessibility check
- ✅ SSL certificate validity
- ✅ Performance metrics

### Weekly (Manual)
- ✅ Review deployment success rate
- ✅ Check for security updates
- ✅ Verify backup processes

### Monthly (Maintenance)
- ✅ Update dependencies
- ✅ Review monitoring setup
- ✅ Clean up old deployment artifacts

## 🎯 Best Practices

1. **Monitor After Changes**: Always check deployment status after pushing
2. **Test Locally First**: Run `npm run build` before pushing
3. **Small Commits**: Easier to identify issues with focused commits
4. **Descriptive Messages**: Clear commit messages help with troubleshooting
5. **Regular Checks**: Use `npm run deploy:check` before major changes

## 📞 Support Resources

- **GitHub Status**: https://www.githubstatus.com/
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Repository Issues**: https://github.com/Mediaeater/Hudson_Street_Library/issues