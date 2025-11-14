# Deployment Guide - PTT System

This guide covers deploying the PTT system to production.

## Pre-Deployment Checklist

- [ ] Test the application locally
- [ ] Review security settings
- [ ] Generate SSL certificates (for HTTPS)
- [ ] Configure environment variables
- [ ] Set up process manager (PM2)
- [ ] Configure firewall rules
- [ ] Generate PWA icons
- [ ] Set up monitoring/logging
- [ ] Configure backup strategy

## Production Environment Setup

### 1. Server Requirements

**Minimum:**
- Node.js 18+ LTS
- 1GB RAM
- 10GB storage
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+

**Recommended:**
- Node.js 20+ LTS
- 2GB+ RAM
- 20GB+ storage
- Load balancer for high traffic

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 process manager
sudo npm install -g pm2

# Install nginx (optional, for reverse proxy)
sudo apt install -y nginx
```

### 3. Clone and Setup Application

```bash
# Clone repository (or upload files)
git clone <your-repo-url> ptt-system
cd ptt-system

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
nano .env
```

### 4. Configure Environment Variables

Edit `.env` file:

```bash
# Production settings
NODE_ENV=production
PORT=3000

# Heartbeat (adjust based on network reliability)
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=45000

# Security
CORS_ORIGINS=https://yourdomain.com

# Rate limiting (adjust based on usage)
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# SSL (when using HTTPS)
# SSL_KEY_PATH=/path/to/privkey.pem
# SSL_CERT_PATH=/path/to/fullchain.pem
```

### 5. Generate SSL Certificates (HTTPS)

**Using Let's Encrypt (Recommended):**

```bash
# Install Certbot
sudo apt install -y certbot

# Generate certificate (using standalone mode)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be in:
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Set up auto-renewal
sudo certbot renew --dry-run
```

### 6. Configure Firewall

```bash
# Using UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

### 7. Start with PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ptt-system',
    script: './server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start the application:

```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs ptt-system

# Setup PM2 to start on boot
pm2 startup
pm2 save
```

### 8. Configure Nginx Reverse Proxy (Optional but Recommended)

Create `/etc/nginx/sites-available/ptt-system`:

```nginx
upstream ptt_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logs
    access_log /var/log/nginx/ptt-access.log;
    error_log /var/log/nginx/ptt-error.log;

    # Max upload size
    client_max_body_size 10M;

    # WebSocket support
    location / {
        proxy_pass http://ptt_backend;
        proxy_http_version 1.1;

        # WebSocket headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://ptt_backend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site and restart nginx:

```bash
sudo ln -s /etc/nginx/sites-available/ptt-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. Generate PWA Icons

Use an online tool or ImageMagick:

```bash
# Install ImageMagick
sudo apt install -y imagemagick

# Create icons from your source image (e.g., logo.png)
# Ensure you have a high-res source (at least 512x512)

sizes=(72 96 128 144 152 192 384 512)
for size in "${sizes[@]}"; do
    convert logo.png -resize ${size}x${size} public/icons/icon-${size}.png
done
```

### 10. Set Up Monitoring

```bash
# Monitor with PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Monitor server resources
pm2 install pm2-server-monit
```

### 11. Database Backup (User Files)

Create backup script `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/ptt-system"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup user files
tar -czf $BACKUP_DIR/users_$DATE.tar.gz users/

# Keep only last 7 days
find $BACKUP_DIR -name "users_*.tar.gz" -mtime +7 -delete

echo "Backup completed: users_$DATE.tar.gz"
```

Schedule with cron:

```bash
chmod +x backup.sh
crontab -e

# Add line (daily backup at 2 AM):
0 2 * * * /path/to/backup.sh
```

## Testing Production Deployment

### 1. Health Check

```bash
# Check if server is running
curl http://localhost:3000

# Check WebSocket (requires websocat or similar)
# Install websocat: cargo install --features=ssl websocat
echo '{"type":"ping"}' | websocat ws://localhost:3000
```

### 2. Load Testing

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test HTTP endpoints
ab -n 1000 -c 10 http://localhost:3000/

# For WebSocket load testing, use tools like:
# - artillery
# - k6
# - ws-bench
```

### 3. Security Audit

```bash
# Check open ports
sudo netstat -tulpn

# Check SSL configuration
openssl s_client -connect yourdomain.com:443 -tls1_3

# Test with SSL Labs
# Visit: https://www.ssllabs.com/ssltest/
```

## Troubleshooting

### Server Won't Start

```bash
# Check PM2 logs
pm2 logs ptt-system --lines 100

# Check port availability
sudo lsof -i :3000

# Check permissions
ls -la users/
```

### WebSocket Connection Issues

```bash
# Check nginx WebSocket config
sudo nginx -t

# Check firewall
sudo ufw status

# Test WebSocket directly
websocat ws://localhost:3000
```

### High Memory Usage

```bash
# Check memory
pm2 status
free -h

# Restart if needed
pm2 restart ptt-system
```

### SSL Certificate Issues

```bash
# Test certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check nginx SSL config
sudo nginx -t
```

## Monitoring & Maintenance

### Daily Tasks
- Review PM2 logs for errors
- Check server resources (CPU, memory, disk)
- Verify backups are running

### Weekly Tasks
- Review user activity
- Check for security updates
- Test backup restoration

### Monthly Tasks
- Update Node.js and dependencies
- Review and rotate logs
- Performance optimization
- Security audit

## Performance Optimization

### For High Traffic

1. **Horizontal Scaling**: Run multiple instances behind a load balancer
2. **Redis Session Store**: For multi-server deployments
3. **CDN**: Serve static assets from CDN
4. **Database**: Migrate from JSON files to PostgreSQL/MongoDB
5. **Caching**: Implement Redis for session/presence caching

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ptt-system',
    script: './server/index.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    // ... other settings
  }]
};
```

## Rollback Procedure

```bash
# Stop current version
pm2 stop ptt-system

# Restore previous version
git checkout <previous-tag>
npm install --production

# Restart
pm2 restart ptt-system

# Restore backups if needed
tar -xzf /backups/ptt-system/users_YYYYMMDD_HHMMSS.tar.gz
```

## Support & Maintenance

For production issues:
1. Check PM2 logs first
2. Review nginx error logs
3. Check system resources
4. Review recent changes
5. Test with curl/websocat

## Security Checklist

- [x] HTTPS enabled with valid certificate
- [x] Firewall configured
- [x] Rate limiting enabled
- [x] Input validation implemented
- [x] Security headers set
- [x] Regular backups scheduled
- [x] Monitoring in place
- [x] Graceful shutdown handlers
- [ ] Intrusion detection system (optional)
- [ ] DDoS protection (Cloudflare, etc.)

## Next Steps

After successful deployment:
1. Add WebRTC functionality for PTT
2. Implement push notifications
3. Add audio worklet for processing
4. Set up analytics/metrics
5. Create mobile app versions
