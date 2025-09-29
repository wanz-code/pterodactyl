// api/create-qris.js
const { config, PACKAGES } = require("./config")
const fetch = require("node-fetch")

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    // parse body (Vercel butuh manual parse)
    const chunks = []
    for await (const chunk of req) {
      chunks.push(chunk)
    }
    const bodyStr = Buffer.concat(chunks).toString()
    const body = JSON.parse(bodyStr || "{}")

    const { productKey, username, nomor } = body
    if (!productKey || !username || !nomor) {
      return res.status(400).json({ ok: false, error: "Missing productKey, username, or nomor" })
    }

    const pkg = PACKAGES[productKey]
    if (!pkg) {
      return res.status(400).json({ ok: false, error: "Invalid package" })
    }

    if (!config.lisencekey) {
      return res.status(500).json({ ok: false, error: "Missing Cashify license key" })
    }

    const payload = {
      id: config.qrisstatis,
      amount: pkg.price,
      useUniqueCode: true,
      expiredInMinutes: 15,
      metadata: { username, nomor, product: productKey }
    }

    const r = await fetch(config.qrisEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-license-key": config.lisencekey
      },
      body: JSON.stringify(payload)
    })

    const json = await r.json()

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        error: `Cashify error: ${json.error || JSON.stringify(json)}`
      })
    }

    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
      }
