// api/check-status.js
const { config } = require("./config")
const fetch = require("node-fetch")

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    const { transactionId } = req.body
    if (!transactionId) {
      return res.status(400).json({ ok: false, error: "transactionId is required" })
    }

    const r = await fetch(config.qrisCheck, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-license-key": config.lisencekey
      },
      body: JSON.stringify({ transactionId })
    })

    const json = await r.json()
    return res.status(200).json(json)
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}