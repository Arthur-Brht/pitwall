import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("public documentation links resolve to files shipped with the repository", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const documents = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (
        [
          ".git",
          "node_modules",
          "dist",
          "test-results",
          "playwright-report",
        ].includes(entry.name)
      )
        continue;
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(file);
      else if (entry.name.endsWith(".md")) documents.push(file);
    }
  }
  await collect(root);
  for (const document of documents) {
    const contents = await readFile(document, "utf8");
    for (const match of contents.matchAll(
      /!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
    )) {
      const target = match[1];
      if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
      const relative = decodeURIComponent(target.split("#")[0]);
      const destination = path.resolve(path.dirname(document), relative);
      assert.ok(
        destination.startsWith(root),
        `Private/outside path in ${path.relative(root, document)}`,
      );
      await assert.doesNotReject(
        access(destination),
        `${path.relative(root, document)} links to missing ${target}`,
      );
    }
  }
});
