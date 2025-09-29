// api/check-status.js
import { config } from "./config.js"
import fetch from "node-fetch"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  try {
    const { transactionId } = req.body
    if (!transactionId) {
      return res.status(400).json({ ok: false, error: "transactionId is required" })
    }

    // cek status ke Cashify
    const r = await fetch(config.qrisCheck, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-license-key": config.lisencekey
      },
      body: JSON.stringify({ transactionId })
    })

    const json = await r.json()

    if (!json?.status) {
      return res.status(500).json({ ok: false, error: json?.error || "Failed to check status" })
    }

    return res.status(200).json({
      ok: true,
      status: json.data.status,
      data: json.data
    })
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}