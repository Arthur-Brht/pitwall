import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
const metadata = JSON.parse(await readFile("package.json", "utf8"));
const lines = [];
for (const file of (await readdir("release"))
  .filter((name) => /\.(dmg|zip)$/.test(name))
  .sort()) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(`release/${file}`))
    hash.update(chunk);
  lines.push(`${hash.digest("hex")}  ${file}`);
}
if (!lines.length) throw new Error("No macOS installers were produced.");
await writeFile("release/SHA256SUMS.txt", lines.join("\n") + "\n");
await writeFile(
  "release/BUILD-INFO.json",
  JSON.stringify(
    {
      application: "Pitwall",
      version: metadata.version,
      commit: process.env.GITHUB_SHA ?? null,
      architecture: "universal (arm64 and x86_64)",
      minimumMacOS: "13.0",
      developerIDSignedAndNotarized: process.env.PITWALL_SIGNED_RELEASE === "1",
      note:
        process.env.PITWALL_SIGNED_RELEASE === "1"
          ? "Developer ID signed and notarized. See verification job."
          : "Ad-hoc signed developer preview. Not Apple notarized; not the standard public installer.",
    },
    null,
    2,
  ) + "\n",
);
