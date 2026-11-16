// lib/adminAuth.js - checks that a request comes from YOUR admin login (Firebase), without any extra packages.
import crypto from 'node:crypto';

const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cache = { certs: null, exp: 0 };

async function getCerts() {
    if (cache.certs && Date.now() < cache.exp) return cache.certs;
    const r = await fetch(CERT_URL);
    if (!r.ok) throw new Error('Could not load Google signing certificates');
    const certs = await r.json();
    const cc = (r.headers && r.headers.get && r.headers.get('cache-control')) || '';
    const m = /max-age=(\d+)/.exec(cc);
    cache = { certs, exp: Date.now() + (m ? Number(m[1]) : 3600) * 1000 };
    return certs;
}
const b64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export async function verifyFirebaseToken(token, projectId) {
    try {
        const parts = String(token || '').split('.');
        if (parts.length !== 3) return null;
        const header = JSON.parse(b64u(parts[0]).toString('utf8'));
        const payload = JSON.parse(b64u(parts[1]).toString('utf8'));
        if (header.alg !== 'RS256' || !header.kid) return null;
        const pem = (await getCerts())[header.kid];
        if (!pem) return null;
        const publicKey = new crypto.X509Certificate(pem).publicKey;
        if (!crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), publicKey, b64u(parts[2]))) return null;
        const now = Math.floor(Date.now() / 1000);
        if (payload.aud !== projectId || payload.iss !== 'https://securetoken.google.com/' + projectId) return null;
        if (!payload.sub || typeof payload.sub !== 'string') return null;
        if (!(payload.exp > now) || !(payload.iat <= now + 60)) return null;
        return payload;
    } catch (_) { return null; }
}

// Admin Firebase UID(s). The UID comes from the signed login token, so it cannot be faked.
// Extra UIDs can be added in Vercel as ADMIN_UIDS (comma separated).
const BUILT_IN_ADMIN_UIDS = ['uNlct7BdhwP7ofd0lYiUT8DjiJn2'];
export function adminUids() {
    return [...BUILT_IN_ADMIN_UIDS, ...(process.env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean)];
}

export function adminEmails() {
    return (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

// Returns { token, projectId, email } for a signed-in admin, or sends 401/403 and returns null.
export async function requireAdmin(req, res) {
    const h = String((req.headers && req.headers.authorization) || '');
    const token = h.startsWith('Bearer ') ? h.slice(7) : '';
    const projectId = process.env.FIREBASE_PROJECT_ID || 'discrete-studio';
    const p = await verifyFirebaseToken(token, projectId);
    if (!p) { res.status(401).json({ error: 'Please sign in' }); return null; }
    const email = String(p.email || '').toLowerCase();
    const isAdmin = adminUids().includes(p.sub) || (email && adminEmails().includes(email));
    if (!isAdmin) { res.status(403).json({ error: 'Not an admin account' }); return null; }
    return { token, projectId, email };
}
