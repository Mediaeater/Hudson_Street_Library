#!/bin/bash
#
# Setup Automated Backups for books.csv
#
# This script configures a cron job to automatically back up books.csv
# at regular intervals.
#
# Usage:
#   ./scripts/setup-backup-cron.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-books-csv.sh"
LOG_DIR="$PROJECT_DIR/logs"
CRON_LOG="$LOG_DIR/backup.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Hudson Street Library - Backup Cron Setup${NC}"
echo ""

# Check if backup script exists
if [[ ! -f "$BACKUP_SCRIPT" ]]; then
    echo "Error: Backup script not found at $BACKUP_SCRIPT"
    exit 1
fi

# Make sure it's executable
chmod +x "$BACKUP_SCRIPT"

# Create logs directory
mkdir -p "$LOG_DIR"

# Check current cron jobs
echo "Current backup cron jobs:"
crontab -l 2>/dev/null | grep -E "backup-books-csv|hudson.*backup" || echo "  (none found)"
echo ""

# Backup schedule options
echo "Select backup schedule:"
echo ""
echo "  1) Every 6 hours (recommended)"
echo "  2) Every 4 hours (frequent)"
echo "  3) Every 12 hours (twice daily)"
echo "  4) Daily at 2 AM"
echo "  5) Every hour (maximum protection)"
echo "  6) Custom schedule"
echo "  7) Remove backup cron job"
echo ""
read -p "Enter choice [1-7]: " choice

case $choice in
    1)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="every 6 hours"
        ;;
    2)
        CRON_SCHEDULE="0 */4 * * *"
        DESCRIPTION="every 4 hours"
        ;;
    3)
        CRON_SCHEDULE="0 */12 * * *"
        DESCRIPTION="every 12 hours"
        ;;
    4)
        CRON_SCHEDULE="0 2 * * *"
        DESCRIPTION="daily at 2 AM"
        ;;
    5)
        CRON_SCHEDULE="0 * * * *"
        DESCRIPTION="every hour"
        ;;
    6)
        echo ""
        echo "Enter custom cron schedule (e.g., '0 */6 * * *' for every 6 hours):"
        read -p "Schedule: " CRON_SCHEDULE
        DESCRIPTION="custom schedule: $CRON_SCHEDULE"
        ;;
    7)
        echo ""
        echo "Removing backup cron job..."

        # Remove existing backup cron job
        crontab -l 2>/dev/null | grep -v "backup-books-csv.sh" | crontab - 2>/dev/null || true

        echo -e "${GREEN}✓ Backup cron job removed${NC}"
        echo ""
        echo "You can still run backups manually with:"
        echo "  ./scripts/backup-books-csv.sh"
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Create the cron job entry
CRON_ENTRY="$CRON_SCHEDULE cd $PROJECT_DIR && $BACKUP_SCRIPT >> $CRON_LOG 2>&1"

# Remove any existing backup-books-csv entries to avoid duplicates
crontab -l 2>/dev/null | grep -v "backup-books-csv.sh" | crontab - 2>/dev/null || true

# Add new cron job
(crontab -l 2>/dev/null; echo "# Hudson Street Library - Automatic CSV backup ($DESCRIPTION)"; echo "$CRON_ENTRY") | crontab -

echo ""
echo -e "${GREEN}✓ Backup cron job configured!${NC}"
echo ""
echo "Schedule: $DESCRIPTION"
echo "Cron:     $CRON_SCHEDULE"
echo "Script:   $BACKUP_SCRIPT"
echo "Logs:     $CRON_LOG"
echo ""
echo "Backup locations:"
echo "  1. Local:  $PROJECT_DIR/src/_data/backups/"
echo "  2. Safe:   ~/.hudson-library-backups/"
echo "  3. Git:    Auto-commits if changes detected"
echo ""
echo -e "${YELLOW}Important:${NC}"
echo "  - Backups run automatically in the background"
echo "  - Check logs with: tail -f $CRON_LOG"
echo "  - Verify with: crontab -l"
echo "  - Test backup: $BACKUP_SCRIPT"
echo ""
echo "Retention policy:"
echo "  - Hourly:  24 backups (last 24 hours)"
echo "  - Daily:   30 backups (last 30 days)"
echo "  - Weekly:  12 backups (last 3 months)"
echo ""

# Verify cron service is running
if ! launchctl list | grep -q "com.vix.cron"; then
    echo -e "${YELLOW}Warning: cron service may not be running${NC}"
    echo "On macOS, you may need to enable cron in System Settings > Privacy & Security > Full Disk Access"
fi

exit 0
