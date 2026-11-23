// Copie les fichiers de l'application web dans www/, le dossier
// que Capacitor embarque dans les applications Android et iOS.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "www");
const FILES = ["index.html", "404.html", "confidentialite.html", "mentions-legales.html", "securite.html", "manifest.webmanifest", "sw.js", "css", "js", "data", "icons", "images"];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of FILES) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, f), { recursive: true });
}
console.log("Application web copiée dans www/");
