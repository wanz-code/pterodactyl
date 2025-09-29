// api/create-panel.js
const { config, PACKAGES, BASE_URL_PTERODACTYL_API } = require("./config")
const fetch = require("node-fetch")

module.exports = async (req, res) => {
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

    const url = `${BASE_URL_PTERODACTYL_API}?username=${encodeURIComponent(
      username
    )}&ram=${pkg.ram}&disk=${pkg.disk}&cpu=${pkg.cpu}&eggid=${config.eggid}&nestid=${config.nestid}&loc=${config.loc}&domain=${encodeURIComponent(
      config.domain
    )}&ptla=${config.ptla}&ptlc=${config.ptlc}`

    const r = await fetch(url, { method: "GET" })
    const json = await r.json()

    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}