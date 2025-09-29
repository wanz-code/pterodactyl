// api/config.js

// ===== MAT Panel =====
const BASE_URL_PTERODACTYL_API =
  "https://restapi.mat.web.id/api/pterodactyl/create"

const PACKAGES = {
  "1gb": { ram: 1024, disk: 1024, cpu: 100, name: "1 GB", price: 10000 },
  "2gb": { ram: 2048, disk: 2048, cpu: 100, name: "2 GB", price: 20000 },
  "3gb": { ram: 3072, disk: 3072, cpu: 100, name: "3 GB", price: 30000 },
  "4gb": { ram: 4096, disk: 4096, cpu: 100, name: "4 GB", price: 40000 },
  "5gb": { ram: 5120, disk: 5120, cpu: 100, name: "5 GB", price: 50000 },
  "6gb": { ram: 6144, disk: 6144, cpu: 100, name: "6 GB", price: 60000 },
  "7gb": { ram: 7168, disk: 7168, cpu: 100, name: "7 GB", price: 70000 },
  "8gb": { ram: 8192, disk: 8192, cpu: 100, name: "8 GB", price: 80000 },
  "9gb": { ram: 9216, disk: 9216, cpu: 100, name: "9 GB", price: 90000 },
  "10gb": { ram: 10240, disk: 10240, cpu: 200, name: "10 GB", price: 100000 },
  unlimited: { ram: 0, disk: 0, cpu: 0, name: "Unlimited", price: 150000 }
}

// pisah default fallback biar aman di CJS
const config = {
  domain: process.env.DOMAIN ? process.env.DOMAIN : "https://wanzganteng.biz.id",
  ptla: process.env.PTLA ? process.env.PTLA : "ptla_",
  ptlc: process.env.PTLC ? process.env.PTLC : "ptlc_",
  eggid: "15",
  nestid: "5",
  loc: "1",
  resellerGroupLink: "https://chat.whatsapp.com/CcHCBX5pNlWL1cKwagVkNV",

  // Cashify
  lisencekey: process.env.LICENSE_KEY || "cashify_dd4b6896be3aca9beca57c8faec3a756330498b189839d687f458aa022d9da61",
  webhooksecret: process.env.WEBHOOK_SECRET || "cashify_0cd779dc56967b7c82c829cd6f27e5cd7a5ffb4b59c81e70150595bd16e65e60c57e9744b3e389f056e4e13871a503c0bb7966b18b0951e56569f1f60eee8281",
  qrisstatis: process.env.QRIS_STATIC_ID || "4bd17daa-8c09-422d-8c17-47eb684abaf5",
  qrisEndpoint: "https://cashify.my.id/api/generate/qris",
  qrisCheck: "https://cashify.my.id/api/generate/check-status"
}

module.exports = {
  BASE_URL_PTERODACTYL_API,
  PACKAGES,
  config
}