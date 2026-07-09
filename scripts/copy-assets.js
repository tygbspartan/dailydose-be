// Copies non-TS assets that `tsc` doesn't handle (e.g. the email logo)
// from src/ into dist/ so they exist when running the compiled app in prod.
const fs = require("fs");
const path = require("path");

const assets = [{ from: "src/logo", to: "dist/logo" }];

for (const { from, to } of assets) {
  const src = path.join(__dirname, "..", from);
  const dest = path.join(__dirname, "..", to);

  if (!fs.existsSync(src)) {
    console.warn(`[copy-assets] skipped (missing): ${from}`);
    continue;
  }

  fs.cpSync(src, dest, { recursive: true });
  console.log(`[copy-assets] ${from} -> ${to}`);
}
