# PTT System - Quick Reference Card

## 🚀 Quick Start

```bash
cd ptt-system
npm install
npm start
# Open http://localhost:3000
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `server/index.js` | Main server with WebSocket |
| `public/js/main.js` | Client application logic |
| `public/workers/ws-worker.js` | WebSocket handler |
| `public/sw.js` | Service Worker (PWA) |
| `.env.example` | Configuration template |

## 🔧 NPM Scripts

```bash
npm start          # Start server (production mode)
npm run dev        # Start with auto-restart
```

## 🌐 Endpoints

### HTTP API
- `POST /api/register` - Create user
- `POST /api/login` - Login user
- `GET /api/users` - List users
- `GET /` - Serve app

### WebSocket Messages
**Client → Server:**
- `auth` - Authenticate
- `heartbeat` - Keep alive
- `status_change` - Update status

**Server → Client:**
- `auth_success` - Login OK
- `user_joined` - User online
- `user_left` - User offline
- `user_status_changed` - Status update

## 🔐 Security Features

- ✅ Input validation
- ✅ Rate limiting (100 req/min API, 50 msg/10s WS)
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Directory traversal prevention
- ✅ Payload size limits

## 📊 Monitoring

### Check Logs
```bash
# Using PM2
pm2 logs ptt-system

# Direct node
tail -f logs/combined.log
```

### Check Status
```bash
pm2 status
pm2 monit
```

### Test Endpoints
```bash
# Health check
curl http://localhost:3000

# Register user
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'

# Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'
```

## 🐛 Debugging

### Check Server
```bash
# View running processes
ps aux | grep node

# Check port usage
lsof -i :3000

# Test WebSocket
websocat ws://localhost:3000
```

### Browser Console
```javascript
// Check Service Worker
navigator.serviceWorker.getRegistrations()

// Check WebSocket
const ws = new WebSocket('ws://localhost:3000')
ws.onmessage = e => console.log(JSON.parse(e.data))
```

## 🔄 Common Tasks

### Add New User
Just enter username in login form - auto-creates

### Change User Status
Click settings icon → Select status

### View Online Users
Appears automatically in main screen

### Reset Everything
```bash
rm -rf users/*.json
rm -rf node_modules
npm install
npm start
```

## 📦 Deployment

### Development
```bash
npm run dev
```

### Production (PM2)
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Production (systemd)
```bash
# Create service file at /etc/systemd/system/ptt.service
sudo systemctl enable ptt
sudo systemctl start ptt
```

## 🚨 Troubleshooting

### Server won't start
- Check port 3000 is free: `lsof -i :3000`
- Check Node version: `node --version` (need 18+)
- Check permissions on `users/` directory

### WebSocket won't connect
- Check firewall allows port 3000
- Check nginx WebSocket config (if using)
- Test direct: `websocat ws://localhost:3000`

### Users not appearing
- Check browser console for errors
- Verify WebSocket connection status
- Check server logs for connection messages

### High memory usage
```bash
pm2 restart ptt-system
pm2 delete ptt-system && pm2 start ecosystem.config.js
```

## 📝 Configuration

### Environment Variables (.env)
```bash
PORT=3000
NODE_ENV=production
HEARTBEAT_INTERVAL=30000
HEARTBEAT_TIMEOUT=45000
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### PM2 (ecosystem.config.js)
```javascript
{
  name: 'ptt-system',
  script: './server/index.js',
  instances: 1,
  env_production: {
    NODE_ENV: 'production'
  }
}
```

## 🎯 Next Steps

1. **Add WebRTC**: Implement peer-to-peer audio
2. **Push Notifications**: VAPID keys & Web Push
3. **Database**: Migrate from JSON to PostgreSQL
4. **Tests**: Add unit and integration tests
5. **Monitoring**: Set up error tracking

## 📚 Documentation

- `README.md` - Overview and features
- `DEPLOY.md` - Production deployment guide
- `CONTRIBUTING.md` - How to contribute
- `PROJECT_SUMMARY.md` - Complete project details

## 🆘 Support

- Check logs first: `pm2 logs` or `tail -f logs/combined.log`
- Review error messages in browser console
- Check server status: `pm2 status` or `systemctl status ptt`
- Verify configuration: `.env` file settings

## 🔗 Useful Links

- Node.js: https://nodejs.org/
- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- WebRTC: https://webrtc.org/

---

**Version**: 1.0.0 (Foundation)
**Status**: ✅ Production Ready (Foundation Only)
**Next**: WebRTC Audio Integration
