/*
═══════════════════════════════
            🔰 WANZ OFFICIAL
═══════════════════════════════
 ⚠️  JANGAN HAPUS CREDIT DEVELOPER
═══════════════════════════════
 📱 WhatsApp : wa.me/6283898206223
 📸 Instagram : instagram.com/wan_xyzbca
═══════════════════════════════
*/

const fetch = require("node-fetch");
const crypto = require("crypto");

/* ====== KONFIGURASI GLOBAL ====== */
const config = {
  domain: process.env.DOMAIN || "https://alwaysmunnzty.zakzz.web.id",
  apikey: process.env.PTLA || "ptla_a7aJYRHBYBIdvLljopKF1cWszlfcVFZ5QV294zLWFoY",
  capikey: process.env.PTLC || "ptlc_06hiTrwki8ValxA5lKFruxuLryQk7o3Tbadolql5D2h",
  eggid: process.env.EGGID || "15",
  nestid: process.env.NESTID || "5",
  loc: process.env.LOC || "1",
  licenseKey: process.env.LICENSE_KEY || "cashify_dd4b6896be3aca9beca57c8faec3a756330498b189839d687f458aa022d9da61",
  qrisStaticId: process.env.QRIS_STATIC_ID || "4bd17daa-8c09-422d-8c17-47eb684abaf5",
  qrisEndpoint: process.env.QRIS_ENDPOINT || "https://cashify.my.id/api/generate/qris",
  qrisCheck: process.env.QRIS_CHECK || "https://cashify.my.id/api/generate/check-status",
  DEFAULT_QRIS_EXPIRE_MINUTES: Number(process.env.QRIS_EXPIRE_MINUTES || 15),
  DEBUG: (process.env.DEBUG === "1" || process.env.DEBUG === "true") || true,
};

/* ====== DAFTAR PAKET ====== */
const PACKAGES = {
  "1gb": { ram: 1024, disk: 1024, cpu: 50, name: "1 GB", price: 1 },
  "2gb": { ram: 2048, disk: 2048, cpu: 70, name: "2 GB", price: 2000 },
  "3gb": { ram: 3072, disk: 3072, cpu: 90, name: "3 GB", price: 3000 },
  "4gb": { ram: 4096, disk: 4096, cpu: 100, name: "4 GB", price: 4000 },
  "5gb": { ram: 5120, disk: 5120, cpu: 110, name: "5 GB", price: 5000 },
  "6gb": { ram: 6144, disk: 6144, cpu: 120, name: "6 GB", price: 5600 },
  "7gb": { ram: 7168, disk: 7168, cpu: 130, name: "7 GB", price: 6700 },
  "8gb": { ram: 8192, disk: 8192, cpu: 140, name: "8 GB", price: 7800 },
  "9gb": { ram: 9216, disk: 9216, cpu: 150, name: "9 GB", price: 8900 },
  "10gb": { ram: 10240, disk: 10240, cpu: 160, name: "10 GB", price: 9800 },
  "unlimited": { ram: 0, disk: 0, cpu: 0, name: "Unlimited", price: 10000 },
  "reseller": { ram: 0, disk: 0, cpu: 0, name: "Reseller", price: 15000 },
};

/* ====== FUNGSI BANTUAN ====== */
function logDebug(label, data) {
  if (config.DEBUG) {
    console.log("[DEBUG]", label, data);
  }
}

async function safeParseResponse(resp) {
  try {
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, body: text ? JSON.parse(text) : {} };
  } catch (e) {
    return { ok: resp.ok, status: resp.status, error: e.message };
  }
}

/* ====== FUNGSI CREATE PANEL ====== */
async function CreatePanel(paketKey, username) {
  const paket = PACKAGES[paketKey];
  if (!paket) throw new Error("Paket tidak ditemukan.");

  const email = `${username}_wanzdev@gmail.com`;
  const password = crypto.randomBytes(6).toString("hex");

  // === BUAT USER ===
  const resUser = await fetch(`${config.domain}/api/application/users`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": "Bearer " + config.apikey
    },
    body: JSON.stringify({
      email, username,
      first_name: username,
      last_name: username,
      language: "en",
      password
    })
  });

  const userData = await resUser.json();
  if (userData.errors) throw new Error(JSON.stringify(userData.errors));
  const user = userData.attributes;

  // === AMBIL STARTUP DARI EGG ===
  const eggRes = await fetch(`${config.domain}/api/application/nests/${config.nestid}/eggs/${config.eggid}`, {
    headers: {
      "Accept": "application/json",
      "Authorization": "Bearer " + config.apikey
    }
  });
  const eggData = await eggRes.json();
  const startup = eggData.attributes.startup;

  // === BUAT SERVER ===
  const resServer = await fetch(`${config.domain}/api/application/servers`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": "Bearer " + config.apikey
    },
    body: JSON.stringify({
      name: username,
      user: user.id,
      egg: parseInt(config.eggid),
      docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
      startup,
      environment: { "INST": "npm", "USER_UPLOAD": "0", "AUTO_UPDATE": "0", "CMD_RUN": "npm start" },
      limits: { memory: paket.ram, swap: 0, disk: paket.disk, io: 500, cpu: paket.cpu },
      feature_limits: { databases: 0, backups: 0, allocations: 0 },
      deploy: { locations: [parseInt(config.loc)], dedicated_ip: false, port_range: [] }
    })
  });

  const serverData = await resServer.json();
  if (serverData.errors) throw new Error(JSON.stringify(serverData.errors));
  const server = serverData.attributes;

  return {
    userId: user.id,
    serverId: server.id,
    username: user.username,
    password,
    package: paket.name,
    domain: config.domain
  };
}

/* ====== HANDLER API VERSEL ====== */
module.exports = async (req, res) => {
  const { action } = req.query;

  // === CEK STATUS SERVER ===
  if (action === "status") {
    if (config.domain && config.apikey && config.capikey) {
      return res.json({ ok: true, status: "online" });
    } else {
      return res.json({ ok: false, status: "offline" });
    }
  }

  // === KIRIM KONFIGURASI ===
  if (action === "config") {
    return res.json({
      ok: true,
      domain: config.domain,
      apikey: config.apikey ? "SET" : "",
      capikey: config.capikey ? "SET" : ""
    });
  }

  // === BUAT QRIS BARU ===
  if (action === "create-qris" && req.method === "POST") {
    try {
      const { productKey, username } = req.body;
      const pkg = PACKAGES[productKey];
      if (!pkg) return res.status(400).json({ ok: false, error: "Invalid package" });

      const payload = {
        id: config.qrisStaticId || "default",
        amount: pkg.price,
        useUniqueCode: true,
        expiredInMinutes: config.DEFAULT_QRIS_EXPIRE_MINUTES,
        packageIds: ["com.orderkuota.app"],
        metadata: { username, productKey }
      };

      logDebug("create-qris payload", payload);

      const resp = await fetch(config.qrisEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-license-key": config.licenseKey
        },
        body: JSON.stringify(payload)
      });

      const parsed = await safeParseResponse(resp);
      if (!parsed.ok) {
        return res.status(502).json({ ok: false, error: "Cashify error", details: parsed });
      }

      return res.json({ ok: true, qris: parsed.body.data });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // === CEK STATUS QRIS ===
  if (action === "check-status" && req.method === "POST") {
    try {
      const { trxId, productKey, username } = req.body;
      const resp = await fetch(config.qrisCheck, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-license-key": config.licenseKey
        },
        body: JSON.stringify({ trxId })
      });

      const parsed = await safeParseResponse(resp);
      if (!parsed.ok) {
        return res.status(502).json({ ok: false, error: "Cashify check error", details: parsed });
      }

      // Jika pembayaran sukses → langsung buat panel
      if (parsed.body.status === "PAID") {
        const panel = await CreatePanel(productKey, username);
        return res.json({ ok: true, paid: true, panel });
      }

      return res.json({ ok: true, paid: false, data: parsed.body });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // === DEFAULT ===
  return res.status(404).json({ ok: false, error: "Unknown action" });
};
