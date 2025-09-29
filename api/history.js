// api/history.js
const fs = require("fs")
const path = require("path")

const HISTORY_FILE = path.join(process.cwd(), "Database", "history.json")

// pastikan file exist
function ensureHistoryFile() {
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true })
    fs.writeFileSync(HISTORY_FILE, "[]", "utf-8")
  }
}

module.exports = async (req, res) => {
  ensureHistoryFile()

  if (req.method === "GET") {
    // ambil semua history
    try {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"))
      return res.status(200).json({ ok: true, history: data })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  if (req.method === "POST") {
    // tambah history baru
    try {
      const { product, username, nomor, price, trxId, status } = req.body
      if (!product || !username || !nomor || !price || !trxId) {
        return res.status(400).json({ ok: false, error: "Missing required fields" })
      }

      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"))

      const newEntry = {
        product,
        username,
        nomor,
        price,
        trxId,
        status: status || "paid",
        time: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
      }

      data.push(newEntry)
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2))

      return res.status(200).json({ ok: true, history: newEntry })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" })
}