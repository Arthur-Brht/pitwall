import { readdir, copyFile, stat } from "node:fs/promises";
import path from "node:path";
const directory = new URL("../test-results/docs/", import.meta.url);
const candidates = [];
for (const entry of await readdir(directory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const video = new URL(`${entry.name}/video.webm`, directory);
  try {
    const info = await stat(video);
    candidates.push({ video, modified: info.mtimeMs });
  } catch {
    /* Other reports are not videos. */
  }
}
candidates.sort((a, b) => b.modified - a.modified);
if (!candidates.length)
  throw Error("No successful documentation video was captured.");
await copyFile(
  candidates[0].video,
  new URL("../docs/images/walkthrough.webm", import.meta.url),
);
console.log(
  `Saved ${path.basename(candidates[0].video.pathname)} as the labelled documentation walkthrough.`,
);
