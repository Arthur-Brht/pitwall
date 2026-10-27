import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
const metadata = JSON.parse(await readFile("package.json", "utf8"));
const identity = JSON.parse(
  await readFile("desktop/app-identity.json", "utf8"),
);
const windows = process.platform === "win32";
const prefix = windows ? "WINDOWS-" : "";
const lines = [];
for (const file of (await readdir("release"))
  .filter((name) =>
    windows
      ? /-windows-x64-preview-setup\.exe$/.test(name)
      : /\.(dmg|zip)$/.test(name),
  )
  .sort()) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(`release/${file}`))
    hash.update(chunk);
  lines.push(`${hash.digest("hex")}  ${file}`);
}
if (!lines.length)
  throw new Error("No installers were produced for this platform.");
await writeFile(`release/${prefix}SHA256SUMS.txt`, lines.join("\n") + "\n");
await writeFile(
  `release/${prefix}BUILD-INFO.json`,
  JSON.stringify(
    {
      application: identity.name,
      applicationId: identity.appId,
      profile: identity.profile,
      localPort: identity.port,
      version: metadata.version,
      commit: process.env.GITHUB_SHA ?? null,
      platform: process.platform,
      architecture: windows ? "x64" : "universal (arm64 and x86_64)",
      ...(windows
        ? {
            minimumWindows: "10",
            authenticodeSigned: false,
          }
        : {
            minimumMacOS: "13.0",
            developerIDSignedAndNotarized:
              process.env.PITWALL_SIGNED_RELEASE === "1",
          }),
      note: windows
        ? "Unsigned Windows preview. Windows security or organizational policies may warn or block it."
        : process.env.PITWALL_SIGNED_RELEASE === "1"
          ? "Developer ID signed and notarized. See verification job."
          : "Ad-hoc signed developer preview. Not Apple notarized; not the standard public installer.",
    },
    null,
    2,
  ) + "\n",
);
