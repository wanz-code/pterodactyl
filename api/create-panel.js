// api/create-panel.js
import { config, PACKAGES, BASE_URL_PTERODACTYL_API } from "./config.js"
import fetch from "node-fetch"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    const { productKey, username, nomor } = req.body

    if (!productKey || !username || !nomor) {
      return res.status(400).json({ ok: false, error: "productKey, username, nomor are required" })
    }

    const pkg = PACKAGES[productKey]
    if (!pkg) {
      return res.status(400).json({ ok: false, error: "Invalid package" })
    }

    // Buat URL request ke Pterodactyl API (MAT)
    const url = `${BASE_URL_PTERODACTYL_API}?username=${encodeURIComponent(
      username
    )}&ram=${pkg.ram}&disk=${pkg.disk}&cpu=${pkg.cpu}&eggid=${config.eggid}&nestid=${config.nestid}&loc=${config.loc}&domain=${encodeURIComponent(
      config.domain
    )}&ptla=${config.ptla}&ptlc=${config.ptlc}`

    const r = await fetch(url, { method: "GET" })
    const json = await r.json()

    if (!json?.status) {
      return res.status(500).json({ ok: false, error: json?.error || "Failed to create panel" })
    }

    return res.status(200).json({
      ok: true,
      product: pkg,
      username,
      nomor,
      panel: json.data
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}