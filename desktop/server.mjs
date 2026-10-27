import { access } from "node:fs/promises";
import path from "node:path";
import { createAppServer } from "../scripts/start.mjs";

export async function startDesktopServer(directory, port = 4173) {
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("Invalid local application port.");
  await access(path.join(directory, "index.html"));
  const server = createAppServer(directory);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  return {
    origin: `http://localhost:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}
