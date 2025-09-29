// api/create-qris.js
import { config, PACKAGES } from "./config.js"
import fetch from "node-fetch"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    const { productKey, username, nomor } = req.body

    // validasi package
    const pkg = PACKAGES[productKey]
    if (!pkg) {
      return res.status(400).json({ ok: false, error: "Invalid package" })
    }

    // body untuk request ke Cashify
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

    if (!json?.status) {
      return res.status(500).json({ ok: false, error: json?.error || "Failed to generate QRIS" })
    }

    return res.status(200).json({
      ok: true,
      qris: json.data,
      product: pkg
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}