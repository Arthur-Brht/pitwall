import { cp, mkdir, readFile, writeFile, access, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const metadata = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const stage = path.join(root, ".desktop-app");
const identity = JSON.parse(
  await readFile(path.join(root, "desktop/app-identity.json"), "utf8"),
);
await access(path.join(root, "dist/index.html"));
if (path.dirname(stage) !== path.resolve(root))
  throw new Error("Invalid app staging directory.");
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
for (const relative of [
  "desktop/main.mjs",
  "desktop/app-identity.json",
  "desktop/server.mjs",
  "desktop/policy.mjs",
  "desktop/preload.cjs",
  "desktop/smoke.mjs",
  "scripts/start.mjs",
  "LICENSE",
  "THIRD_PARTY.md",
]) {
  await mkdir(path.dirname(path.join(stage, relative)), { recursive: true });
  await cp(path.join(root, relative), path.join(stage, relative));
}
await cp(path.join(root, "dist"), path.join(stage, "dist"), {
  recursive: true,
});
await writeFile(
  path.join(stage, "package.json"),
  JSON.stringify(
    {
      name: metadata.name,
      productName: identity.name,
      version: metadata.version,
      description: metadata.description,
      author: "Pitwall contributors",
      license: "MIT",
      type: "module",
      main: "desktop/main.mjs",
      repository: metadata.repository,
      dependencies: {},
    },
    null,
    2,
  ) + "\n",
);
// Electron's distributed runtime includes Chromium and Node notices separately from web dependencies.
for (const [source, destination] of [
  ["LICENSE", "ELECTRON_LICENSE.txt"],
  ["LICENSES.chromium.html", "CHROMIUM_LICENSES.html"],
])
  await cp(
    path.join(root, "node_modules/electron/dist", source),
    path.join(stage, destination),
  );

const resources = path.join(root, "desktop/resources");
await mkdir(resources, { recursive: true });
const svg = await readFile(path.join(root, "web/public/icons/icon-512.svg"));
await sharp(svg)
  .resize(1024, 1024)
  .png()
  .toFile(path.join(resources, "icon.png"));
// ICNS container: lossless PNG representations at native macOS icon sizes.
const blocks = [];
for (const [type, size] of [
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
]) {
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  const header = Buffer.alloc(8);
  header.write(type, 0, "ascii");
  header.writeUInt32BE(png.length + 8, 4);
  blocks.push(header, png);
}
const header = Buffer.alloc(8);
header.write("icns");
header.writeUInt32BE(
  8 + blocks.reduce((sum, block) => sum + block.length, 0),
  4,
);
await writeFile(
  path.join(resources, "icon.icns"),
  Buffer.concat([header, ...blocks]),
);
console.log(
  `Prepared Pitwall ${metadata.version}; bundled app files and runtime notices only.`,
);
