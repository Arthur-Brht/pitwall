import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const assets = (await readdir(new URL("../dist/assets/", import.meta.url)))
  .filter((name) => /\.(?:js|css|woff2?)$/.test(name))
  .sort()
  .map((name) => `assets/${name}`);
const revision = createHash("sha256")
  .update(assets.join("\n"))
  .update(
    await readFile(new URL("../web/public/theme-init.js", import.meta.url)),
  )
  .digest("hex")
  .slice(0, 16);
const template = await readFile(
  new URL("../web/public/sw.js", import.meta.url),
  "utf8",
);
await writeFile(
  fileURLToPath(new URL("../dist/sw.js", import.meta.url)),
  `self.__PITWALL_ASSETS__ = ${JSON.stringify(assets)};\n${template.replace("__PITWALL_BUILD__", revision)}`,
);
console.log(
  `Offline shell revision ${revision}; ${assets.length} bundled assets.`,
);
