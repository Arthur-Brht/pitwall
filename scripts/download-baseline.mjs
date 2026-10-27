import { createHash } from "node:crypto";
import { writeFile, access } from "node:fs/promises";
import path from "node:path";

if (
  process.env.CI !== "true" ||
  !process.env.GITHUB_ACTIONS ||
  !process.env.RUNNER_TEMP
)
  throw Error(
    "Download the reference installer only on a disposable GitHub runner.",
  );
const mac = process.platform === "darwin";
const filename = mac
  ? "Pitwall-2.3.0-mac-universal-preview.dmg"
  : "Pitwall-2.3.0-windows-x64-preview-setup.exe";
const expected = mac
  ? "902d4fe73ae1322bcfd6fbd73fe2bd36d4cf1df3d9b20f78d995609ae10c8a4d"
  : "fe90defbf724f85e42ade890d59da8c1732892f979fc7d11e24fe1749bcc9c35";
const destination = path.join(
  process.env.RUNNER_TEMP,
  mac ? "pitwall-baseline.dmg" : "pitwall-baseline.exe",
);
await access(destination).then(
  () => {
    throw Error("The reference download must be new.");
  },
  (error) => {
    if (error.code !== "ENOENT") throw error;
  },
);
const response = await fetch(
  `https://github.com/Arthur-Brht/pitwall/releases/download/v2.3.0-preview.1/${filename}`,
);
if (!response.ok) throw Error(`Reference download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== expected)
  throw Error("Reference checksum mismatch.");
await writeFile(destination, bytes, { flag: "wx" });
console.log(`Verified reference installer: ${filename}`);
