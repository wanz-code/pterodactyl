// database.js
'use strict';

/**
 * Improved Cashify + MAT handler for Vercel
 *
 * - Expects environment variables for secrets (LICENSE_KEY, PTLA, PTLC, etc).
 * - Provides two actions:
 *    - create-qris   (POST)  -> creates QRIS via Cashify and returns QR image/data
 *    - check-status  (POST)  -> checks status; if paid and product info provided -> create panel via MAT
 *
 * Notes:
 * - Enable DEBUG=true in env for verbose logs (will mask secrets).
 * - This file is defensive: timeouts, retries, tolerant parsing.
 */

const fetch = require('node-fetch'); // v2 (package.json)
const QRCode = require('qrcode');

// ----------------------------- config -----------------------------
const config = {
  MAT_BASE: process.env.MAT_BASE || "https://restapi.mat.web.id/api/pterodactyl/create",
  domain: process.env.DOMAIN || "https://alwaysmunnzty.zakzz.web.id",
  ptla: process.env.PTLA || "ptla_a7aJYRHBYBIdvLljopKF1cWszlfcVFZ5QV294zLWFoY",
  ptlc: process.env.PTLC || "ptlc_06hiTrwki8ValxA5lKFruxuLryQk7o3Tbadolql5D2h",
  eggid: process.env.EGGID || "15",
  nestid: process.env.NESTID || "5",
  loc: process.env.LOC || "1",
  licenseKey: process.env.LICENSE_KEY || "cashify_dd4b6896be3aca9beca57c8faec3a756330498b189839d687f458aa022d9da61",
  qrisStaticId: process.env.QRIS_STATIC_ID || "4bd17daa-8c09-422d-8c17-47eb684abaf5",
  qrisEndpoint: process.env.QRIS_ENDPOINT || "https://cashify.my.id/api/generate/qris",
  qrisCheck: process.env.QRIS_CHECK || "https://cashify.my.id/api/generate/check-status",
  DEFAULT_QRIS_EXPIRE_MINUTES: Number(process.env.QRIS_EXPIRE_MINUTES || 15),
  DEBUG: (process.env.DEBUG === '1' || process.env.DEBUG === 'true') || false
};

// small product catalog (edit prices as needed)
const PACKAGES = {
  "1gb": { ram: 1024, disk: 1024, cpu: 100, name: "1 GB", price: 1 },
  "2gb": { ram: 2048, disk: 2048, cpu: 100, name: "2 GB", price: 20000 },
  "3gb": { ram: 3072, disk: 3072, cpu: 100, name: "3 GB", price: 30000 },
  "unlimited": { ram: 0, disk: 0, cpu: 0, name: "Unlimited", price: 150000 },
  "reseller": { ram: 0, disk: 0, cpu: 0, name: "RESELLER", price: 250000 }
};

// --------------------------- helpers ---------------------------
function timeout(ms) { return new Promise(r => setTimeout(r, ms)); }

function maskSecret(s, keep = 4) {
  if (!s) return '<<empty>>';
  if (s.length <= keep) return '***';
  return s.slice(0, keep) + '...' + s.slice(-keep);
}

function logDebug(...args) {
  if (config.DEBUG) console.log('[DEBUG]', ...args);
}

// fetch wrapper with timeout + retries (uses AbortController via node-fetch v2)
async function fetchWithRetries(url, options = {}, { timeoutMs = 15000, retries = 2, retryDelayMs = 500 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const signal = controller.signal;
    const opts = Object.assign({}, options, { signal });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logDebug(`fetch attempt ${attempt} -> ${url}`);
      const res = await fetch(url, opts);
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      logDebug(`fetch failed attempt ${attempt} -> ${err && err.message}`);
      if (attempt < retries) await timeout(retryDelayMs * attempt);
    }
  }
  const e = new Error(`fetchWithRetries failed (${retries} attempts): ${lastErr && lastErr.message}`);
  e.cause = lastErr;
  throw e;
}

// safe JSON parsing with fallback to text
async function safeParseResponse(res) {
  try {
    const json = await res.json();
    return { ok: true, body: json, status: res.status };
  } catch (err) {
    try {
      const txt = await res.text();
      return { ok: true, body: { __rawText: txt }, status: res.status };
    } catch (e2) {
      return { ok: false, error: 'Failed to parse response' };
    }
  }
}

// tolerant getter for possible QR fields Cashify might return
function extractQrisFields(cashifyData = {}) {
  // common possible names
  const fields = {};
  fields.qr_string = cashifyData.qr_string || cashifyData.qr || cashifyData.qrString || cashifyData.qrText || null;
  fields.transactionId = cashifyData.transactionId || cashifyData.trxId || cashifyData.transaction_id || null;
  fields.originalAmount = cashifyData.originalAmount || cashifyData.amount || null;
  fields.totalAmount = cashifyData.totalAmount || cashifyData.totalAmount || fields.originalAmount;
  fields.uniqueNominal = cashifyData.uniqueNominal || cashifyData.unique_code || null;
  fields.expiredAt = cashifyData.expiredAt || cashifyData.expired_at || null;
  fields.qrImage = cashifyData.qrImage || cashifyData.qr_image || null;
  return fields;
}

// create PNG data URL from raw qr_string (EMV QR)
async function generateQrImageDataUrl(qrString) {
  if (!qrString) return null;
  try {
    const buffer = await QRCode.toBuffer(qrString, { type: 'png', width: 420, margin: 1 });
    return 'data:image/png;base64,' + buffer.toString('base64');
  } catch (err) {
    logDebug('QRCode generation error:', err && err.message);
    return null;
  }
}

// Build MAT create URL (GET)
function buildMatCreateUrl({ username, pkg }) {
  const params = new URLSearchParams();
  params.set('username', username);
  params.set('ram', String(pkg.ram || 0));
  params.set('disk', String(pkg.disk || 0));
  params.set('cpu', String(pkg.cpu || 0));
  params.set('eggid', String(config.eggid || '15'));
  params.set('nestid', String(config.nestid || '5'));
  params.set('loc', String(config.loc || '1'));
  params.set('domain', config.domain);
  if (config.ptla) params.set('ptla', config.ptla);
  if (config.ptlc) params.set('ptlc', config.ptlc);
  return `${config.MAT_BASE}?${params.toString()}`;
}

// ------------------------- handler -------------------------
module.exports = async (req, res) => {
  try {
    // CORS preflight & simple CORS
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // mask secrets in debug
    logDebug('CONFIG', {
      MAT_BASE: config.MAT_BASE,
      domain: config.domain,
      ptla: config.ptla ? maskSecret(config.ptla) : '(empty)',
      ptlc: config.ptlc ? maskSecret(config.ptlc) : '(empty)',
      licenseKey: config.licenseKey ? maskSecret(config.licenseKey) : '(empty)',
      qrisStaticId: config.qrisStaticId,
      qrisEndpoint: config.qrisEndpoint,
      qrisCheck: config.qrisCheck,
      DEBUG: config.DEBUG
    });

    const action = (req.query && req.query.action) ? String(req.query.action) : null;

    // ---------- CREATE QRIS ----------
    if (action === 'create-qris' && req.method === 'POST') {
      const body = req.body || {};
      const productKey = body.productKey;
      const username = body.username;
      const nomor = body.nomor;
      const packageIds = body.packageIds || body.package || null; // optional override

      // validation
      if (!productKey || !username || !nomor) {
        return res.status(400).json({ ok: false, error: 'productKey, username, nomor required' });
      }
      if (!/^[a-zA-Z0-9_]{3,15}$/.test(username)) {
        return res.status(400).json({ ok: false, error: 'username invalid (3-15, a-zA-Z0-9_)' });
      }
      if (!/^[0-9]{8,15}$/.test(nomor)) {
        return res.status(400).json({ ok: false, error: 'nomor invalid (digits only, 8-15)' });
      }

      const pkg = PACKAGES[productKey];
      if (!pkg) return res.status(400).json({ ok: false, error: 'Invalid productKey' });

      if (!config.licenseKey) {
        return res.status(500).json({ ok: false, error: 'Server misconfigured: LICENSE_KEY missing' });
      }

      // build payload for Cashify
      const payload = {
        id: config.qrisStaticId,
        amount: pkg.price,
        useUniqueCode: true,
        expiredInMinutes: Number(body.expiredInMinutes || config.DEFAULT_QRIS_EXPIRE_MINUTES),
        metadata: { username, nomor, product: productKey }
      };

      // allow packageIds override (for wallet selection)
      if (packageIds) {
        payload.packageIds = Array.isArray(packageIds) ? packageIds : [packageIds];
      }

      logDebug('create-qris payload', payload);

      // call Cashify
      let resp;
      try {
        resp = await fetchWithRetries(config.qrisEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-license-key': config.licenseKey
          },
          body: JSON.stringify(payload)
        }, { timeoutMs: 15000, retries: 2, retryDelayMs: 500 });
      } catch (err) {
        console.error('Cashify generate error:', err && err.message);
        return res.status(502).json({ ok: false, error: 'Cashify generate request failed', details: err.message });
      }

      const parsed = await safeParseResponse(resp);
      if (!resp.ok) {
        // forward response body if available
        return res.status(502).json({ ok: false, error: 'Cashify error', status: resp.status, details: parsed.body || parsed.error });
      }

      const rawData = parsed.body || {};
      const data = rawData.data || rawData; // some APIs respond with { data: { ... } }

      const fields = extractQrisFields(data);
      logDebug('Cashify generate response (extracted):', fields);

      // generate image if needed
      let qrImageDataUrl = null;
      try {
        if (fields.qrImage) {
          // if Cashify returned base64 image or data URI
          qrImageDataUrl = fields.qrImage.startsWith('data:') ? fields.qrImage : `data:image/png;base64,${fields.qrImage}`;
        } else if (fields.qr_string) {
          qrImageDataUrl = await generateQrImageDataUrl(fields.qr_string);
        }
      } catch (e) {
        logDebug('QR image generation failed:', e && e.message);
        qrImageDataUrl = null;
      }

      return res.status(200).json({
        ok: true,
        productKey,
        package: pkg,
        qris: {
          raw: rawData,
          qr_string: fields.qr_string,
          qr_image: qrImageDataUrl,
          transactionId: fields.transactionId,
          originalAmount: fields.originalAmount,
          totalAmount: fields.totalAmount,
          useUniqueCode: data.useUniqueCode || payload.useUniqueCode,
          expiredAt: fields.expiredAt
        }
      });
    }

    // ---------- CHECK STATUS ----------
    // POST /api/database?action=check-status
    if (action === 'check-status' && req.method === 'POST') {
      const body = req.body || {};
      const transactionId = body.transactionId;
      const productKey = body.productKey;
      const username = body.username;
      const nomor = body.nomor;

      if (!transactionId) {
        return res.status(400).json({ ok: false, error: 'transactionId required' });
      }

      if (!config.licenseKey) {
        return res.status(500).json({ ok: false, error: 'Server misconfigured: LICENSE_KEY missing' });
      }

      // call Cashify check-status
      let resp;
      try {
        resp = await fetchWithRetries(config.qrisCheck, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-license-key': config.licenseKey
          },
          body: JSON.stringify({ transactionId })
        }, { timeoutMs: 12000, retries: 2, retryDelayMs: 500 });
      } catch (err) {
        console.error('Cashify check-status error:', err && err.message);
        return res.status(502).json({ ok: false, error: 'Cashify check failed', details: err.message });
      }

      const parsed = await safeParseResponse(resp);
      if (!resp.ok) {
        return res.status(502).json({ ok: false, error: 'Cashify check returned non-200', status: resp.status, details: parsed.body || parsed.error });
      }

      const rawData = parsed.body || {};
      const data = rawData.data || rawData;
      const status = (data && data.status) || null;
      logDebug('Cashify check-status data:', data);

      // standard response
      const baseResponse = { ok: true, status, raw: rawData };

      // if paid -> attempt to create panel (if product + user info provided)
      if (status === 'paid') {
        // If product info missing, still respond with paid
        if (!productKey || !username || !nomor) {
          return res.status(200).json(Object.assign({}, baseResponse, { message: 'paid but missing productKey/username/nomor for panel creation' }));
        }

        if (productKey === 'reseller') {
          return res.status(200).json(Object.assign({}, baseResponse, {
            reseller: true,
            resellerGroupLink: "https://chat.whatsapp.com/CcHCBX5pNlWL1cKwagVkNV",
            message: "Reseller payment detected. Please join the reseller group."
          }));
        }

        const pkg = PACKAGES[productKey];
        if (!pkg) {
          return res.status(400).json({ ok: false, error: 'Invalid productKey for panel creation' });
        }

        // Build MAT URL and call create
        const matUrl = buildMatCreateUrl({ username, pkg });
        logDebug('Calling MAT create URL:', matUrl);

        try {
          const matResp = await fetchWithRetries(matUrl, { method: 'GET' }, { timeoutMs: 25000, retries: 2, retryDelayMs: 800 });
          const matParsed = await safeParseResponse(matResp);
          // return whatever MAT gives us, but do not leak PTLA/PTLC
          if (!matResp.ok) {
            logDebug('MAT create returned non-200', matResp.status, matParsed.body);
            return res.status(502).json({
              ok: false,
              status,
              error: 'Create-panel API error',
              details: matParsed.body || matParsed.error
            });
          }

          return res.status(200).json({
            ok: true,
            status,
            panel: matParsed.body,
            message: 'Payment confirmed and panel created',
            raw: rawData
          });
        } catch (e) {
          console.error('Failed to call create-panel API:', e && e.message);
          // still return paid status, but include creation error
          return res.status(200).json({
            ok: true,
            status,
            error: 'Payment is paid but creating panel failed',
            details: e && e.message,
            raw: rawData
          });
        }
      }

      // not paid or expired
      return res.status(200).json(baseResponse);
    }

    // unknown action
    return res.status(404).json({ ok: false, error: 'Invalid action (use action=create-qris or action=check-status)' });
  } catch (err) {
    console.error('database.js ERROR:', err && (err.stack || err.message || err));
    return res.status(500).json({ ok: false, error: err && err.message ? err.message : 'internal server error' });
  }
};