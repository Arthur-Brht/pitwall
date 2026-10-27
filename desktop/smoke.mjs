import { app } from "electron";
import { writeFile } from "node:fs/promises";

// Invoked only by the explicit local/CI --pitwall-test launch. No renderer API is exposed.
export async function packagedSmoke(window, origin) {
  const report = await window.webContents.executeJavaScript(`(async () => {
    const waitFor = async (predicate) => {
      for (let i = 0; i < 100 && !predicate(); i++)
        await new Promise(resolve => setTimeout(resolve, 100));
      return Boolean(predicate());
    };
    const rendered = () => ['Overview', 'Sessions', 'Models', 'History'].every(label =>
      [...document.querySelectorAll('nav[aria-label="Weather views"] button')].some(button => button.textContent === label));
    await waitFor(() => rendered() && !document.body.innerText.includes('Use Pitwall as an app'));
    const reopen = ${JSON.stringify(process.env.PITWALL_SMOKE_REOPEN === "1")};
    const previous = localStorage.getItem('pitwall-desktop-smoke');
    if (!reopen) {
      localStorage.setItem('pitwall-desktop-smoke', 'retained');
      // Choose through React's controls so its initial system-preference effect
      // cannot race a test-only localStorage write and remove the preference.
      document.querySelector('.header-actions button[aria-label="Weather preferences"]').click();
      await waitFor(() => document.querySelector('[aria-labelledby="appearance-label"]'));
      [...document.querySelectorAll('[aria-labelledby="appearance-label"] button')]
        .find(button => button.textContent === 'Dark').click();
      await waitFor(() => localStorage.getItem('pitwall-theme') === 'dark' && document.documentElement.dataset.theme === 'dark');
      [...document.querySelectorAll('[role="dialog"] button')]
        .find(button => button.textContent.trim() === 'Done').click();
      await waitFor(() => !document.querySelector('[role="dialog"]'));
    }
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
      rendered: rendered(),
      appearanceRetained: localStorage.getItem('pitwall-theme') === 'dark' && document.documentElement.dataset.theme === 'dark',
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
    !report.appearanceRetained ||
    !report.sandbox ||
    !report.originMatches
  )
    throw new Error("Packaged desktop smoke check failed.");
}
