// Produce one portable HTML file for the competition's offline fallback.
// Use the production UI, local assets and the existing demo data path.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const {createHash} = require("node:crypto");
const web = path.resolve(__dirname, "../volunteerhub-web/vh-web");
const target = path.resolve(process.argv[2] || "VolunteerHub-demo.html");
const read = file => fs.readFileSync(path.join(web, file), "utf8");
const asset = (file, mime) => "data:" + mime + ";base64," + fs.readFileSync(path.join(web,file)).toString("base64");
const hashes = [];
let html = read("index.html");
html = html.replace(/<link rel="preload"[^>]+>\s*/g, "");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_,file) => {
  const css = read(file).replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_,name) => 'url("' + asset("fonts/" + name, "font/woff2") + '")');
  return "<style>" + css + "</style>";
});
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_,file) => {
  let source = file === "js/firebase-config.js" ? "window.FIREBASE_CONFIG = {};" : read(file);
  if (file === "js/views/landing.js") source = source.replace("images/community-garden.webp", asset("images/community-garden.webp","image/webp"));
  source = source.replace(/<\/script/gi, "<\\/script").replace(/\r\n/g, "\n");
  hashes.push("'sha256-" + createHash("sha256").update(source).digest("base64") + "'");
  return "<script>" + source + "</script>";
});
const policy = ["default-src 'none'", "script-src " + hashes.join(" "), "style-src 'unsafe-inline'", "img-src data:",
  "font-src data:", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join("; ");
html = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]+/, (_,prefix) => prefix + policy);
const notices = ["fonts/Atkinson-Hyperlegible-Next-OFL.txt","fonts/Bitter-OFL.txt","licenses/zipcodes-MIT.txt"];
const credits = notices.map(file => "<h3>" + file.split("/").pop() + "</h3><pre>" +
  read(file).replace(/&/g,"&amp;").replace(/</g,"&lt;") + "</pre>").join("");
html = html.replace("</body>", "<template id=\"third-party-notices\">" + credits + "</template>\n</body>");
fs.writeFileSync(target, html);
console.log("Wrote " + target);
