# Contributing to PTT System

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions professional

## Development Setup

### Prerequisites

- Node.js 18+ LTS
- Git
- Modern browser (Chrome, Firefox, Safari, Edge)
- Basic knowledge of JavaScript, WebSockets, and WebRTC

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/ptt-system.git
   cd ptt-system
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
ptt-system/
├── server/              # Backend code
│   ├── index.js        # Main server with WebSocket
│   ├── config.js       # Configuration management
│   ├── validation.js   # Input validation utilities
│   └── logger.js       # Logging utilities
├── public/             # Frontend code
│   ├── index.html      # Main HTML
│   ├── sw.js           # Service Worker
│   ├── manifest.json   # PWA manifest
│   ├── css/
│   │   └── styles.css  # Application styles
│   ├── js/
│   │   └── main.js     # Main application logic
│   ├── workers/
│   │   └── ws-worker.js # WebSocket worker
│   └── icons/          # PWA icons
├── users/              # User data (JSON files)
└── tools/              # Development tools
```

## Coding Standards

### JavaScript Style

- Use ES6+ features (modules, async/await, destructuring)
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Meaningful variable and function names
- Comments for complex logic

### Example:

```javascript
// Good
async function getUserData(username) {
  try {
    const user = await fetchUser(username);
    return user;
  } catch (err) {
    logger.error('Failed to fetch user', err);
    throw err;
  }
}

// Avoid
function getData(u) {
  return fetchUser(u).catch(e => { throw e; });
}
```

### Server-Side Code

- Use structured logging (logger utility)
- Validate all inputs
- Handle errors gracefully
- Add rate limiting where appropriate
- Document complex functions

### Client-Side Code

- Keep main thread light
- Use Web Workers for heavy tasks
- Handle offline scenarios
- Provide user feedback for actions
- Progressive enhancement

## Making Changes

### 1. Features

When adding a new feature:

1. Check if an issue exists, if not create one
2. Discuss the approach before starting
3. Write tests if applicable
4. Update documentation
5. Ensure backward compatibility

### 2. Bug Fixes

When fixing a bug:

1. Create an issue describing the bug
2. Reference the issue in your commit
3. Add test to prevent regression
4. Verify fix doesn't break existing functionality

### 3. Documentation

- Keep README.md up to date
- Update API documentation
- Add inline comments for complex code
- Include examples where helpful

## Testing

### Manual Testing

1. Test on multiple browsers:
   - Chrome/Edge (latest)
   - Firefox (latest)
   - Safari (latest, including iOS)

2. Test scenarios:
   - Multiple users connecting
   - Network disconnection/reconnection
   - Browser refresh
   - Different screen sizes
   - PWA installation

3. Test security:
   - Invalid inputs
   - XSS attempts
   - Path traversal
   - Rate limiting

### Example Test Session

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Watch logs
tail -f logs/combined.log

# Browser 1: User "driver1"
# Browser 2: User "dispatch"
# Browser 3: User "driver2"

# Test:
- Login/logout
- Status changes
- Network disconnect (DevTools → Offline)
- Connection recovery
```

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(auth): add password authentication support

- Add password field to user model
- Implement bcrypt hashing
- Update login API endpoint
- Add password validation

Closes #42
```

```
fix(ws): prevent duplicate user connections

Check if user is already connected before accepting
new connection. Closes #38
```

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tested manually on multiple browsers
- [ ] Updated relevant documentation
- [ ] Commits are clean and well-described
- [ ] No console.log() left in code (use logger)
- [ ] No commented-out code
- [ ] No merge conflicts

### Submitting

1. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create Pull Request on GitHub

3. Fill in the PR template:
   - What does this PR do?
   - Why is this change needed?
   - How was it tested?
   - Screenshots (if UI changes)
   - Related issues

### Review Process

- Maintainers will review within 48 hours
- Address feedback promptly
- Keep PR focused and atomic
- Be open to suggestions

## Development Tips

### Debugging WebSocket

```javascript
// In browser console
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (e) => console.log('Received:', JSON.parse(e.data));
ws.send(JSON.stringify({ type: 'heartbeat' }));
```

### Testing Workers

```javascript
// In browser console
const worker = new Worker('/workers/ws-worker.js');
worker.onmessage = (e) => console.log('Worker:', e.data);
worker.postMessage({ type: 'connect', payload: { ... } });
```

### Simulating Network Issues

Use Chrome DevTools:
- F12 → Network tab → Throttling dropdown
- Options: Offline, Slow 3G, Fast 3G
- Or custom profiles

### Performance Profiling

```javascript
// Measure performance
console.time('operation');
// ... your code ...
console.timeEnd('operation');

// Or use Performance API
const start = performance.now();
// ... your code ...
const end = performance.now();
console.log(`Took ${end - start}ms`);
```

## Areas Needing Help

Current priorities:

1. **WebRTC Implementation**
   - Peer-to-peer audio setup
   - STUN/TURN server integration
   - Audio capture and streaming

2. **Push Notifications**
   - Web Push API integration
   - VAPID key management
   - Notification service

3. **Audio Processing**
   - AudioWorklet implementation
   - Echo cancellation
   - Noise suppression

4. **Testing**
   - Unit tests (Jest/Mocha)
   - Integration tests
   - E2E tests (Playwright/Cypress)

5. **UI/UX Improvements**
   - Better mobile experience
   - Accessibility (ARIA labels, keyboard navigation)
   - Dark/light theme toggle

6. **Documentation**
   - API documentation
   - Architecture diagrams
   - Video tutorials

## Questions?

- Open an issue with the `question` label
- Check existing issues and documentation first
- Be specific and provide context

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Acknowledged in the README (for significant contributions)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

---

Thank you for contributing to PTT System! 🎉
