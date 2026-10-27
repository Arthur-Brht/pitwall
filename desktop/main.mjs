import { app, BrowserWindow, dialog, Menu, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startDesktopServer } from "./server.mjs";
import { externalLink, isAppPage, isAppDownload } from "./policy.mjs";
import identity from "./app-identity.json" with { type: "json" };

const root = fileURLToPath(new URL("../", import.meta.url));
const testing = process.argv.includes("--pitwall-test");
app.setName(identity.name);
if (process.platform === "win32") app.setAppUserModelId(identity.appId);
app.setPath(
  "userData",
  testing && process.env.PITWALL_TEST_PROFILE
    ? process.env.PITWALL_TEST_PROFILE
    : path.join(app.getPath("appData"), identity.profile),
);
app.enableSandbox();
let server;
let mainWindow;
let stopping = false;

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (!mainWindow) void createWindow();
    else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
  app.on("activate", () => {
    if (server && !mainWindow) void createWindow();
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("before-quit", (event) => {
    if (!server || stopping) return;
    event.preventDefault();
    stopping = true;
    void server.close().finally(() => app.quit());
  });
  void app.whenReady().then(start).catch(fatal);
}

async function openExternal(value) {
  const url = externalLink(value);
  if (url) await shell.openExternal(url);
}

async function createWindow() {
  if (!server) return;
  mainWindow = new BrowserWindow({
    title: identity.name,
    width: 1440,
    height: 1000,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#f5f6f3",
    show: false,
    autoHideMenuBar: process.platform !== "darwin",
    webPreferences: {
      preload: path.join(root, "desktop/preload.cjs"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
      devTools: !app.isPackaged,
    },
  });
  const window = mainWindow;
  window.on("page-title-updated", (event) => {
    event.preventDefault();
    window.setTitle(identity.name);
  });
  window.on("closed", () => {
    mainWindow = undefined;
  });
  window.webContents.on("will-attach-webview", (event) =>
    event.preventDefault(),
  );
  window.webContents.on("will-navigate", (event, url) => {
    if (isAppPage(url, server.origin)) return;
    event.preventDefault();
    void openExternal(url);
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isAppDownload(url, server.origin)) window.webContents.downloadURL(url);
    else void openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("render-process-gone", () => {
    if (!stopping)
      void dialog
        .showMessageBox({
          type: "error",
          title: "Pitwall needs to reopen",
          message: "The weather window stopped responding.",
          detail:
            "Your saved plans are still on this computer. Quit and reopen Pitwall.",
          buttons: ["Quit Pitwall"],
        })
        .then(() => app.quit());
  });
  if (testing && process.env.PITWALL_TEST_HOLD === "1") {
    await window.loadURL("about:blank");
    return;
  }
  await window.loadURL(server.origin + "/");
  if (!testing) window.show();
  if (testing && process.env.PITWALL_SMOKE_OUTPUT) {
    const { packagedSmoke } = await import("./smoke.mjs");
    await packagedSmoke(window, server.origin);
    app.quit();
  }
}

async function start() {
  app.setAboutPanelOptions({
    applicationName: identity.name,
    applicationVersion: app.getVersion(),
    website: "https://github.com/Arthur-Brht/pitwall",
    copyright:
      "MIT licensed software. Weather and map data retain their own terms.",
  });
  session.defaultSession.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.on("will-download", (event, item) => {
    if (!server || !isAppDownload(item.getURL(), server.origin)) {
      event.preventDefault();
      return;
    }
    item.setSaveDialogOptions({ title: "Save Pitwall export" });
  });
  if (testing && process.env.PITWALL_SMOKE_OUTPUT)
    session.defaultSession.webRequest.onBeforeRequest((details, callback) =>
      callback({ cancel: !details.url.startsWith("http://localhost:") }),
    );
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
      { role: "fileMenu" },
      { role: "editMenu" },
      {
        label: "View",
        submenu: [
          { role: "reload" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
        ],
      },
      { role: "windowMenu" },
      {
        role: "help",
        submenu: [
          {
            label: "Pitwall documentation",
            click: () =>
              void openExternal("https://github.com/Arthur-Brht/pitwall"),
          },
        ],
      },
    ]),
  );
  while (!server) {
    try {
      server = await startDesktopServer(
        path.join(root, "dist"),
        testing && process.env.PITWALL_TEST_PORT
          ? Number(process.env.PITWALL_TEST_PORT)
          : identity.port,
      );
    } catch (error) {
      if (testing) throw error;
      const occupied = error.code === "EADDRINUSE";
      const { response } = await dialog.showMessageBox({
        type: "error",
        title: "Pitwall could not open",
        buttons: ["Try again", "Quit"],
        defaultId: 0,
        cancelId: 1,
        message: occupied
          ? "Another app is using Pitwall’s local address."
          : "Pitwall could not load its bundled files.",
        detail: occupied
          ? "Close any older Pitwall window or local server, then choose Try again. The other app has been left untouched."
          : "Reinstall Pitwall from the original download, then try again.",
      });
      if (response === 1) {
        app.quit();
        return;
      }
    }
  }
  await createWindow();
}

async function fatal(error) {
  if (testing) {
    console.error(error);
    process.exitCode = 1;
  } else
    dialog.showErrorBox(
      "Pitwall could not open",
      "Please reopen Pitwall. If this continues, reinstall it from the original download.",
    );
  app.quit();
}
