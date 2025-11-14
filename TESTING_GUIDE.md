# PTT System - Testing Guide

Complete guide for testing the Push-to-Talk audio functionality.

## ✅ Prerequisites

- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Microphone Access**: Required for testing
- **Multiple Devices** (recommended): 2+ computers, phones, or tabs
- **Headphones** (recommended): To prevent audio feedback

---

## 🚀 Quick Test (2 Minutes)

### 1. Start the Server
```bash
cd ptt-system
npm start
```

### 2. Open Two Browser Windows

**Window 1:**
1. Go to http://localhost:3000
2. Login as `driver1`
3. **Allow microphone access** when prompted
4. Wait for "Microphone ready" status

**Window 2:**
1. Go to http://localhost:3000
2. Login as `dispatch`
3. **Allow microphone access** when prompted
4. You should see `driver1` in the online users list
5. Look for "Audio Ready" badge next to driver1

### 3. Test PTT

**In Window 1 (driver1):**
1. **Hold down** the PTT button (blue circle)
2. Speak: "Hello, this is driver1"
3. Button should turn bright blue and spin
4. Status should show "Transmitting..."
5. **Release** the button when done

**In Window 2 (dispatch):**
- You should hear driver1's voice through your speakers/headphones
- Status should briefly show "Receiving from driver1"

**Switch and test the other direction!**

---

## 🧪 Comprehensive Testing

### Test 1: Microphone Permission

**Goal:** Verify microphone access works

1. Login to the app
2. Browser should prompt for microphone permission
3. Click "Allow"
4. Audio status should show "Microphone ready" (green)
5. PTT button should be enabled (bright, clickable)

**Expected:**
- ✅ Microphone permission granted
- ✅ PTT button enabled
- ✅ Green "Microphone ready" status

**If it fails:**
- Check browser permissions (click lock icon in address bar)
- Make sure microphone is connected/not in use
- Try refreshing the page

---

### Test 2: WebRTC Connection

**Goal:** Verify peer-to-peer audio connection

1. Login on Device A as `user1`
2. Login on Device B as `user2`
3. Wait 5-10 seconds for WebRTC connection

**Expected on both devices:**
- ✅ See other user in "Online Users" list
- ✅ Green left border on user card
- ✅ "Audio Ready" badge visible
- ✅ Small pulsing dot on user avatar

**Debug if connection fails:**
```javascript
// In browser console:
console.log('Peers:', app.webrtc.peers);
// Should show peer connection for other user
```

---

### Test 3: Push-to-Talk Transmission

**Goal:** Verify one-way audio transmission

**Sender (Device A):**
1. **Hold** PTT button (don't release yet)
2. Button turns bright cyan/blue
3. Button spins
4. Status shows "Transmitting..."
5. Speak clearly: "Testing one two three"
6. **Release** PTT button
7. Button returns to normal
8. Status shows "Ready"

**Receiver (Device B):**
1. Watch for status change to "Receiving from [username]"
2. Should hear sender's voice
3. Audio should be clear
4. Status returns to "Ready" when sender releases

**Expected:**
- ✅ Clear audio transmission
- ✅ <100ms latency
- ✅ No echo or feedback (if using headphones)
- ✅ Visual feedback on both ends

---

### Test 4: Two-Way Communication

**Goal:** Test back-and-forth conversation

1. User A: Hold PTT, say "Can you hear me?"
2. User A: Release PTT
3. User B: Hold PTT, say "Yes, I hear you loud and clear"
4. User B: Release PTT
5. Repeat several times

**Expected:**
- ✅ Bidirectional audio works
- ✅ No overlap (only one person talks at a time)
- ✅ Clear audio both directions

---

### Test 5: Multiple Users (Group Test)

**Goal:** Test with 3+ users

1. Open 3 browser windows/devices
2. Login as `driver1`, `driver2`, `dispatch`
3. Wait for all connections to establish
4. Each user should see 2 others with "Audio Ready"

**Test Pattern:**
1. driver1: Hold PTT, speak
2. Both driver2 and dispatch should hear
3. dispatch: Hold PTT, speak
4. Both drivers should hear
5. driver2: Hold PTT, speak
6. Both driver1 and dispatch should hear

**Expected:**
- ✅ All users can talk to all users
- ✅ Broadcasts to everyone simultaneously
- ✅ Audio quality remains good

---

### Test 6: Mobile Testing (iOS/Android)

**Goal:** Verify mobile functionality

**Setup:**
1. On mobile: Open browser (Safari/Chrome)
2. Go to http://[your-local-ip]:3000
3. Login
4. Allow microphone access

**PTT Button Test:**
1. **Tap and hold** the blue PTT button
2. Button should turn bright cyan
3. Speak into phone
4. **Release** finger from button
5. Should return to normal

**Expected:**
- ✅ Touch events work correctly
- ✅ Haptic feedback on press/release (vibration)
- ✅ No accidental triggers
- ✅ Button doesn't stick
- ✅ Audio transmits clearly

**iOS Specific:**
- Test in Safari (required for PWA)
- Test with phone locked/unlocked
- Test with app in background

---

### Test 7: Network Resilience

**Goal:** Test reconnection and recovery

**Scenario A: Network Disconnect**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Status should show "Disconnected"
4. PTT button should be disabled
5. Set back to "Online"
6. Should reconnect automatically
7. PTT button enabled again

**Scenario B: Server Restart**
1. Stop server (Ctrl+C)
2. Client should show "Disconnected"
3. Start server again
4. Should reconnect within 3 seconds
5. WebRTC connections re-establish

**Expected:**
- ✅ Graceful disconnect handling
- ✅ Automatic reconnection
- ✅ WebRTC sessions re-established
- ✅ No crashes or errors

---

### Test 8: Audio Quality

**Goal:** Verify clear audio transmission

**Test with:**
1. **Normal speech**: Conversation volume
2. **Loud speech**: Shouting
3. **Quiet speech**: Whispering
4. **Background noise**: Music, typing, traffic
5. **Quick bursts**: Rapid press-release-press

**Check for:**
- ✅ No clipping or distortion
- ✅ No echo or feedback
- ✅ Consistent volume
- ✅ Clear voice quality
- ✅ No audio cutting out

**In browser console:**
```javascript
// Check audio tracks
console.log(app.webrtc.localStream.getAudioTracks());
// Should show enabled: true when transmitting
```

---

### Test 9: Edge Cases

**Multiple Rapid Presses:**
1. Quickly press and release PTT 10 times
2. Should handle gracefully
3. No audio stuttering
4. No connection drops

**Hold PTT for Long Time:**
1. Hold PTT for 30+ seconds
2. Continuous transmission
3. No timeout or disconnect
4. Audio remains clear

**Login/Logout Cycles:**
1. Login → Talk → Logout
2. Login again with same username
3. Should work immediately
4. Repeat 5 times

---

### Test 10: Performance

**Goal:** Measure system performance

**CPU Usage:**
- Idle: <5% CPU
- Transmitting: <15% CPU
- 3+ users: <20% CPU

**Memory:**
- Initial: ~50MB server, ~30MB client
- After 10 min: No significant memory leaks
- After 100 messages: Stable memory

**Latency:**
- Connection setup: <2 seconds
- Audio latency: <200ms (preferably <100ms)
- Reconnection: <3 seconds

**Browser Console:**
```javascript
// Check WebRTC stats
app.webrtc.peers.forEach((pc, userId) => {
  pc.getStats().then(stats => {
    stats.forEach(report => {
      if (report.type === 'inbound-rtp') {
        console.log('Latency:', report.jitter);
        console.log('Packets Lost:', report.packetsLost);
      }
    });
  });
});
```

---

## 📱 Mobile-Specific Testing

### iOS Safari
1. **Add to Home Screen**
   - Tap Share → Add to Home Screen
   - Launch from home screen
   - Should work as standalone app

2. **Background Testing**
   - Start transmitting
   - Switch to another app
   - Audio should continue

3. **Lock Screen**
   - Device locked: PTT shouldn't work (security)
   - Unlock: Should work again

### Android Chrome
1. **Install PWA**
   - Browser prompts to install
   - Or: Menu → Add to Home Screen
   - Launch from app drawer

2. **Permissions**
   - Microphone permission persists
   - No repeated prompts

---

## 🐛 Troubleshooting

### No Audio Transmitted

**Check:**
1. Microphone permission granted?
2. Microphone working? (test in other apps)
3. WebRTC connection established? (see "Audio Ready" badge)
4. PTT button actually pressed?

**Browser Console:**
```javascript
console.log('Local stream:', app.webrtc.localStream);
console.log('Is muted:', app.webrtc.isMuted);
console.log('Is transmitting:', app.webrtc.isTransmitting);
```

### Echo / Feedback

**Solution:**
- **Use headphones!**
- Or: Mute speakers while testing
- Or: Test on different devices in different rooms

### Connection Won't Establish

**Check:**
1. Both users online? (see users list)
2. Firewall blocking WebRTC?
3. Behind NAT/VPN? (STUN might fail)

**Try:**
- Refresh both pages
- Test on same network first
- Check browser console for errors

### Audio Cutting Out

**Possible causes:**
- Poor network connection
- High CPU usage
- Microphone issues

**Solutions:**
- Close other applications
- Check network speed
- Try different browser

### PTT Button Stuck

**If button stays "transmitting":**
1. Click/tap button again
2. Refresh page
3. Re-login

**Prevention:**
- Don't drag finger off button
- Full press and release
- Avoid touch while button animating

---

## 📊 Success Criteria

Your PTT system is working correctly if:

- [x] **Permissions**: Microphone access granted smoothly
- [x] **Connection**: WebRTC establishes within 5 seconds
- [x] **Audio**: Clear voice, <200ms latency
- [x] **PTT**: Button responds instantly to press/release
- [x] **Visual**: Status updates match audio state
- [x] **Mobile**: Touch events work perfectly
- [x] **Multi-user**: 3+ users can all communicate
- [x] **Stability**: No crashes after 10+ minutes
- [x] **Recovery**: Reconnects automatically after disconnect

---

## 🎯 Advanced Testing

### Load Testing
```bash
# Test with many concurrent users
# Open 10+ browser tabs simultaneously
for i in {1..10}; do
  open "http://localhost:3000"
done
```

### Network Conditions
**Simulate poor network:**
- Chrome DevTools → Network → Throttling
- Test "Slow 3G", "Fast 3G"
- Verify audio still works

### Security Testing
**Try to break it:**
- Invalid usernames
- SQL injection attempts (should fail)
- XSS attempts (should be sanitized)
- Disconnect during transmission
- Multiple logins same user

---

## 📝 Test Report Template

```markdown
## Test Results - [Date]

**Environment:**
- Browser: Chrome 120
- OS: macOS Sonoma
- Network: WiFi

**Tests Performed:**
1. ✅ Microphone Permission - PASSED
2. ✅ WebRTC Connection - PASSED
3. ✅ PTT Transmission - PASSED
4. ✅ Two-Way Communication - PASSED
5. ⚠️  Mobile Testing - MINOR ISSUES
6. ✅ Network Resilience - PASSED

**Issues Found:**
- iOS: PTT button sometimes requires double-tap

**Performance:**
- Latency: 80ms average
- CPU: 8% idle, 12% transmitting
- Memory: 35MB stable

**Conclusion:**
System ready for production with minor iOS fixes needed.
```

---

## 🆘 Getting Help

If tests fail:
1. Check server logs: `pm2 logs ptt-system`
2. Check browser console for errors
3. Verify WebRTC support: https://test.webrtc.org/
4. Test microphone: https://webcammictest.com/
5. Check network: `ping localhost`

---

**Ready to test?** Start with the Quick Test and work through each scenario! 🎉
