// api/packages.js
const { PACKAGES } = require("./config")

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" })
  }

  res.status(200).json({ ok: true, packages: PACKAGES })
}