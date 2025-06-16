# Hudson Street Library CMS - Deployment Guide

## 🚀 Deployment Overview

This guide provides comprehensive instructions for deploying the Hudson Street Library CMS in different environments, from development setup to production deployment.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Site   │    │   CMS Backend   │    │   Database      │
│   (Eleventy)    │    │   (Express.js)  │    │  (PostgreSQL)   │
│   Port: 8080    │    │   Port: 3001    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Reverse Proxy  │
                    │     (Nginx)     │
                    │   Port: 80/443  │
                    └─────────────────┘
```

## 🔧 Prerequisites

### System Requirements

#### Development Environment
- **Operating System**: macOS, Windows, or Linux
- **Node.js**: v18 LTS or higher
- **npm**: v9 or higher
- **PostgreSQL**: v13 or higher
- **Git**: v2.30 or higher

#### Production Environment
- **Server**: Ubuntu 20.04 LTS or CentOS 8+
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 100GB SSD with backup capability
- **Network**: Stable internet connection with static IP

### Required Software

#### Development Tools
```bash
# Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Git
sudo apt-get install git

# PM2 (for production)
npm install -g pm2

# Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

## 🏠 Development Environment Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/Hudson_Street_Library.git
cd Hudson_Street_Library

# Install main dependencies
npm install

# Install CMS dependencies
cd cms
npm install
cd ..
```

### 2. Database Setup

#### Option A: Local PostgreSQL
```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Create database user
sudo -u postgres createuser --interactive
# Enter username: hudson_library
# Superuser: y

# Create database
sudo -u postgres createdb hudson_library -O hudson_library

# Set password
sudo -u postgres psql -c "ALTER USER hudson_library PASSWORD 'your_password';"
```

#### Option B: Docker PostgreSQL
```bash
# Start PostgreSQL container
docker run --name hudson-postgres \
  -e POSTGRES_DB=hudson_library \
  -e POSTGRES_USER=hudson_library \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Environment Configuration

Create environment files:

#### `.env` (root directory)
```bash
# Eleventy Configuration
NODE_ENV=development
ELEVENTY_ENV=development

# Database Connection (for data fetching)
DATABASE_URL=postgresql://hudson_library:your_password@localhost:5432/hudson_library
```

#### `cms/.env`
```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hudson_library
DB_USER=hudson_library
DB_PASSWORD=your_password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-key

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=../src/assets/images

# Email (optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. Database Initialization

```bash
# Navigate to CMS directory
cd cms

# Run database setup
npm run setup:db

# Migrate existing CSV data
npm run migrate

# Seed with sample data (optional)
npm run seed
```

### 5. Start Development Servers

#### Terminal 1: CMS Backend
```bash
cd cms
npm run dev
# Server starts on http://localhost:3001
```

#### Terminal 2: Eleventy Frontend
```bash
npm run dev
# Server starts on http://localhost:8080
```

#### Terminal 3: Watch for changes (optional)
```bash
npm run watch
```

### 6. Verify Setup

- **Frontend**: http://localhost:8080
- **Admin Panel**: http://localhost:8080/admin
- **API Health**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/api-docs

## 🎯 Staging Environment

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required software
sudo apt install -y nginx postgresql postgresql-contrib nodejs npm git ufw

# Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. Database Setup

```bash
# Configure PostgreSQL
sudo -u postgres createuser --createdb --login --pwprompt hudson_library
sudo -u postgres createdb hudson_library -O hudson_library

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/13/main/postgresql.conf
# Listen_addresses = 'localhost'

sudo nano /etc/postgresql/13/main/pg_hba.conf
# Add: local   hudson_library   hudson_library   md5

sudo systemctl restart postgresql
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/hudson-library
sudo chown $USER:$USER /var/www/hudson-library

# Clone repository
cd /var/www/hudson-library
git clone https://github.com/your-org/Hudson_Street_Library.git .

# Install dependencies
npm ci --production
cd cms && npm ci --production && cd ..

# Set up environment files
cp .env.example .env
cp cms/.env.example cms/.env

# Edit environment files with staging values
nano .env
nano cms/.env
```

### 4. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d staging.hudsonstreetlibrary.com
```

### 5. Nginx Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/hudson-library-staging
```

```nginx
server {
    listen 80;
    server_name staging.hudsonstreetlibrary.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.hudsonstreetlibrary.com;

    ssl_certificate /etc/letsencrypt/live/staging.hudsonstreetlibrary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.hudsonstreetlibrary.com/privkey.pem;

    # Static site (Eleventy)
    location / {
        root /var/www/hudson-library/_site;
        try_files $uri $uri/ @eleventy;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Admin interface proxy to CMS
    location /admin/api/ {
        proxy_pass http://localhost:3001/admin/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
    }

    # Fallback to Eleventy dev server
    location @eleventy {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hudson-library-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Process Management

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'hudson-cms',
      cwd: '/var/www/hudson-library/cms',
      script: 'server.js',
      env: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      instances: 2,
      exec_mode: 'cluster',
      error_file: '/var/log/pm2/hudson-cms-error.log',
      out_file: '/var/log/pm2/hudson-cms-out.log',
      log_file: '/var/log/pm2/hudson-cms.log'
    },
    {
      name: 'hudson-site',
      cwd: '/var/www/hudson-library',
      script: 'npm',
      args: 'run serve',
      env: {
        NODE_ENV: 'staging',
        PORT: 8080
      }
    }
  ]
};
```

```bash
# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

# Monitor processes
pm2 monit
```

## 🏭 Production Environment

### 1. Production Server Setup

#### Infrastructure Requirements
- **Load Balancer**: Nginx or AWS ALB
- **Application Servers**: 2+ instances for redundancy
- **Database**: PostgreSQL with replication
- **CDN**: CloudFlare or AWS CloudFront
- **Monitoring**: DataDog, New Relic, or Prometheus
- **Backup**: Automated daily backups

#### Security Configuration

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Install fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Database Production Setup

#### Master-Slave Replication
```bash
# Master database configuration
sudo nano /etc/postgresql/13/main/postgresql.conf
```

```conf
# Master configuration
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 64
archive_mode = on
archive_command = 'test ! -f /var/lib/postgresql/13/main/archive/%f && cp %p /var/lib/postgresql/13/main/archive/%f'
```

#### Backup Strategy
```bash
# Create backup script
sudo nano /usr/local/bin/backup-database.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DATABASE="hudson_library"

mkdir -p $BACKUP_DIR

# Create full backup
pg_dump -h localhost -U hudson_library $DATABASE | gzip > $BACKUP_DIR/hudson_library_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "hudson_library_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/hudson_library_$DATE.sql.gz s3://your-backup-bucket/database/
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/backup-database.sh

# Add to crontab
sudo crontab -e
# 0 2 * * * /usr/local/bin/backup-database.sh
```

### 3. Production Deployment Script

```bash
# Create deployment script
nano deploy.sh
```

```bash
#!/bin/bash
set -e

DEPLOY_DIR="/var/www/hudson-library"
BACKUP_DIR="/var/backups/deployments"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting deployment..."

# Create backup of current deployment
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/hudson_library_$DATE.tar.gz -C $DEPLOY_DIR .

# Pull latest code
cd $DEPLOY_DIR
git fetch origin
git checkout main
git pull origin main

# Install dependencies
npm ci --production
cd cms && npm ci --production && cd ..

# Run database migrations
cd cms && npm run migrate && cd ..

# Build static site
npm run build

# Restart services gracefully
pm2 reload ecosystem.config.js

# Health check
sleep 10
curl -f http://localhost:3001/health || {
    echo "Health check failed, rolling back..."
    pm2 reload ecosystem.config.js
    exit 1
}

echo "Deployment completed successfully!"
```

### 4. Production Nginx Configuration

```nginx
# Load balancer configuration
upstream hudson_cms {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;  # If running multiple instances
}

server {
    listen 80;
    server_name hudsonstreetlibrary.com www.hudsonstreetlibrary.com;
    return 301 https://hudsonstreetlibrary.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.hudsonstreetlibrary.com;
    return 301 https://hudsonstreetlibrary.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hudsonstreetlibrary.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/hudsonstreetlibrary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hudsonstreetlibrary.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

    # Static site
    location / {
        root /var/www/hudson-library/_site;
        try_files $uri $uri/ =404;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # API endpoints with rate limiting
    location /admin/api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://hudson_cms;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Authentication endpoints with stricter rate limiting
    location /admin/api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://hudson_cms;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ \.(env|config|key)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 5. Monitoring and Logging

#### Log Configuration
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/hudson-library
```

```conf
/var/log/pm2/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}

/var/www/hudson-library/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

#### Health Monitoring Script
```bash
# Create health check script
sudo nano /usr/local/bin/health-check.sh
```

```bash
#!/bin/bash

# Check if CMS is responding
if ! curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "CMS health check failed, restarting..."
    pm2 restart hudson-cms
    
    # Send alert (configure with your preferred method)
    echo "Hudson Library CMS health check failed at $(date)" | mail -s "CMS Alert" admin@hudsonstreetlibrary.com
fi

# Check database connectivity
if ! psql -h localhost -U hudson_library -d hudson_library -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Database health check failed"
    echo "Hudson Library database connection failed at $(date)" | mail -s "Database Alert" admin@hudsonstreetlibrary.com
fi

# Check disk space
DISK_USAGE=$(df /var/www/hudson-library | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Disk usage is at ${DISK_USAGE}%"
    echo "Hudson Library server disk usage is at ${DISK_USAGE}% at $(date)" | mail -s "Disk Space Alert" admin@hudsonstreetlibrary.com
fi
```

```bash
# Schedule health checks
sudo crontab -e
# */5 * * * * /usr/local/bin/health-check.sh
```

## 🐳 Docker Deployment

### 1. Docker Configuration

#### `Dockerfile` (CMS)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY cms/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY cms/ ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cms -u 1001
USER cms

EXPOSE 3001

CMD ["npm", "start"]
```

#### `Dockerfile` (Eleventy)
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build site
RUN npm run build

# Use nginx to serve static files
FROM nginx:alpine
COPY --from=0 /app/_site /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: hudson_library
      POSTGRES_USER: hudson_library
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hudson_library"]
      interval: 30s
      timeout: 10s
      retries: 3

  cms:
    build:
      context: .
      dockerfile: cms/Dockerfile
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: hudson_library
      DB_USER: hudson_library
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - uploads:/app/uploads
      - logs:/app/logs
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  site:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - cms

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx-prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - site
      - cms

volumes:
  postgres_data:
  uploads:
  logs:
```

### 2. Docker Deployment Commands

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f cms

# Scale CMS instances
docker-compose up -d --scale cms=3

# Update services
docker-compose pull
docker-compose up -d --force-recreate

# Backup database
docker-compose exec postgres pg_dump -U hudson_library hudson_library > backup.sql
```

## ☁️ Cloud Deployment (AWS)

### 1. AWS Infrastructure

#### ECS Deployment
```yaml
# ecs-task-definition.json
{
  "family": "hudson-library",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "cms",
      "image": "your-account.dkr.ecr.region.amazonaws.com/hudson-library-cms:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:hudson-library-db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hudson-library",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### RDS Configuration
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier hudson-library-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username hudson_library \
  --master-user-password your-secure-password \
  --allocated-storage 100 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name private-subnet-group \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

### 2. CloudFormation Template

```yaml
# infrastructure.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Hudson Street Library CMS Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues: [staging, production]

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true

  ECSCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: !Sub hudson-library-${Environment}

  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Type: application
      Scheme: internet-facing
      SecurityGroups: [!Ref ALBSecurityGroup]
      Subnets: [!Ref PublicSubnet1, !Ref PublicSubnet2]

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub hudson-library-${Environment}
      DBInstanceClass: db.t3.medium
      Engine: postgres
      EngineVersion: '15.3'
      MasterUsername: hudson_library
      MasterUserPassword: !Ref DatabasePassword
      AllocatedStorage: 100
      StorageType: gp2
      VPCSecurityGroups: [!Ref DatabaseSecurityGroup]
      DBSubnetGroupName: !Ref DatabaseSubnetGroup

Outputs:
  LoadBalancerDNS:
    Description: DNS name of the load balancer
    Value: !GetAtt LoadBalancer.DNSName
    Export:
      Name: !Sub ${AWS::StackName}-LoadBalancerDNS
```

## 🔍 Monitoring and Observability

### 1. Application Monitoring

#### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-server-monit

# Set up monitoring dashboard
pm2 monitor
```

#### Custom Health Checks
```javascript
// cms/middleware/health.js
const healthCheck = {
  database: async () => {
    try {
      await db.query('SELECT 1');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  },
  
  storage: async () => {
    const stats = await fs.stat('./uploads');
    return { 
      status: 'healthy',
      diskUsage: stats.size 
    };
  },
  
  memory: () => {
    const used = process.memoryUsage();
    return {
      status: used.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'warning',
      heapUsed: used.heapUsed,
      heapTotal: used.heapTotal
    };
  }
};
```

### 2. Logging Strategy

#### Structured Logging
```javascript
// cms/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

### 3. Performance Monitoring

#### Database Query Monitoring
```javascript
// cms/middleware/query-monitor.js
const queryMonitor = (req, res, next) => {
  const originalQuery = db.query;
  const queries = [];
  
  db.query = function(...args) {
    const start = Date.now();
    const result = originalQuery.apply(this, args);
    
    result.then(() => {
      queries.push({
        query: args[0],
        duration: Date.now() - start,
        timestamp: new Date()
      });
    });
    
    return result;
  };
  
  res.on('finish', () => {
    if (queries.length > 10) {
      logger.warn('High query count detected', { 
        path: req.path,
        queryCount: queries.length,
        queries 
      });
    }
  });
  
  next();
};
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U hudson_library -d hudson_library -c "SELECT version();"

# Check logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

#### 2. File Upload Issues
```bash
# Check disk space
df -h /var/www/hudson-library

# Check permissions
ls -la /var/www/hudson-library/src/assets/images

# Fix permissions
sudo chown -R www-data:www-data /var/www/hudson-library/src/assets/images
sudo chmod -R 755 /var/www/hudson-library/src/assets/images
```

#### 3. Performance Issues
```bash
# Check system resources
htop
iotop

# Check PM2 processes
pm2 list
pm2 monit

# Check database performance
sudo -u postgres psql -d hudson_library -c "SELECT * FROM pg_stat_activity;"
```

### Recovery Procedures

#### 1. Database Recovery
```bash
# Restore from backup
gunzip -c /var/backups/postgresql/hudson_library_20240115.sql.gz | psql -U hudson_library -d hudson_library

# Point-in-time recovery
pg_basebackup -h localhost -D /var/lib/postgresql/recovery -U replication
```

#### 2. Application Recovery
```bash
# Restart services
pm2 restart all

# Rebuild static site
cd /var/www/hudson-library
npm run build

# Clear caches
pm2 flush
```

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] Code review completed
- [ ] Tests passing
- [ ] Security scan completed
- [ ] Database migration tested
- [ ] Backup verification
- [ ] Performance testing
- [ ] SSL certificate valid

### Deployment
- [ ] Maintenance mode enabled
- [ ] Database backup created
- [ ] Code deployed
- [ ] Dependencies updated
- [ ] Database migrations run
- [ ] Static assets built
- [ ] Services restarted
- [ ] Health checks passing

### Post-Deployment
- [ ] Smoke tests completed
- [ ] Performance monitoring normal
- [ ] Error rates acceptable
- [ ] User acceptance testing
- [ ] Documentation updated
- [ ] Team notified
- [ ] Maintenance mode disabled

---

## 📞 Support Contacts

**DevOps Team**: devops@hudsonstreetlibrary.com
**Emergency Hotline**: +1-XXX-XXX-XXXX
**On-Call Engineer**: Available 24/7 for production issues

---

*This deployment guide provides comprehensive instructions for all deployment scenarios. For specific environment questions or issues, please contact the DevOps team.*