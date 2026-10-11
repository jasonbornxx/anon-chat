import * as C from './crypto.js';
import * as kv from './store.js';

/* ============================ CONFIG ============================ */
// null = use PeerJS defaults (Google STUN + PeerJS's shared free TURN relay).
// For rock-solid calls on every network, put your own TURN server here, e.g.
// [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:turn.example.com:3478', username: 'u', credential: 'p' }]
const ICE_SERVERS = null;
// null = free public PeerJS signaling server. To self-host:
// { host: 'peer.example.com', port: 443, path: '/', secure: true }  (also add it to connect-src in the CSP)
const PEER_SERVER = null;

const MAX_FILE_MB = 25;
const MAX_TEXT = 5000;
const HISTORY_LIMIT = 300;
const AUTO_LOCK_MS = 30000;
const ID_RE = /^anon-[a-z2-7]{12}$/;

/* ============================ HELPERS ============================ */
const $ = s => document.querySelector(s);
const ICONS = {
  mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
  micoff:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="2" y1="2" x2="22" y2="22"/>',
  video:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  videooff:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/><line x1="2" y1="2" x2="22" y2="22"/>',
  phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  clip:'<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  back:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  file:'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  more:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  flip:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
};
const setIcon = (el, name) => { el.innerHTML = ICONS[name]; };
document.querySelectorAll('svg.i[data-icon]').forEach(el => setIcon(el, el.dataset.icon));
$('#hangBtn svg').style.transform = 'rotate(135deg)';

const wait = ms => new Promise(r => setTimeout(r, ms));
function toast(msg, ms = 3500) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms);
}
const fmtTs = ts => {
  const d = new Date(ts), t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + t;
};
const hue = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const pretty = id => id.replace(/^anon-(.{4})(.{4})(.{4})$/, 'anon-$1-$2-$3');
const nameOf = c => c.nick || pretty(c.id);
function paintAvatar(el, c) {
  el.style.background = `hsl(${hue(c.id)} 50% 42%)`;
  el.textContent = (c.nick ? c.nick.slice(0, 2) : c.id.slice(5, 7)).toUpperCase();
}
function parseId(raw) {
  const s = String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const body = s.length === 12 ? s : (s.length === 16 && s.startsWith('anon') ? s.slice(4) : null);
  return body && /^[a-z2-7]{12}$/.test(body) ? 'anon-' + body : null;
}
const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const SAFE_IMG = /^image\/(png|jpe?g|gif|webp|avif|bmp)$/i;
const SAFE_VID = /^video\/(mp4|webm|ogg|quicktime)$/i;
const SAFE_AUD = /^audio\/(mpeg|mp3|ogg|wav|webm|aac|mp4|x-m4a|flac)$/i;
const cleanName = n => String(n || 'file').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 120) || 'file';

function dialog({ title, body, actions }) {
  const el = document.createElement('div');
  el.className = 'dialog'; el.setAttribute('role', 'alertdialog');
  const b = document.createElement('b'); b.textContent = title;
  const p = document.createElement('p'); p.textContent = body;
  const row = document.createElement('div'); row.className = 'row';
  const close = () => el.remove();
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.textContent = a.label; if (a.kind) btn.className = a.kind;
    btn.onclick = () => { close(); a.fn && a.fn(); };
    row.appendChild(btn);
  });
  el.append(b, p, row);
  $('#dialogs').appendChild(el);
  return { close };
}

// Modal replacement for prompt()/confirm() (those are unreliable in installed apps).
function ask({ title, body = '', input = null, ok = 'OK', cancel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const m = $('#ask'), inp = $('#askInput'), okb = $('#askOk'), cb = $('#askCancel');
    $('#askTitle').textContent = title; $('#askBody').textContent = body;
    inp.hidden = !input; inp.value = '';
    if (input) { inp.type = input.type || 'text'; inp.placeholder = input.placeholder || ''; }
    okb.textContent = ok; okb.className = danger ? 'danger' : 'primary';
    cb.textContent = cancel;
    m.hidden = false;
    if (input) setTimeout(() => inp.focus(), 60);
    const done = v => { m.hidden = true; okb.onclick = cb.onclick = inp.onkeydown = null; resolve(v); };
    okb.onclick = () => done(input ? inp.value : true);
    cb.onclick = () => done(input ? null : false);
    inp.onkeydown = e => { if (e.key === 'Enter') okb.click(); };
  });
}

/* ============================ STATE ============================ */
const contacts = new Map(); // id -> contact
let ident = null;           // { id, pub, signer }
let privJwk = null;         // kept in memory only for re-wrapping / backup
let settings = { saveHistory: true, notify: false, locked: false };
let sessionKey = null;      // AES key derived from passcode (when app lock is on)
let peer = null, active = null, swReg = null, idRetries = 0;
const handshaking = new Set();

function getContact(id) {
  if (!contacts.has(id)) contacts.set(id, { id, nick: '', trusted: false, blocked: false, status: 'offline', conn: null, sess: null, messages: [], unread: 0, pub: null, callSig: null, silent: false });
  return contacts.get(id);
}
const STATUS_TEXT = { connecting:'Connecting…', waiting:'Waiting for them to accept', connected:'Online', offline:'Offline', declined:'Declined your request' };

/* ============================ PERSISTENCE ============================ */
let saveTimer = null;
const scheduleSave = () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 500); };
async function saveState() {
  const data = {
    v: 1,
    contacts: [...contacts.values()].filter(c => c.trusted || c.blocked || c.nick).map(c => ({
      id: c.id, nick: c.nick, trusted: !!c.trusted, blocked: !!c.blocked,
      messages: settings.saveHistory
        ? c.messages.filter(m => m.kind === 'text' && m.from !== 'sys').slice(-HISTORY_LIMIT).map(m => ({ from: m.from, text: m.text, ts: m.ts }))
        : []
    }))
  };
  try {
    await kv.set('state', settings.locked && sessionKey ? { enc: await C.encryptJSON(sessionKey, data) } : { plain: data });
  } catch (e) { console.warn('save failed', e); }
}
async function loadState() {
  const rec = await kv.get('state');
  let data = null;
  try { data = rec && (rec.enc ? await C.decryptJSON(sessionKey, rec.enc) : rec.plain); } catch { data = null; }
  if (!data || !Array.isArray(data.contacts)) return;
  for (const s of data.contacts) {
    if (!ID_RE.test(s.id)) continue;
    const c = getContact(s.id);
    c.nick = String(s.nick || '').slice(0, 40); c.trusted = !!s.trusted; c.blocked = !!s.blocked;
    c.messages = (s.messages || []).filter(m => typeof m.text === 'string').map(m => ({ from: m.from === 'me' ? 'me' : 'them', kind: 'text', text: m.text, ts: m.ts || Date.now() }));
  }
}

/* ============================ LOCK SCREEN ============================ */
let lockHandler = null;
function showLock(handler) {
  lockHandler = handler;
  $('#lock').hidden = false; $('#lockInput').value = ''; $('#lockMsg').textContent = '';
  setTimeout(() => $('#lockInput').focus(), 80);
}
let lockFails = 0;
$('#lockForm').addEventListener('submit', async e => {
  e.preventDefault();
  const pass = $('#lockInput').value; if (!pass || !lockHandler) return;
  $('#lockGo').disabled = true; $('#lockMsg').textContent = 'Checking…';
  const ok = await lockHandler(pass);
  if (ok) { lockFails = 0; $('#lock').hidden = true; lockHandler = null; $('#lockMsg').textContent = ''; }
  else {
    lockFails++; $('#lockMsg').textContent = 'Wrong passcode.'; $('#lockInput').value = '';
    await wait(Math.min(lockFails, 6) * 1000); // slow down guessing
  }
  $('#lockGo').disabled = false; $('#lockInput').focus();
});
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (settings.locked && ident && !call && hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS && $('#lock').hidden) {
    showLock(async pass => {
      try { const rec = await kv.get('identity'); await C.unwrap(pass, rec.priv.wrapped); return true; } catch { return false; }
    });
  }
  if (call) acquireWakeLock();
  if (peer && peer.open) retryOffline();
});

/* ============================ NETWORK ============================ */
function setNet(state, text) { $('#netDot').className = 'dot ' + state; $('#netText').textContent = text; }

function startPeer() {
  const opts = { debug: 0 };
  if (ICE_SERVERS) opts.config = { iceServers: ICE_SERVERS };
  if (PEER_SERVER) Object.assign(opts, PEER_SERVER);
  peer = new Peer(ident.id, opts);

  peer.on('open', () => {
    idRetries = 0; setNet('ok', 'Online and reachable');
    const hashId = parseId(location.hash.replace('#', ''));
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    if (hashId && hashId !== ident.id) connectTo(hashId);
    retryOffline();
  });
  peer.on('disconnected', () => { setNet('warn', 'Reconnecting…'); try { peer.reconnect(); } catch {} });
  peer.on('close', () => { if (!peer || peer.destroyed) setNet('bad', 'Offline'); });
  peer.on('error', err => {
    if (err.type === 'unavailable-id') {
      // Our ID is still registered from a previous tab/session, or open on another device.
      idRetries++;
      setNet('warn', idRetries > 3 ? 'This ID is open somewhere else. Retrying…' : 'Reclaiming your ID…');
      try { peer.destroy(); } catch {}
      setTimeout(startPeer, Math.min(1500 * idRetries, 10000));
      return;
    }
    if (err.type === 'peer-unavailable') {
      const id = (String(err.message).match(/anon-[a-z2-7]{12}/) || [])[0];
      const c = id && contacts.get(id);
      if (c && c.sess && !c.sess.authed) killSess(c.sess, 'offline');
      return;
    }
    if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) { setNet('bad', 'Can’t reach the network. Retrying…'); return; }
    console.warn(err);
  });

  peer.on('connection', conn => {
    const id = conn.peer, c = contacts.get(id);
    if (!ID_RE.test(id) || id === ident.id || (c && c.blocked) || handshaking.size >= 8) { try { conn.close(); } catch {} return; }
    setupConn(conn, false, null);
  });

  peer.on('call', incoming => {
    const c = contacts.get(incoming.peer);
    if (!c || c.status !== 'connected' || call) { incoming.close(); return; }
    const video = !!(incoming.metadata && incoming.metadata.video);
    document.title = '📞 Incoming call';
    notify('Incoming call', 'call');
    const d = dialog({
      title: video ? 'Incoming video call' : 'Incoming voice call', body: nameOf(c),
      actions: [
        { label: 'Answer', kind: 'primary', fn: async () => {
            document.title = 'Anon Chat';
            const s = await getMedia(video);
            if (!s) { incoming.close(); return; }
            incoming.answer(s);
            setupCall(incoming, s, video, c, false);
        } },
        { label: 'Decline', fn: () => { document.title = 'Anon Chat'; incoming.close(); } }
      ]
    });
    incoming.on('close', () => { document.title = 'Anon Chat'; d.close(); });
  });
}

// Invite link opened while the app is already running (e.g. tapped in an installed app)
window.addEventListener('hashchange', () => {
  const id = parseId(location.hash.replace('#', ''));
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  if (id && ident && id !== ident.id) connectTo(id);
});

window.addEventListener('online', () => {
  if (!peer) return;
  if (peer.destroyed) startPeer(); else if (peer.disconnected) { try { peer.reconnect(); } catch {} }
});

function connectTo(raw, { silent = false } = {}) {
  const id = parseId(raw);
  if (!id) return toast('That doesn’t look like an ID. It looks like anon-abcd-efgh-ijkl.');
  if (id === ident.id) return toast('That’s your own ID.');
  if (!peer || !peer.open) return silent ? 0 : toast('Still connecting to the network. Try again in a moment.');
  const existing = contacts.get(id);
  if (existing && existing.blocked) return silent ? 0 : toast('You blocked this ID. Unblock it in Settings first.');
  const c = getContact(id);
  if (c.sess && !c.sess.closed && (c.status === 'connected' || c.status === 'connecting' || c.status === 'waiting')) { if (!silent) openChat(id); return; }
  c.silent = silent; c.status = 'connecting';
  const conn = peer.connect(id, { reliable: true });
  c.sess = setupConn(conn, true, c); c.conn = conn;
  if (!silent) openChat(id);
  refresh();
}

function retryOffline() {
  if (!peer || !peer.open || document.hidden) return;
  for (const c of contacts.values()) {
    if (c.trusted && !c.blocked && c.status === 'offline' && !c.sess) connectTo(c.id, { silent: true });
  }
}
setInterval(retryOffline, 25000);

/* ---- per-connection handshake: both sides prove they own their ID ---- */
function setupConn(conn, outgoing, contact) {
  const sess = {
    conn, id: conn.peer, outgoing, contact, myNonce: C.randomB64(), theirNonce: null, theirPub: null,
    authed: false, closed: false, dropped: false, reason: '', dialog: null, n: 0, q: Promise.resolve()
  };
  handshaking.add(sess);
  conn.on('open', () => { try { conn.send({ t: 'hello', pub: ident.pub, nonce: sess.myNonce }); } catch {} });
  conn.on('data', d => { sess.q = sess.q.then(() => handle(sess, d)).catch(() => killSess(sess, 'error')); });
  conn.on('close', () => onClose(sess));
  conn.on('error', () => {});
  sess.rate = setInterval(() => { sess.n = 0; }, 5000);
  sess.timer = setTimeout(() => { if (!sess.authed) killSess(sess, sess.outgoing ? 'timeout' : 'drop'); }, 20000);
  return sess;
}

function killSess(sess, reason) {
  if (!sess.reason) sess.reason = reason || '';
  try { sess.conn.close(); } catch {}
  onClose(sess); // PeerJS doesn't emit 'close' for a connection that never opened
}

function onClose(sess) {
  if (sess.closed) return;
  sess.closed = true;
  clearInterval(sess.rate); clearTimeout(sess.timer);
  handshaking.delete(sess);
  if (sess.dialog) sess.dialog.close();
  if (sess.dropped) return;
  const c = sess.contact;
  if (!c || c.sess !== sess) return;
  const was = c.status;
  c.conn = null; c.sess = null;
  if (call && callContact === c) endCall();
  if (!sess.authed && sess.outgoing) {
    // never reached them
    if (!c.silent && c.status !== 'declined') toast(sess.reason === 'offline' ? 'No one is online with that ID right now.' : 'Couldn’t reach them. Check the ID and that they have the app open.');
    c.status = 'offline';
    if (!c.trusted && !c.messages.length) { contacts.delete(c.id); if (active === c.id) closeChatView(); }
  } else {
    if (c.status !== 'declined') c.status = 'offline';
    if (was === 'connected') sys(c, 'Disconnected');
    if (!c.trusted && !c.messages.length && c.status !== 'declined') { contacts.delete(c.id); if (active === c.id) closeChatView(); }
  }
  refresh();
}

function fpOf(sdp) {
  const m = /a=fingerprint:(\S+)\s+(\S+)/i.exec(sdp || '');
  return m ? (m[1] + ' ' + m[2]).toLowerCase() : null;
}
function pcFingerprints(pc) {
  if (!pc) return null;
  const l = fpOf((pc.currentLocalDescription || pc.localDescription || {}).sdp);
  const r = fpOf((pc.currentRemoteDescription || pc.remoteDescription || {}).sdp);
  return l && r ? [l, r] : null;
}

async function handle(sess, d) {
  if (sess.closed || !d || typeof d !== 'object') return;
  if (++sess.n > 150) return killSess(sess, 'flood');
  const conn = sess.conn;

  if (d.t === 'hello') {
    if (sess.theirNonce) return;
    if (typeof d.nonce !== 'string' || d.nonce.length > 64) return killSess(sess, 'drop');
    const pub = C.cleanPublicJwk(d.pub);
    if (!pub) return killSess(sess, 'drop');
    let derived; try { derived = await C.idFromPublicJwk(pub); } catch { return killSess(sess, 'drop'); }
    if (derived !== sess.id) return killSess(sess, 'drop'); // key doesn't match the claimed ID
    const fps = pcFingerprints(conn.peerConnection);
    if (!fps) return killSess(sess, 'drop');
    sess.theirPub = pub; sess.theirNonce = d.nonce;
    const text = C.authText({ kind: 'data', signer: ident.id, ids: [ident.id, sess.id], fps, nonces: [sess.myNonce, sess.theirNonce] });
    conn.send({ t: 'auth', sig: await C.sign(ident.signer, text) });
    return;
  }

  if (d.t === 'auth') {
    if (sess.authed || !sess.theirPub) return;
    const fps = pcFingerprints(conn.peerConnection);
    if (!fps) return killSess(sess, 'drop');
    const text = C.authText({ kind: 'data', signer: sess.id, ids: [ident.id, sess.id], fps, nonces: [sess.myNonce, sess.theirNonce] });
    if (!(await C.verify(sess.theirPub, text, d.sig))) return killSess(sess, 'drop');
    sess.authed = true; handshaking.delete(sess); clearTimeout(sess.timer);
    adopt(sess);
    return;
  }

  if (!sess.authed || sess.dropped) return; // nothing else is accepted before authentication
  const c = sess.contact;
  if (!c || c.sess !== sess) return;
  const live = c.status === 'connected';

  switch (d.t) {
    case 'req': {
      if (sess.outgoing) return;
      if (c.trusted) { markConnected(c, false); conn.send({ t: 'accept' }); break; }
      c.status = 'waiting'; refresh();
      notify('New chat request', 'req');
      sess.dialog = dialog({
        title: 'Chat request', body: `${pretty(c.id)} wants to chat with you. They have proven they own this ID.`,
        actions: [
          { label: 'Accept', kind: 'primary', fn: () => { if (c.sess !== sess) return; c.trusted = true; markConnected(c, true); conn.send({ t: 'accept' }); openChat(c.id); } },
          { label: 'Decline', fn: () => { try { conn.send({ t: 'decline' }); } catch {} setTimeout(() => killSess(sess, 'declined'), 400); contacts.delete(c.id); refresh(); } },
          { label: 'Block', fn: () => { c.blocked = true; c.trusted = false; try { conn.send({ t: 'decline' }); } catch {} setTimeout(() => killSess(sess, 'blocked'), 400); scheduleSave(); refresh(); } }
        ]
      });
      break;
    }
    case 'accept':
      if (!sess.outgoing) return;
      markConnected(c, !c.trusted); c.trusted = true; scheduleSave();
      break;
    case 'decline':
      if (!sess.outgoing) return;
      c.status = 'declined'; c.trusted = false; c.silent = false;
      sys(c, 'They declined your request.');
      setTimeout(() => killSess(sess, 'declined'), 300);
      refresh();
      break;
    case 'msg':
      if (!live || typeof d.text !== 'string' || !d.text || d.text.length > MAX_TEXT) return;
      addMsg(c, { from: 'them', kind: 'text', text: d.text });
      if (document.hidden || active !== c.id) notify('New message', 'msg-' + c.id);
      break;
    case 'file': {
      if (!live || !d.data || typeof d.data.byteLength !== 'number' || d.data.byteLength > MAX_FILE_MB * 1048576) return;
      const type = typeof d.type === 'string' ? d.type.slice(0, 100) : 'application/octet-stream';
      const blob = new Blob([d.data], { type });
      addMsg(c, { from: 'them', kind: 'file', name: cleanName(d.name), type, size: blob.size, url: URL.createObjectURL(blob) });
      if (document.hidden || active !== c.id) notify('New file', 'msg-' + c.id);
      break;
    }
    case 'callauth':
      if (typeof d.sig === 'string' && d.sig.length < 200) { c.callSig = d.sig; checkCallAuth(); }
      break;
  }
}

// Called once the peer has proven who they are.
function adopt(sess) {
  const c = getContact(sess.id);
  if (c.blocked) {
    try { sess.conn.send({ t: 'decline' }); } catch {}
    sess.dropped = true; setTimeout(() => { try { sess.conn.close(); } catch {} }, 400);
    return;
  }
  const old = c.sess;
  if (old && old !== sess && !old.closed) {
    const initOld = old.outgoing ? ident.id : old.id, initNew = sess.outgoing ? ident.id : sess.id;
    if (c.status !== 'connected' && initOld !== initNew && initOld < initNew) {
      // both sides dialed at once: keep the one started by the smaller ID, on both ends
      sess.dropped = true; try { sess.conn.close(); } catch {} return;
    }
    old.dropped = true; if (old.dialog) old.dialog.close(); try { old.conn.close(); } catch {}
    if (call && callContact === c) endCall();
  }
  sess.contact = c; c.sess = sess; c.conn = sess.conn; c.pub = sess.theirPub; c.silent = c.silent && sess.outgoing;
  c.status = sess.outgoing ? (c.trusted ? 'connecting' : 'waiting') : 'waiting';
  if (sess.outgoing) sess.conn.send({ t: 'req' });
  refresh();
}

function markConnected(c, announce) {
  c.status = 'connected'; c.silent = false;
  if (announce) sys(c, 'Connected. Say hello!');
  scheduleSave(); refresh();
}

/* ============================ MESSAGES ============================ */
function sys(c, text) { addMsg(c, { from: 'sys', kind: 'text', text }); }
function addMsg(c, m) {
  m.ts = m.ts || Date.now();
  c.messages.push(m);
  if (active === c.id) { $('#msgs').appendChild(msgEl(m)); scrollDown(); }
  else if (m.from === 'them') c.unread++;
  if (m.kind === 'text' && m.from !== 'sys') scheduleSave();
  refresh();
}
const scrollDown = () => { const el = $('#msgs'); el.scrollTop = el.scrollHeight; };

function msgEl(m) {
  const el = document.createElement('div');
  if (m.from === 'sys') { el.className = 'sys'; el.textContent = m.text; return el; }
  el.className = 'msg' + (m.from === 'me' ? ' me' : '');
  if (m.kind === 'text') {
    const p = document.createElement('p'); p.textContent = m.text; el.appendChild(p);
  } else {
    const save = () => { const a = document.createElement('a'); a.className = 'save-link'; a.href = m.url; a.download = m.name; a.textContent = 'Save'; return a; };
    if (SAFE_IMG.test(m.type)) {
      const i = document.createElement('img'); i.src = m.url; i.alt = m.name; i.onclick = () => window.open(m.url, '_blank', 'noopener'); el.append(i, save());
    } else if (SAFE_VID.test(m.type)) {
      const v = document.createElement('video'); v.src = m.url; v.controls = true; v.playsInline = true; el.append(v, save());
    } else if (SAFE_AUD.test(m.type)) {
      const a = document.createElement('audio'); a.src = m.url; a.controls = true; el.appendChild(a);
    } else {
      const a = document.createElement('a'); a.className = 'file'; a.href = m.url; a.download = m.name;
      const ic = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ic.setAttribute('class', 'i'); ic.setAttribute('viewBox', '0 0 24 24'); ic.innerHTML = ICONS.file;
      const t = document.createElement('div'); t.textContent = m.name;
      const s = document.createElement('small'); s.textContent = fmtSize(m.size) + ' · tap to save'; t.appendChild(s);
      a.append(ic, t); el.appendChild(a);
    }
  }
  const t = document.createElement('time'); t.textContent = fmtTs(m.ts); el.appendChild(t);
  return el;
}

const canSend = c => c && c.status === 'connected' && c.conn && c.conn.open;
function sendText() {
  const c = contacts.get(active), ta = $('#text'), text = ta.value.trim();
  if (!c || !text) return;
  if (!canSend(c)) return toast('Not connected to this person right now.');
  c.conn.send({ t: 'msg', text: text.slice(0, MAX_TEXT) });
  addMsg(c, { from: 'me', kind: 'text', text: text.slice(0, MAX_TEXT) });
  ta.value = ''; ta.style.height = 'auto'; ta.focus();
}
async function sendFiles(files) {
  const c = contacts.get(active);
  if (!canSend(c)) return toast('Not connected to this person right now.');
  for (const f of files) {
    if (f.size > MAX_FILE_MB * 1048576) { toast(`${f.name} is over ${MAX_FILE_MB} MB.`); continue; }
    try {
      const data = await f.arrayBuffer();
      const type = f.type || 'application/octet-stream';
      c.conn.send({ t: 'file', name: f.name, type, data });
      addMsg(c, { from: 'me', kind: 'file', name: cleanName(f.name), type, size: f.size, url: URL.createObjectURL(f) });
    } catch { toast(`Couldn’t send ${f.name}.`); }
  }
}

/* ============================ UI ============================ */
function refresh() {
  const list = $('#contacts'); list.innerHTML = '';
  const shown = [...contacts.values()].filter(c => !c.blocked)
    .sort((a, b) => ((b.messages.at(-1) || {}).ts || 0) - ((a.messages.at(-1) || {}).ts || 0));
  if (!shown.length) {
    const li = document.createElement('li'); li.className = 'list-empty';
    li.textContent = 'No chats yet. Paste a friend’s ID above, or share yours.'; list.appendChild(li);
  }
  for (const c of shown) {
    const li = document.createElement('li'); if (active === c.id) li.className = 'active';
    const b = document.createElement('button'); b.onclick = () => openChat(c.id);
    const av = document.createElement('div'); av.className = 'avatar'; paintAvatar(av, c);
    const dot = document.createElement('span'); dot.className = 'dot ' + (c.status === 'connected' ? 'ok' : (c.status === 'connecting' || c.status === 'waiting') ? 'warn' : ''); av.appendChild(dot);
    const body = document.createElement('div'); body.className = 'c-body';
    const n = document.createElement('div'); n.className = 'c-name'; n.textContent = nameOf(c);
    const last = [...c.messages].reverse().find(m => m.from !== 'sys');
    const s = document.createElement('div'); s.className = 'c-sub';
    s.textContent = last ? (last.kind === 'text' ? last.text : '📎 ' + last.name) : STATUS_TEXT[c.status];
    body.append(n, s); b.append(av, body);
    if (c.unread) { const bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = c.unread; b.appendChild(bd); }
    li.appendChild(b); list.appendChild(li);
  }
  if (active && contacts.has(active)) updateHead(contacts.get(active));
}
function updateHead(c) {
  paintAvatar($('#headAvatar'), c);
  $('#headName').textContent = nameOf(c);
  $('#headStatus').textContent = STATUS_TEXT[c.status];
  const ok = canSend(c) && !call;
  $('#voiceBtn').disabled = !ok; $('#videoBtn').disabled = !ok;
}

const isPhone = () => matchMedia('(max-width:760px)').matches;
function openChat(id) {
  const c = getContact(id);
  active = id; c.unread = 0;
  $('#empty').hidden = true; $('#chat').hidden = false;
  $('#app').classList.add('chat-open');
  if (history.state && history.state.chat) history.replaceState({ chat: id }, '');
  else history.pushState({ chat: id }, '');
  const box = $('#msgs'); box.innerHTML = '';
  c.messages.forEach(m => box.appendChild(msgEl(m)));
  scrollDown(); refresh();
  if (c.status === 'offline' && !c.sess) connectTo(id, { silent: true });
}
function closeChatView() {
  active = null; $('#chat').hidden = true; $('#empty').hidden = false;
  $('#app').classList.remove('chat-open'); refresh();
}
window.addEventListener('popstate', () => { if (!(history.state && history.state.chat)) closeChatView(); });
$('#backBtn').onclick = () => { if (history.state && history.state.chat) history.back(); else closeChatView(); };

$('#connectBtn').onclick = () => { const v = $('#peerInput').value; if (!v.trim()) return; connectTo(v); $('#peerInput').value = ''; };
$('#peerInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#connectBtn').click(); });
$('#copyId').onclick = async () => { try { await navigator.clipboard.writeText(ident.id); toast('ID copied.'); } catch { toast(pretty(ident.id), 8000); } };
$('#copyLink').onclick = async () => {
  const link = location.origin + location.pathname + '#' + ident.id;
  try { await navigator.clipboard.writeText(link); toast('Invite link copied. Keep the app open while they join.'); } catch { toast(link, 8000); }
};
$('#sendBtn').onclick = sendText;
$('#text').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !matchMedia('(pointer:coarse)').matches) { e.preventDefault(); sendText(); }
});
$('#text').addEventListener('input', e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; });
$('#attachBtn').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = e => { sendFiles([...e.target.files]); e.target.value = ''; };

// drag & drop files + paste images
const main = $('#mainPane');
let dropEl = null;
main.addEventListener('dragover', e => {
  if (!active) return; e.preventDefault();
  if (!dropEl) { dropEl = document.createElement('div'); dropEl.className = 'drop'; dropEl.textContent = 'Drop to send'; main.appendChild(dropEl); }
});
['dragleave', 'drop'].forEach(ev => main.addEventListener(ev, e => {
  if (ev === 'dragleave' && main.contains(e.relatedTarget)) return;
  if (dropEl) { dropEl.remove(); dropEl = null; }
  if (ev === 'drop' && active) { e.preventDefault(); sendFiles([...e.dataTransfer.files]); }
}));
document.addEventListener('paste', e => {
  if (!active || e.target.id !== 'text') return;
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) { e.preventDefault(); sendFiles(files); }
});

/* ---- chat options sheet ---- */
function openSheet(id) { $(id).hidden = false; }
function closeSheet(id) { $(id).hidden = true; }
['#settingsBack', '#menuBack'].forEach(id => $(id).addEventListener('click', e => { if (e.target.id === id.slice(1)) closeSheet(id); }));
$('#moreBtn').onclick = () => { const c = contacts.get(active); if (!c) return; $('#menuTitle').textContent = nameOf(c); openSheet('#menuBack'); };
$('#cmClose').onclick = () => closeSheet('#menuBack');
$('#cmRename').onclick = async () => {
  closeSheet('#menuBack'); const c = contacts.get(active); if (!c) return;
  const v = await ask({ title: 'Name this contact', body: 'Only you can see this name.', input: { type: 'text', placeholder: 'Nickname' }, ok: 'Save' });
  if (v === null) return;
  c.nick = v.trim().slice(0, 40); scheduleSave(); refresh();
};
$('#cmClear').onclick = async () => {
  closeSheet('#menuBack'); const c = contacts.get(active); if (!c) return;
  if (!(await ask({ title: 'Clear chat history?', body: 'This only clears it on your device.', ok: 'Clear', danger: true }))) return;
  c.messages = []; openChat(c.id); scheduleSave();
};
$('#cmRemove').onclick = async () => {
  closeSheet('#menuBack'); const c = contacts.get(active); if (!c) return;
  if (!(await ask({ title: 'Remove contact?', body: 'Chat history is deleted. They will need to ask again to chat with you.', ok: 'Remove', danger: true }))) return;
  dropContact(c, false);
};
$('#cmBlock').onclick = async () => {
  closeSheet('#menuBack'); const c = contacts.get(active); if (!c) return;
  if (!(await ask({ title: 'Block this ID?', body: 'They can’t connect to you again unless you unblock them in Settings.', ok: 'Block', danger: true }))) return;
  dropContact(c, true);
};
function dropContact(c, block) {
  if (call && callContact === c) endCall();
  const sess = c.sess;
  if (sess) { try { sess.conn.send({ t: 'decline' }); } catch {} setTimeout(() => killSess(sess, 'removed'), 300); }
  if (block) { c.blocked = true; c.trusted = false; c.messages = []; c.nick = ''; } else contacts.delete(c.id);
  scheduleSave();
  if (history.state && history.state.chat) history.back(); else closeChatView();
}

/* ============================ CALLS ============================ */
let call = null, callContact = null, localStream = null, callTimer = null, callStart = 0, callVideo = false;
let callVerified = false, verifyTimer = null, camOff = false, facing = 'user', wakeLock = null;

async function getMedia(video) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Calls need a secure (https) page and a supported browser.'); return null; }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: video ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false
    });
  } catch {
    toast('Allow microphone' + (video ? ' and camera' : '') + ' access in your browser to start the call.', 5000);
    return null;
  }
}
async function acquireWakeLock() { try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch {} }

async function startCall(video) {
  const c = contacts.get(active);
  if (!canSend(c) || call) return;
  const s = await getMedia(video); if (!s) return;
  const out = peer.call(c.id, s, { metadata: { video } });
  setupCall(out, s, video, c, true);
  setTimeout(() => { if (call === out && !callStart) { toast('No answer.'); endCall(); } }, 45000);
}

function setupCall(c_, stream, video, contact, outgoing) {
  call = c_; callContact = contact; localStream = stream; callVideo = video; callStart = 0;
  callVerified = false; camOff = false; facing = 'user'; contact.callSig = contact.callSig || null;
  const remote = $('#remote'), local = $('#local');
  $('#call').hidden = false;
  paintAvatar($('#callAvatar'), contact);
  $('#callName').textContent = nameOf(contact);
  $('#callStatus').textContent = outgoing ? 'Calling…' : 'Connecting…';
  $('#callSecure').hidden = true; $('#callInfo').classList.remove('has-video');
  remote.classList.toggle('voice', !video); remote.classList.add('pending'); remote.srcObject = null; remote.muted = true;
  local.hidden = !video; local.srcObject = video ? stream : null; local.classList.remove('rear');
  $('#camBtn').hidden = !video; $('#flipBtn').hidden = !(video && matchMedia('(pointer:coarse)').matches);
  setIcon($('#muteBtn svg'), 'mic'); setIcon($('#camBtn svg'), 'video');
  $('#muteBtn').classList.remove('off'); $('#camBtn').classList.remove('off');
  acquireWakeLock(); updateHead(contact);

  c_.on('stream', rs => {
    remote.srcObject = rs; remote.play().catch(() => {});
    if (callStart) return;
    callStart = Date.now();
    $('#callStatus').textContent = 'Verifying…';
    sendCallAuth();
    clearTimeout(verifyTimer);
    verifyTimer = setTimeout(() => { if (call === c_ && !callVerified) { toast('Couldn’t verify this call, so it was ended.', 5000); endCall(); } }, 10000);
  });
  c_.on('close', () => { if (call === c_) endCall(); });
  c_.on('error', () => { if (call === c_) { toast('The call failed. Strict networks may need a TURN server.'); endCall(); } });
}

// Bind the call's media encryption to both IDs. Media stays muted/hidden until this passes.
async function sendCallAuth() {
  try {
    const fps = pcFingerprints(call.peerConnection);
    if (!fps) throw new Error('no fingerprints');
    const text = C.authText({ kind: 'call', signer: ident.id, ids: [ident.id, callContact.id], fps, nonces: [] });
    callContact.conn.send({ t: 'callauth', sig: await C.sign(ident.signer, text) });
    checkCallAuth();
  } catch { toast('Couldn’t verify this call, so it was ended.', 5000); endCall(); }
}
async function checkCallAuth() {
  if (!call || callVerified || !callStart || !callContact.callSig || !callContact.pub) return;
  const c_ = call;
  const fps = pcFingerprints(c_.peerConnection);
  const text = fps && C.authText({ kind: 'call', signer: callContact.id, ids: [ident.id, callContact.id], fps, nonces: [] });
  const ok = fps && await C.verify(callContact.pub, text, callContact.callSig);
  if (call !== c_) return;
  if (!ok) { toast('Call verification failed, so it was ended.', 5000); endCall(); return; }
  callVerified = true; clearTimeout(verifyTimer);
  const remote = $('#remote'); remote.classList.remove('pending'); remote.muted = false; remote.play().catch(() => {});
  if (callVideo && remote.srcObject && remote.srcObject.getVideoTracks().length) $('#callInfo').classList.add('has-video');
  $('#callSecure').hidden = false; $('#callSecure').classList.remove('bad'); $('#callSecureText').textContent = 'Verified end to end';
  clearInterval(callTimer);
  const t0 = Date.now();
  callTimer = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); $('#callStatus').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 500);
  $('#callStatus').textContent = '00:00';
}

function endCall() {
  if (!call) return;
  const c_ = call, contact = callContact, dur = callVerified && callStart ? Math.floor((Date.now() - callStart) / 1000) : 0;
  call = null; callContact = null; callStart = 0; callVerified = false;
  clearInterval(callTimer); clearTimeout(verifyTimer);
  if (contact) contact.callSig = null;
  try { c_.close(); } catch {}
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  localStream = null;
  if (wakeLock) { try { wakeLock.release(); } catch {} wakeLock = null; }
  $('#remote').srcObject = null; $('#local').srcObject = null; $('#call').hidden = true;
  if (contact) {
    sys(contact, dur ? `${callVideo ? 'Video' : 'Voice'} call ended · ${Math.floor(dur / 60)}m ${dur % 60}s` : 'Call ended');
    updateHead(contact);
  }
}
$('#voiceBtn').onclick = () => startCall(false);
$('#videoBtn').onclick = () => startCall(true);
$('#hangBtn').onclick = endCall;
$('#muteBtn').onclick = () => {
  const t = localStream && localStream.getAudioTracks()[0]; if (!t) return;
  t.enabled = !t.enabled;
  setIcon($('#muteBtn svg'), t.enabled ? 'mic' : 'micoff');
  $('#muteBtn').classList.toggle('off', !t.enabled);
  $('#muteBtn').setAttribute('aria-label', t.enabled ? 'Mute microphone' : 'Unmute microphone');
};
$('#camBtn').onclick = () => {
  const t = localStream && localStream.getVideoTracks()[0]; if (!t) return;
  t.enabled = !t.enabled; camOff = !t.enabled;
  setIcon($('#camBtn svg'), t.enabled ? 'video' : 'videooff');
  $('#camBtn').classList.toggle('off', !t.enabled);
  $('#camBtn').setAttribute('aria-label', t.enabled ? 'Turn camera off' : 'Turn camera on');
};
$('#flipBtn').onclick = async () => {
  if (!callVideo || !localStream || !call) return;
  const next = facing === 'user' ? 'environment' : 'user';
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: next } }, audio: false });
    const nt = s.getVideoTracks()[0];
    const sender = call.peerConnection.getSenders().find(x => x.track && x.track.kind === 'video');
    if (sender) await sender.replaceTrack(nt);
    const old = localStream.getVideoTracks()[0];
    if (old) { localStream.removeTrack(old); old.stop(); }
    nt.enabled = !camOff; localStream.addTrack(nt);
    facing = next; $('#local').classList.toggle('rear', next === 'environment');
  } catch { toast('Couldn’t switch cameras.'); }
};

/* ============================ NOTIFICATIONS ============================ */
function notify(body, tag) {
  if (!settings.notify || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body: '', tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }; // no message content in notifications
  if (swReg && swReg.showNotification) swReg.showNotification(body, opts).catch(() => {});
  else { try { new Notification(body, opts); } catch {} }
}

/* ============================ SETTINGS ============================ */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; renderSettings(); });
window.addEventListener('appinstalled', () => { deferredInstall = null; renderSettings(); toast('Installed.'); });

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
async function renderSettings() {
  $('#setId').textContent = pretty(ident.id);
  $('#optHistory').checked = settings.saveHistory;
  $('#optNotify').checked = settings.notify && 'Notification' in window && Notification.permission === 'granted';
  $('#lockState').textContent = settings.locked ? 'On. Passcode required to open the app.' : 'Off';
  $('#lockBtn').textContent = settings.locked ? 'Change passcode' : 'Set passcode';
  $('#lockRemove').hidden = !settings.locked;
  const blocked = [...contacts.values()].filter(c => c.blocked);
  $('#blockedInfo').textContent = blocked.length ? `${blocked.length} blocked ID${blocked.length > 1 ? 's' : ''}` : 'No blocked IDs';
  $('#unblockBtn').hidden = !blocked.length;
  let storage = kv.persistent ? 'Saved on this device.' : 'Your browser is blocking storage, so this ID will be lost when you close the app.';
  try { if (kv.persistent && navigator.storage && navigator.storage.persisted) storage += (await navigator.storage.persisted()) ? ' Protected from automatic cleanup.' : ' Install the app to protect it from automatic cleanup.'; } catch {}
  $('#storageNote').textContent = storage; $('#storageNote').className = 'muted-note';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isStandalone()) { $('#installNote').textContent = 'Installed. You are using the app.'; $('#installBtn').hidden = true; }
  else if (deferredInstall) { $('#installNote').textContent = 'Add this app to your home screen for a full-screen app that opens instantly.'; $('#installBtn').hidden = false; }
  else if (ios) { $('#installNote').textContent = 'On iPhone or iPad: tap the Share button, then "Add to Home Screen".'; $('#installBtn').hidden = true; }
  else { $('#installNote').textContent = 'Use your browser menu and choose "Install app" or "Add to Home screen".'; $('#installBtn').hidden = true; }
}
$('#settingsBtn').onclick = async () => { await renderSettings(); openSheet('#settingsBack'); };
$('#closeSettings').onclick = () => closeSheet('#settingsBack');
$('#installBtn').onclick = async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice.catch(() => {}); deferredInstall = null; renderSettings(); };

async function saveSettings() { await kv.set('settings', settings); }
$('#optHistory').onchange = async e => {
  settings.saveHistory = e.target.checked; await saveSettings(); await saveState();
  toast(settings.saveHistory ? 'Chat history will be saved on this device.' : 'Saved chat history deleted from this device.');
};
$('#optNotify').onchange = async e => {
  if (!e.target.checked) { settings.notify = false; return saveSettings(); }
  if (!('Notification' in window)) { e.target.checked = false; return toast('This browser doesn’t support notifications.'); }
  const p = await Notification.requestPermission();
  settings.notify = p === 'granted'; e.target.checked = settings.notify;
  if (!settings.notify) toast('Notifications are blocked in your browser settings.');
  await saveSettings();
};

async function verifyCurrentPasscode() {
  const pass = await ask({ title: 'Enter your passcode', input: { type: 'password' }, ok: 'Continue' });
  if (pass === null) return false;
  try { const rec = await kv.get('identity'); await C.unwrap(pass, rec.priv.wrapped); return true; } catch { toast('Wrong passcode.'); return false; }
}
$('#lockBtn').onclick = async () => {
  if (settings.locked && !(await verifyCurrentPasscode())) return;
  const p1 = await ask({ title: settings.locked ? 'New passcode' : 'Set a passcode', body: 'Use at least 8 characters. A short phrase works well. There is no way to recover it, so back up your ID first.', input: { type: 'password' }, ok: 'Next' });
  if (p1 === null) return;
  if (p1.length < 8) return toast('Passcode must be at least 8 characters.');
  const p2 = await ask({ title: 'Confirm passcode', input: { type: 'password' }, ok: 'Save' });
  if (p2 === null) return;
  if (p1 !== p2) return toast('Those didn’t match. Nothing was changed.');
  toast('Securing…');
  const { key, wrapped } = await C.wrap(p1, privJwk);
  await kv.set('identity', { pub: ident.pub, priv: { wrapped } });
  sessionKey = key; settings.locked = true; await saveSettings(); await saveState();
  renderSettings(); toast('App lock is on.');
};
$('#lockRemove').onclick = async () => {
  if (!(await verifyCurrentPasscode())) return;
  await kv.set('identity', { pub: ident.pub, priv: { plain: privJwk } });
  sessionKey = null; settings.locked = false; await saveSettings(); await saveState();
  renderSettings(); toast('App lock is off.');
};

function exportableContacts() { return [...contacts.values()].filter(c => c.trusted || c.blocked || c.nick).map(c => ({ id: c.id, nick: c.nick, trusted: c.trusted, blocked: c.blocked })); }
$('#backupBtn').onclick = async () => {
  const pass = await ask({ title: 'Choose a backup passphrase', body: 'You will need it to restore. At least 8 characters. It is not stored anywhere.', input: { type: 'password' }, ok: 'Next' });
  if (pass === null) return;
  if (pass.length < 8) return toast('Passphrase must be at least 8 characters.');
  const again = await ask({ title: 'Confirm passphrase', input: { type: 'password' }, ok: 'Export' });
  if (again === null) return;
  if (again !== pass) return toast('Those didn’t match.');
  toast('Encrypting backup…');
  const { wrapped } = await C.wrap(pass, { v: 1, pub: ident.pub, priv: privJwk, contacts: exportableContacts() });
  const file = new Blob([JSON.stringify({ app: 'anonchat', v: 1, ...wrapped })], { type: 'application/json' });
  const name = 'anonchat-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  try {
    const f = new File([file], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [f] }) && isPhone()) { await navigator.share({ files: [f], title: 'Anon Chat backup' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Backup saved. Keep it somewhere safe.');
};
$('#restoreBtn').onclick = () => $('#restoreFile').click();
$('#restoreFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  let box; try { box = JSON.parse(await f.text()); if (box.app !== 'anonchat') throw 0; } catch { return toast('That isn’t an Anon Chat backup file.'); }
  const pass = await ask({ title: 'Backup passphrase', input: { type: 'password' }, ok: 'Restore' });
  if (pass === null) return;
  let data; try { data = (await C.unwrap(pass, box)).data; } catch { return toast('Wrong passphrase, or the file is damaged.'); }
  try {
    const pub = C.cleanPublicJwk(data.pub); if (!pub) throw 0;
    const signer = await C.importSigner(data.priv);
    const probe = await C.sign(signer, 'probe'); if (!(await C.verify(pub, 'probe', probe))) throw 0;
    var newId = await C.idFromPublicJwk(pub);
  } catch { return toast('The backup is damaged.'); }
  if (!(await ask({ title: 'Replace this ID?', body: `This device will become ${pretty(newId)}. Its current ID (${pretty(ident.id)}) will be erased unless you backed it up.`, ok: 'Restore', danger: true }))) return;
  await kv.clearAll();
  await kv.set('identity', { pub, priv: { plain: data.priv } });
  await kv.set('settings', { saveHistory: true, notify: false, locked: false });
  await kv.set('state', { plain: { v: 1, contacts: (data.contacts || []).filter(c => ID_RE.test(c.id)).map(c => ({ id: c.id, nick: String(c.nick || '').slice(0, 40), trusted: !!c.trusted, blocked: !!c.blocked, messages: [] })) } });
  location.replace(location.pathname);
};

$('#unblockBtn').onclick = () => { contacts.forEach(c => { if (c.blocked) { c.blocked = false; if (!c.trusted && !c.nick && !c.messages.length) contacts.delete(c.id); } }); scheduleSave(); refresh(); renderSettings(); toast('Unblocked.'); };
$('#eraseBtn').onclick = async () => {
  if (!(await ask({ title: 'Erase everything?', body: 'Your ID, key, contacts and chats are deleted from this device. This cannot be undone. People will no longer be able to reach this ID.', ok: 'Erase', danger: true }))) return;
  try { peer && peer.destroy(); } catch {}
  await kv.clearAll();
  try { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); } catch {}
  try { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); } catch {}
  location.replace(location.pathname);
};

/* ============================ VIEWPORT (keyboard, safe areas) ============================ */
function fitViewport() {
  const vv = window.visualViewport, root = document.documentElement.style;
  if (!vv) return;
  root.setProperty('--app-h', vv.height + 'px');
  root.setProperty('--app-top', vv.offsetTop + 'px');
  document.body.classList.toggle('kbd', window.innerHeight - vv.height > 140);
  if (document.body.classList.contains('kbd') && active) scrollDown();
}
if (window.visualViewport) {
  visualViewport.addEventListener('resize', fitViewport);
  visualViewport.addEventListener('scroll', fitViewport);
  fitViewport();
}
window.addEventListener('orientationchange', () => setTimeout(fitViewport, 300));

/* ============================ BOOT ============================ */
async function boot() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').then(r => { swReg = r; }).catch(() => {});
  }
  if (!window.crypto || !crypto.subtle) { setNet('bad', 'This browser can’t run secure chat. Open the https address.'); return; }
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch {}

  settings = { ...settings, ...((await kv.get('settings')) || {}) };
  let rec = await kv.get('identity'), firstRun = false;
  if (!rec) {
    const g = await C.generateIdentity();
    rec = { pub: g.pub, priv: { plain: g.priv } };
    await kv.set('identity', rec); firstRun = true;
  }
  if (rec.priv.wrapped) {
    settings.locked = true;
    privJwk = await new Promise(resolve => showLock(async pass => {
      try { const r = await C.unwrap(pass, rec.priv.wrapped); sessionKey = r.key; resolve(r.data); return true; } catch { return false; }
    }));
  } else { settings.locked = false; privJwk = rec.priv.plain; }

  ident = { pub: rec.pub, id: await C.idFromPublicJwk(rec.pub), signer: await C.importSigner(privJwk) };
  $('#myId').textContent = pretty(ident.id);
  await loadState();
  refresh();
  if (firstRun) toast('Your permanent ID is ready. Back it up in Settings.', 6000);
  startPeer();
}
boot().catch(e => { console.error(e); setNet('bad', 'Something went wrong starting the app.'); });
