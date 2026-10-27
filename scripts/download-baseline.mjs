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
  ? "Pitwall-2.2.0-mac-universal-preview.dmg"
  : "Pitwall-2.2.0-windows-x64-preview-setup.exe";
const expected = mac
  ? "3806587e187b8b332224af90b2cf7e8a6bcdc73c4cf378807f35227f437a589b"
  : "bbec57cf4c3a70aa55776ca9fe6bb8e57209b8d5f49dc03073249ef201e93bfe";
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
  `https://github.com/Arthur-Brht/pitwall/releases/download/v2.2.0-preview.2/${filename}`,
);
if (!response.ok) throw Error(`Reference download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== expected)
  throw Error("Reference checksum mismatch.");
await writeFile(destination, bytes, { flag: "wx" });
console.log(`Verified reference installer: ${filename}`);
