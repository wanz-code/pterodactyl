// api/create-qris.js
const { config, PACKAGES } = require("./config")
const fetch = require("node-fetch")

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    const { productKey, username, nomor } = req.body
    const pkg = PACKAGES[productKey]
    if (!pkg) {
      return res.status(400).json({ ok: false, error: "Invalid package" })
    }

    const body = {
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
      body: JSON.stringify(body)
    })

    const json = await r.json()
    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}