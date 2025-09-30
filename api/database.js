/*
═══════════════════════════════
            🔰 WANZ OFFICIAL
═══════════════════════════════
 ⚠️  JANGAN HAPUS CREDIT DEVELOPER
═══════════════════════════════
 📱 WhatsApp : wa.me/6283898286223
 📸 Instagram : instagram.com/wan_xyzbca
═══════════════════════════════
*/



const fetch = require('node-fetch');
const QRCode = require('qrcode');
const crypto = require('crypto');

// ----------------------------- CONFIG -----------------------------
const config = {
  domain: process.env.DOMAIN || 'https://alwaysmunnzty.zakzz.web.id',
  apikey: process.env.PTLA || process.env.PTLA || 'ptla_a7aJYRHBYBIdvLljopKF1cWszlfcVFZ5QV294zLWFoY',
  capikey: process.env.PTLC || process.env.PTLC || 'ptlc_06hiTrwki8ValxA5lKFruxuLryQk7o3Tbadolql5D2h',
  eggid: process.env.EGGID || '15',
  nestid: process.env.NESTID || '5',
  location: process.env.LOC || '1',
  licenseKey: process.env.LICENSE_KEY || 'cashify_dd4b6896be3aca9beca57c8faec3a756330498b189839d687f458aa022d9da61',
  qrisStaticId: process.env.QRIS_STATIC_ID || '4bd17daa-8c09-422d-8c17-47eb684abaf5',
  qrisEndpoint: process.env.QRIS_ENDPOINT || 'https://cashify.my.id/api/generate/qris',
  qrisCheck: process.env.QRIS_CHECK || 'https://cashify.my.id/api/generate/check-status',
  DEFAULT_QRIS_EXPIRE_MINUTES: Number(process.env.QRIS_EXPIRE_MINUTES || 15),
  DEBUG: (process.env.DEBUG === '1' || process.env.DEBUG === 'true') || false,
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000), // 1 minute window
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 10) // max requests per window per IP
};

// ----------------------------- PACKAGES (1GB -> 10GB + unlimited + reseller) -----------------------------
const PACKAGES = {
  "1gb":  { ram: 1024,  disk: 10240,   cpu: 100,  name: "1 GB",  price: 1,  desc: "Paket starter untuk belajar & testing" },
  "2gb":  { ram: 2048,  disk: 20480,   cpu: 200,  name: "2 GB",  price: 2000,  desc: "Cocok untuk bot sederhana & website kecil" },
  "3gb":  { ram: 3072,  disk: 30720,   cpu: 300,  name: "3 GB",  price: 3000,  desc: "Stabil untuk website medium & API" },
  "4gb":  { ram: 4096,  disk: 40960,   cpu: 400,  name: "4 GB",  price: 4000,  desc: "Performa bagus untuk aplikasi yang lebih berat" },
  "5gb":  { ram: 5120,  disk: 51200,   cpu: 500,  name: "5 GB",  price: 5000,  desc: "Powerful untuk server game kecil & aplikasi besar" },
  "6gb":  { ram: 6144,  disk: 61440,   cpu: 600,  name: "6 GB",  price: 5600,  desc: "Tangguh untuk website traffic tinggi" },
  "7gb":  { ram: 7168,  disk: 71680,   cpu: 700,  name: "7 GB",  price: 6700,  desc: "Cocok untuk sistem menengah ke atas" },
  "8gb":  { ram: 8192,  disk: 81920,   cpu: 800,  name: "8 GB",  price: 7800,  desc: "Ideal untuk e-commerce & sistem besar" },
  "9gb":  { ram: 9216,  disk: 92160,   cpu: 900,  name: "9 GB",  price: 8900,  desc: "Performa tinggi untuk project demanding" },
  "10gb": { ram: 10240, disk: 102400,  cpu: 1000, name: "10 GB", price: 9100, desc: "Maximal untuk project enterprise & layanan besar" },
  "unlimited": { ram: 0, disk: 0, cpu: 0, name: "Unlimited", price: 10000, desc: "Paket tanpa batas untuk full performance" },
  "reseller":  { ram: 0, disk: 0, cpu: 0, name: "Reseller",  price: 15000, desc: "Khusus reseller — bisa jualan panel sendiri" }
};

// ----------------------------- IN-MEMORY RATE LIMIT (simple) -----------------------------
const rateStore = new Map(); // key: ip, value: { count, windowStart }

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = rateStore.get(ip);
  if (!rec) {
    rateStore.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (now - rec.windowStart > config.RATE_LIMIT_WINDOW_MS) {
    // reset window
    rateStore.set(ip, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (rec.count >= config.RATE_LIMIT_MAX) {
    return { ok: false, retryAfterMs: rec.windowStart + config.RATE_LIMIT_WINDOW_MS - now };
  }
  rec.count++;
  return { ok: true };
}

// ----------------------------- HELPERS -----------------------------
function timeout(ms) { return new Promise(r => setTimeout(r, ms)); }
function logDebug(...args) { if (config.DEBUG) console.log('[DEBUG]', ...args); }
function maskSecret(s) { if (!s) return '<<empty>>'; if (s.length < 8) return '***'; return s.slice(0,6) + '...' + s.slice(-4); }

async function fetchWithRetries(url, options = {}, { timeoutMs = 15000, retries = 2, retryDelayMs = 500 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const opts = Object.assign({}, options, { signal: controller.signal });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      logDebug(`fetch attempt ${attempt+1}/${retries+1} -> ${url}`);
      const res = await fetch(url, opts);
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      logDebug(`fetch error attempt ${attempt+1}:`, err && err.message);
      if (attempt < retries) await timeout(retryDelayMs * (attempt+1));
    }
  }
  throw lastErr;
}

async function safeParseResponse(res) {
  try {
    const json = await res.json();
    return { ok: true, body: json, status: res.status };
  } catch (err) {
    try {
      const txt = await res.text();
      return { ok: true, body: { __rawText: txt }, status: res.status };
    } catch (e) {
      return { ok: false, error: 'parse_failed' };
    }
  }
}

async function generateQrImageDataUrl(qrString) {
  if (!qrString) return null;
  try {
    const buf = await QRCode.toBuffer(qrString, { type: 'png', width: 420, margin: 1 });
    return 'data:image/png;base64,' + buf.toString('base64');
  } catch (e) {
    logDebug('QR gen failed:', e && e.message);
    return null;
  }
}

function fmtWIB(iso) { try { return new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }); } catch (e) { return iso; } }
function getField(obj, ...names) { if (!obj) return null; for (const n of names) if (obj[n] !== undefined && obj[n] !== null) return obj[n]; return null; }

// ----------------------------- CREATE PANEL (INLINE) -----------------------------
async function CreatePanel(paketKey, username) {
  if (!paketKey) throw new Error('paketKey required');
  if (!username) throw new Error('username required');

  const key = String(paketKey).toLowerCase();
  const pkg = PACKAGES[key];
  if (!pkg) throw new Error('Paket tidak ditemukan: ' + paketKey);

  if (key === 'reseller') {
    // Reseller flow handled manually
    return { reseller: true, message: 'Reseller detected. Manual handling required.' };
  }

  const memory = pkg.ram ? String(pkg.ram) : "0";
  const disk = pkg.disk ? String(pkg.disk) : "0";
  const cpu = pkg.cpu ? String(pkg.cpu) : "0";

  const password = crypto.randomBytes(6).toString('hex');
  const email = `${username}_${Date.now()}@wanzpanel.dev`;

  // 1) create user
  const urlUser = `${config.domain.replace(/\/$/, '')}/api/application/users`;
  const userResp = await fetchWithRetries(urlUser, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.apikey
    },
    body: JSON.stringify({
      email,
      username,
      first_name: username,
      last_name: username,
      password
    })
  }, { timeoutMs: 20000, retries: 2, retryDelayMs: 600 });

  const parsedUser = await safeParseResponse(userResp);
  if (!userResp.ok) {
    const detail = parsedUser.body || parsedUser.error || 'no details';
    throw new Error('Failed create user: ' + JSON.stringify(detail));
  }

  const userData = parsedUser.body;
  const userObj = getField(userData, 'attributes') || getField(userData, 'data') || userData;
  const userId = getField(userObj, 'id') || getField(userObj, 'user', 'user_id') || null;
  if (!userId) throw new Error('User created but id not found');

  // 2) get egg startup
  const eggUrl = `${config.domain.replace(/\/$/, '')}/api/application/nests/${config.nestid}/eggs/${config.eggid}`;
  const eggResp = await fetchWithRetries(eggUrl, {
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apikey }
  }, { timeoutMs: 15000, retries: 1 });

  const parsedEgg = await safeParseResponse(eggResp);
  const eggData = parsedEgg.body || {};
  const startup_cmd = getField(eggData, 'attributes')?.startup || getField(eggData, 'data')?.attributes?.startup || 'npm start';

  // 3) create server
  const serverUrl = `${config.domain.replace(/\/$/, '')}/api/application/servers`;
  const serverBody = {
    name: username,
    user: userId,
    egg: parseInt(config.eggid),
    docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
    startup: startup_cmd,
    environment: { INST: 'npm', USER_UPLOAD: '0', AUTO_UPDATE: '0', CMD_RUN: 'npm start' },
    limits: { memory, swap: 0, disk, io: 500, cpu },
    feature_limits: { databases: 0, backups: 0, allocations: 0 },
    deploy: { locations: [parseInt(config.location)], dedicated_ip: false, port_range: [] }
  };

  const serverResp = await fetchWithRetries(serverUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.apikey
    },
    body: JSON.stringify(serverBody)
  }, { timeoutMs: 25000, retries: 2, retryDelayMs: 800 });

  const parsedServer = await safeParseResponse(serverResp);
  if (!serverResp.ok) {
    const detail = parsedServer.body || parsedServer.error || 'no details';
    throw new Error('Create server failed: ' + JSON.stringify(detail));
  }

  const serverData = parsedServer.body;
  const serverAttrs = getField(serverData, 'attributes') || getField(serverData, 'data')?.attributes || serverData;
  const serverId = getField(serverAttrs, 'id') || getField(serverAttrs, 'identifier') || null;

  return {
    userId,
    serverId,
    username: getField(userObj, 'username') || username,
    password,
    paket: pkg.name || paketKey,
    domain: config.domain
  };
}

// ----------------------------- SERVERLESS HANDLER -----------------------------
module.exports = async (req, res) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }

    // Basic CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // simple rate-limit by IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const rl = checkRateLimit(ip);
    if (!rl.ok) {
      const retryAfterSec = Math.ceil((rl.retryAfterMs || 0) / 1000) || 30;
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ ok: false, error: 'Too many requests', retryAfterSec });
    }

    const action = req.query?.action ? String(req.query.action) : null;

    // ---------- CREATE QRIS ----------
    if (action === 'create-qris' && req.method === 'POST') {
      const body = req.body || {};
      const productKey = body.productKey;
      const username = body.username;

      // validation
      if (!productKey || !username) {
        return res.status(400).json({ ok: false, error: 'productKey and username required' });
      }
      if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
        return res.status(400).json({ ok: false, error: 'username invalid (3-15 a-zA-Z0-9_)' });
      }

      const pkg = PACKAGES[String(productKey).toLowerCase()];
      if (!pkg) return res.status(400).json({ ok: false, error: 'Invalid productKey' });

      if (!config.licenseKey) return res.status(500).json({ ok: false, error: 'Server misconfigured: LICENSE_KEY missing' });

      const amount = pkg.price;

      const payload = {
        id: config.qrisStaticId,
        amount,
        useUniqueCode: true,
        packageIds: ['com.orderkuota.app'],
        expiredInMinutes: config.DEFAULT_QRIS_EXPIRE_MINUTES,
        metadata: { username, productKey }
      };

      logDebug('create-qris payload:', payload);

      let resp;
      try {
        resp = await fetchWithRetries(config.qrisEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-license-key': config.licenseKey },
          body: JSON.stringify(payload)
        }, { timeoutMs: 15000, retries: 2, retryDelayMs: 500 });
      } catch (err) {
        console.error('Cashify generate error:', err && err.message);
        return res.status(502).json({ ok: false, error: 'Cashify generate request failed', details: err && err.message });
      }

      const parsed = await safeParseResponse(resp);
      if (!resp.ok) {
        return res.status(502).json({ ok: false, error: 'Cashify error', status: resp.status, details: parsed.body || parsed.error });
      }

      const data = parsed.body && (parsed.body.data || parsed.body) || {};
      const transactionId = getField(data, 'transactionId', 'trxId', 'transaction_id') || ('local-' + Date.now());
      const qr_string = getField(data, 'qr_string', 'qr', 'qrString') || null;
      const totalAmount = getField(data, 'totalAmount', 'amount') || amount;
      const expiredAt = getField(data, 'expiredAt', 'expired_at') || null;

      let qrImage = null;
      if (getField(data, 'qrImage')) {
        const raw = data.qrImage;
        qrImage = raw && String(raw).startsWith('data:') ? raw : 'data:image/png;base64,' + raw;
      } else if (qr_string) {
        qrImage = await generateQrImageDataUrl(qr_string);
      }

      return res.status(200).json({
        ok: true,
        qris: {
          raw: parsed.body,
          transactionId,
          qr_string,
          qr_image: qrImage,
          totalAmount,
          expiredAt
        }
      });
    }

    // ---------- CHECK STATUS ----------
    if (action === 'check-status' && req.method === 'POST') {
      const body = req.body || {};
      const transactionId = body.transactionId;
      const productKey = body.productKey;
      const username = body.username;

      if (!transactionId) return res.status(400).json({ ok: false, error: 'transactionId required' });

      if (!config.licenseKey) return res.status(500).json({ ok: false, error: 'Server misconfigured: LICENSE_KEY missing' });

      // call Cashify check-status
      let resp;
      try {
        resp = await fetchWithRetries(config.qrisCheck, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-license-key': config.licenseKey },
          body: JSON.stringify({ transactionId })
        }, { timeoutMs: 12000, retries: 2, retryDelayMs: 500 });
      } catch (err) {
        console.error('Cashify check-status error:', err && err.message);
        return res.status(502).json({ ok: false, error: 'Cashify check failed', details: err && err.message });
      }

      const parsed = await safeParseResponse(resp);
      if (!resp.ok) {
        return res.status(502).json({ ok: false, error: 'Cashify check returned non-200', status: resp.status, details: parsed.body || parsed.error });
      }

      const rawData = parsed.body || {};
      const data = rawData.data || rawData;
      const status = getField(data, 'status') || null;

      // If paid -> create panel (unless reseller)
      if (status === 'paid') {
        // productKey + username required to create panel automatically
        if (!productKey || !username) {
          return res.status(200).json({ ok: true, status, message: 'Paid but missing productKey/username for panel creation' });
        }

        if (String(productKey).toLowerCase() === 'reseller') {
          return res.status(200).json({
            ok: true,
            status,
            reseller: true,
            resellerGroupLink: "https://chat.whatsapp.com/CcHCBX5pNlWL1cKwagVkNV",
            message: "Reseller payment detected. Please join the reseller group."
          });
        }

        try {
          const panel = await CreatePanel(productKey, username);
          return res.status(200).json({
            ok: true,
            status: 'paid',
            panel,
            raw: rawData
          });
        } catch (err) {
          console.error('CreatePanel error:', err && (err.stack || err.message));
          return res.status(500).json({ ok: false, error: 'CreatePanel failed', details: err && err.message });
        }
      }

      // Not paid or expired
      return res.status(200).json({
        ok: true,
        status,
        raw: rawData
      });
    }

    // unknown action
    return res.status(404).json({ ok: false, error: 'Invalid action (use action=create-qris or action=check-status)' });

  } catch (err) {
    console.error('database.js ERROR:', err && (err.stack || err.message || err));
    return res.status(500).json({ ok: false, error: err && err.message ? err.message : 'internal server error' });
  }
};