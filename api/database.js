

const fetch = require("node-fetch")
const QRCode = require("qrcode")

// config inline (pull values from env)
const MAT_BASE = process.env.MAT_BASE || "https://restapi.mat.web.id/api/pterodactyl/create"
const config = {
  domain: process.env.DOMAIN || "https://alwaysmunnzty.zakzz.web.id",
  ptla: process.env.PTLA || "ptla_a7aJYRHBYBIdvLljopKF1cWszlfcVFZ5QV294zLWFoY",
  ptlc: process.env.PTLC || "ptlc_06hiTrwki8ValxA5lKFruxuLryQk7o3Tbadolql5D2h",
  eggid: process.env.EGGID || "15",
  nestid: process.env.NESTID || "5",
  loc: process.env.LOC || "1",
  lisencekey: process.env.LICENSE_KEY || "cashify_dd4b6896be3aca9beca57c8faec3a756330498b189839d687f458aa022d9da61",
  qrisstatis: process.env.QRIS_STATIC_ID || "4bd17daa-8c09-422d-8c17-47eb684abaf5",
  qrisEndpoint: "https://cashify.my.id/api/generate/qris",
  qrisCheck: "https://cashify.my.id/api/generate/check-status"
}

// simple product catalog (prices in IDR)
const PACKAGES = {
  "1gb": { ram: 1024, disk: 1024, cpu: 100, name: "1 GB", price: 1 },
  "2gb": { ram: 2048, disk: 2048, cpu: 100, name: "2 GB", price: 20000 },
  "3gb": { ram: 3072, disk: 3072, cpu: 100, name: "3 GB", price: 30000 },
  "unlimited": { ram: 0, disk: 0, cpu: 0, name: "Unlimited", price: 150000 },
  "reseller": { ram: 0, disk: 0, cpu: 0, name: "RESELLER", price: 250000 }
}

// timeout helper
function timeout(ms) { return new Promise(r => setTimeout(r, ms)) }

module.exports = async (req, res) => {
  try {
    const action = (req.query && req.query.action) ? String(req.query.action) : null

    // Ensure JSON methods allowed
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type")
      return res.status(200).end()
    }

    // Basic CORS for static frontend & testing
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    // ====== CREATE QRIS ======
    // POST /api/database?action=create-qris
    if (action === "create-qris" && req.method === "POST") {
      const body = req.body || {}
      const { productKey, username, nomor } = body

      if (!productKey || !username || !nomor) {
        return res.status(400).json({ ok: false, error: "productKey, username, nomor required" })
      }
      const pkg = PACKAGES[productKey]
      if (!pkg) return res.status(400).json({ ok: false, error: "Invalid productKey" })
      if (!config.lisencekey) return res.status(500).json({ ok: false, error: "Missing LICENSE_KEY in env" })

      const payload = {
        id: config.qrisstatis,
        amount: pkg.price,
        useUniqueCode: true,
        packageId: process.env.PACKAGE_ID || "com.orderkuota.app",
        expiredInMinutes: 15,
        metadata: { username, nomor, product: productKey }
      }

      // call Cashify
      const r = await fetch(config.qrisEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-license-key": config.lisencekey
        },
        body: JSON.stringify(payload),
        timeout: 15000
      })

      // parse response carefully
      let json
      try {
        json = await r.json()
      } catch (err) {
        return res.status(502).json({ ok: false, error: "Invalid response from Cashify", details: err.message })
      }

      if (!r.ok) {
        return res.status(502).json({ ok: false, error: "Cashify error", details: json || "no details" })
      }

      // Cashify may return qr_string (raw) — generate image data URL server-side for frontend convenience
      const qrString = json?.data?.qr_string || json?.data?.qr || null
      let qrImageDataUrl = null
      try {
        if (qrString) {
          // generate png data url
          const buffer = await QRCode.toBuffer(qrString, { type: "png", width: 400, margin: 1 })
          qrImageDataUrl = "data:image/png;base64," + buffer.toString("base64")
        } else if (json?.data?.qrImage) {
          // if Cashify already provides base64 image
          qrImageDataUrl = json.data.qrImage.startsWith("data:") ? json.data.qrImage : "data:image/png;base64," + json.data.qrImage
        }
      } catch (e) {
        // QR generation failure is not fatal; continue but return raw qr_string to client
        qrImageDataUrl = null
      }

      // Return everything needed to client (transactionId, amount, expiredAt, qr string + optional image)
      return res.status(200).json({
        ok: true,
        productKey,
        package: pkg,
        qris: {
          raw: json,
          qr_string: qrString,
          qr_image: qrImageDataUrl,
          transactionId: json?.data?.transactionId || json?.data?.trxId || null,
          totalAmount: json?.data?.totalAmount || json?.data?.amount || pkg.price,
          expiredAt: json?.data?.expiredAt || null
        }
      })
    }

    // ====== CHECK STATUS (and create panel when paid) ======
    // POST /api/database?action=check-status
    // body: { transactionId, productKey, username, nomor }
    if (action === "check-status" && req.method === "POST") {
      const body = req.body || {}
      const { transactionId, productKey, username, nomor } = body

      if (!transactionId) return res.status(400).json({ ok: false, error: "transactionId required" })

      // call Cashify check-status
      const r = await fetch(config.qrisCheck, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-license-key": config.lisencekey
        },
        body: JSON.stringify({ transactionId }),
        timeout: 12000
      })

      let json
      try {
        json = await r.json()
      } catch (err) {
        return res.status(502).json({ ok: false, error: "Invalid response from Cashify", details: err.message })
      }

      if (!r.ok) {
        return res.status(502).json({ ok: false, error: "Cashify check failed", details: json || "no details" })
      }

      const status = json?.data?.status || null

      // If paid => auto create panel (unless product is 'reseller')
      if (status === "paid") {
        // if missing product/user info, return status only
        if (!productKey || !username || !nomor) {
          return res.status(200).json({ ok: true, status, message: "Paid but missing product/user info for panel creation" })
        }

        if (productKey === "reseller") {
          return res.status(200).json({
            ok: true,
            status,
            reseller: true,
            resellerGroupLink: "https://chat.whatsapp.com/CcHCBX5pNlWL1cKwagVkNV",
            message: "Reseller payment detected. Please join the reseller group."
          })
        }

        // validate package
        const pkg = PACKAGES[productKey]
        if (!pkg) {
          return res.status(400).json({ ok: false, error: "Invalid productKey for panel creation" })
        }

        // Build MAT URL and call create
        const url = `${MAT_BASE}?username=${encodeURIComponent(username)}&ram=${pkg.ram}&disk=${pkg.disk}&cpu=${pkg.cpu}&eggid=${config.eggid}&nestid=${config.nestid}&loc=${config.loc}&domain=${encodeURIComponent(config.domain)}&ptla=${config.ptla}&ptlc=${config.ptlc}`

        // call MAT endpoint
        let matRes, matJson
        try {
          matRes = await fetch(url, { method: "GET", timeout: 25000 })
          matJson = await matRes.json()
        } catch (e) {
          return res.status(502).json({ ok: false, error: "Failed to call create-panel API", details: e.message })
        }

        if (!matRes.ok) {
          return res.status(502).json({ ok: false, error: "Create-panel API error", details: matJson || "no details" })
        }

        // Return panel data
        return res.status(200).json({
          ok: true,
          status,
          panel: matJson,
          message: "Payment confirmed and panel created"
        })
      }

      // Not paid yet or expired
      return res.status(200).json({
        ok: true,
        status,
        raw: json
      })
    }

    // Unknown action
    return res.status(404).json({ ok: false, error: "Invalid action (use action=create-qris or action=check-status)" })
  } catch (err) {
    console.error("database.js ERROR:", err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
