// Cryptographic identity and helpers. Pure WebCrypto, no dependencies.
//
// Identity model
//   * Each device holds an ECDSA P-256 key pair.
//   * Your public ID is derived from the hash of your PUBLIC key:
//         anon-<first 60 bits of SHA-256(publicKey), base32>
//   * Peers prove they own an ID by signing a transcript that includes both
//     WebRTC DTLS fingerprints. That stops anyone impersonating an ID, and it
//     stops the signaling server from sitting in the middle of a connection.

const enc = new TextEncoder();
const dec = new TextDecoder();
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' };
const SIG = { name: 'ECDSA', hash: 'SHA-256' };
const ALPHA = 'abcdefghijklmnopqrstuvwxyz234567';
export const ID_CHARS = 12; // 60 bits
export const PBKDF2_ITER = 600000;

/* ---------- encoding ---------- */
export function b64(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return btoa(s);
}
export function unb64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
export const randomB64 = (n = 32) => b64(crypto.getRandomValues(new Uint8Array(n)));

function base32(bytes, chars) {
  let bits = 0, val = 0, out = '';
  for (const b of bytes) {
    val = (val << 8) | b; bits += 8;
    while (bits >= 5) {
      out += ALPHA[(val >>> (bits - 5)) & 31]; bits -= 5;
      if (out.length === chars) return out;
    }
    val &= (1 << bits) - 1;
  }
  return out;
}

/* ---------- identity ---------- */
export function cleanPublicJwk(j) {
  if (!j || typeof j !== 'object' || j.kty !== 'EC' || j.crv !== 'P-256') return null;
  if (typeof j.x !== 'string' || typeof j.y !== 'string' || j.x.length > 64 || j.y.length > 64) return null;
  return { kty: 'EC', crv: 'P-256', x: j.x, y: j.y };
}

export async function idFromPublicJwk(jwk) {
  const clean = cleanPublicJwk(jwk);
  if (!clean) throw new Error('bad key');
  const key = await crypto.subtle.importKey('jwk', clean, ECDSA, true, ['verify']);
  const raw = await crypto.subtle.exportKey('raw', key);          // canonical 65-byte point
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
  return 'anon-' + base32(hash, ID_CHARS);
}

export async function generateIdentity() {
  const pair = await crypto.subtle.generateKey(ECDSA, true, ['sign', 'verify']);
  const pub = cleanPublicJwk(await crypto.subtle.exportKey('jwk', pair.publicKey));
  const priv = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { pub, priv, id: await idFromPublicJwk(pub) };
}

export function importSigner(privJwk) {
  return crypto.subtle.importKey('jwk', privJwk, ECDSA, false, ['sign']);
}

export async function sign(signer, text) {
  return b64(await crypto.subtle.sign(SIG, signer, enc.encode(text)));
}
export async function verify(pubJwk, text, sigB64) {
  try {
    const clean = cleanPublicJwk(pubJwk);
    if (!clean || typeof sigB64 !== 'string' || sigB64.length > 200) return false;
    const key = await crypto.subtle.importKey('jwk', clean, ECDSA, false, ['verify']);
    return await crypto.subtle.verify(SIG, key, unb64(sigB64), enc.encode(text));
  } catch { return false; }
}

// Text that gets signed. Includes both IDs and both DTLS fingerprints (sorted so
// both sides build the identical string), so a signature only works for one
// specific connection between exactly these two parties.
export function authText({ kind, signer, ids, fps, nonces }) {
  return ['anonchat/1', kind, signer, [...ids].sort().join(','), [...fps].sort().join(','), [...nonces].sort().join(',')].join('\n');
}

/* ---------- passcode encryption ---------- */
export async function deriveKey(pass, salt, iter = PBKDF2_ITER) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { iv: b64(iv), data: b64(data) };
}
export async function decryptJSON(key, box) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data));
  return JSON.parse(dec.decode(plain));
}
// Encrypt an object under a passcode. Returns the AES key too so callers can reuse it.
export async function wrap(pass, obj, salt, iter = PBKDF2_ITER) {
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pass, salt, iter);
  return { key, wrapped: { salt: b64(salt), iter, ...(await encryptJSON(key, obj)) } };
}
export async function unwrap(pass, w) {
  const key = await deriveKey(pass, unb64(w.salt), w.iter);
  return { key, data: await decryptJSON(key, w) }; // throws on wrong passcode
}
