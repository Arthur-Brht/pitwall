import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const lock = JSON.parse(
  await readFile(path.join(root, "package-lock.json"), "utf8"),
);
const sections = [];
const seen = new Set();
for (const [relative, entry] of Object.entries(lock.packages)) {
  if (!relative || entry.dev || entry.devOptional) continue;
  const directory = path.join(root, relative);
  const pkg = JSON.parse(
    await readFile(path.join(directory, "package.json"), "utf8"),
  );
  const identity = `${pkg.name}@${pkg.version}`;
  if (seen.has(identity)) continue;
  seen.add(identity);
  const licenseFiles = (await readdir(directory))
    .filter((name) => /^(licen[cs]e|copying)(\.|$)/i.test(name))
    .sort();
  if (!licenseFiles.length)
    throw new Error(`Missing dependency licence: ${identity}`);
  const licenses = await Promise.all(
    licenseFiles.map((name) => readFile(path.join(directory, name), "utf8")),
  );
  sections.push(
    `${identity}\nDeclared licence: ${pkg.license ?? "See licence below"}\nhttps://www.npmjs.com/package/${pkg.name}\n\n${licenses.join("\n\n").trim().replace(/\r\n?/g, "\n")}`,
  );
}
sections.sort();
const destination = path.join(root, "web/public/THIRD_PARTY_NOTICES.txt");
const output = `Pitwall bundled production dependencies\n\nThe application code is MIT licensed; these libraries retain their own notices.\nWeather, radar and geographic data have separate terms listed in THIRD_PARTY.md.\n\n${sections.join("\n\n" + "=".repeat(72) + "\n\n")}\n`;
if (process.argv.includes("--check")) {
  if ((await readFile(destination, "utf8")) !== output)
    throw new Error(
      "Dependency notices are out of date. Run npm run notices and commit the result.",
    );
} else await writeFile(destination, output);
console.log(
  `Retained licence text for ${sections.length} production dependencies.`,
);
