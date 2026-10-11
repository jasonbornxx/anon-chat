# Anon Chat

Private peer-to-peer chat, voice calls, video calls and file sharing. No accounts, no backend, no database.
Everything is static files, so it deploys to GitHub Pages or Vercel as is.

## Deploy

**GitHub Pages**
1. Put the contents of this folder at the root of a GitHub repo (or in a `/docs` folder).
2. Settings, Pages, deploy from branch `main`, folder `/ (root)` (or `/docs`).
3. Open `https://<you>.github.io/<repo>/` on your phone and choose "Install app" / "Add to Home Screen".

**Vercel**
1. Push the repo to GitHub, then "Add New Project" in Vercel and import it.
2. Framework preset: Other. No build command, no output directory. Deploy.
`vercel.json` adds security headers automatically.

## How identity works
- First launch creates an ECDSA P-256 key pair and saves it in the browser (IndexedDB).
- Your ID is the hash of your public key, so nobody can pretend to be you without your private key.
- Every connection runs a handshake where both sides sign a transcript containing both WebRTC DTLS
  fingerprints. This blocks impersonation and a malicious signaling server in the middle.
- Calls get the same check; call audio/video stay muted and hidden until it passes.
- Optional passcode (Settings) encrypts your private key and saved chats on the device (PBKDF2 + AES-GCM).
- Export an encrypted backup in Settings to keep your ID if you lose the device.

## Files
| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | UI and app logic |
| `crypto.js`, `store.js` | Identity/crypto helpers, IndexedDB storage |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA |
| `vendor/peerjs.min.js` | PeerJS 1.5.4, served locally (no third-party scripts) |
| `vercel.json` | Security headers for Vercel |

## Config (top of `app.js`)
- `ICE_SERVERS`: add your own TURN server for reliable calls on every network.
- `PEER_SERVER`: self-hosted PeerJS signaling server. Also add its host to `connect-src` in `index.html` and `vercel.json`.
