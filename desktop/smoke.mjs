import { app } from "electron";
import { writeFile } from "node:fs/promises";

// Invoked only by the explicit local/CI --pitwall-test launch. No renderer API is exposed.
export async function packagedSmoke(window, origin) {
  const report = await window.webContents.executeJavaScript(`(async () => {
    for (let i = 0; i < 100 && !document.body.innerText.includes('Weather desk'); i++)
      await new Promise(resolve => setTimeout(resolve, 100));
    const reopen = ${JSON.stringify(process.env.PITWALL_SMOKE_REOPEN === "1")};
    const previous = localStorage.getItem('pitwall-desktop-smoke');
    if (!reopen) localStorage.setItem('pitwall-desktop-smoke', 'retained');
    const dbWorks = await new Promise(resolve => {
      const request = indexedDB.open('pitwall-desktop-smoke', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('checks');
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('checks', reopen ? 'readonly' : 'readwrite');
        const store = transaction.objectStore('checks');
        let valid = !reopen;
        if (reopen) store.get('saved').onsuccess = event => { valid = event.target.result === 'retained'; };
        else store.put('retained', 'saved');
        transaction.oncomplete = () => { db.close(); resolve(valid); };
        transaction.onerror = () => { db.close(); resolve(false); };
      };
      request.onerror = () => resolve(false);
    });
    return {
      title: document.title,
      rendered: document.body.innerText.includes('Weather desk'),
      desktop: window.pitwallDesktop?.isDesktop === true,
      nodeUnavailable: typeof require === 'undefined' && typeof process === 'undefined',
      installButtonHidden: !document.body.innerText.includes('Use Pitwall as an app'),
      indexedDB: dbWorks,
      persisted: !reopen || previous === 'retained',
      origin: location.origin
    };
  })()`);
  const preferences = window.webContents.getLastWebPreferences();
  report.sandbox =
    preferences.sandbox &&
    preferences.contextIsolation &&
    !preferences.nodeIntegration;
  report.packaged = app.isPackaged;
  report.version = app.getVersion();
  report.originMatches = report.origin === origin;
  await writeFile(
    process.env.PITWALL_SMOKE_OUTPUT,
    JSON.stringify(report, null, 2),
  );
  if (
    !report.rendered ||
    !report.desktop ||
    !report.nodeUnavailable ||
    !report.installButtonHidden ||
    !report.indexedDB ||
    !report.persisted ||
    !report.sandbox ||
    !report.originMatches
  )
    throw new Error("Packaged desktop smoke check failed.");
}
