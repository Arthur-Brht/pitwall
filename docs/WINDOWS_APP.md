# Pitwall for Windows

Download the Windows x64 setup `.exe` from [Releases](https://github.com/Arthur-Brht/pitwall/releases), run the installation wizard, and open Pitwall from the Start menu or its desktop shortcut. It supports 64-bit Intel/AMD PCs running Windows 10 or Windows 11. The app includes its interface and runtime; no terminal, Node.js or separate browser is needed.

The default installation is for the current Windows user. The wizard lets you choose an installation folder. Pitwall is also registered in Windows Settings > Apps for uninstallation.

## Preview security status

The filename includes `preview` because this build is unsigned. `WINDOWS-BUILD-INFO.json` explicitly records that status. SmartScreen may identify the download as an unrecognized app; Smart App Control or organizational policy can block unsigned apps entirely. [Microsoft explains these protections and signing requirements](https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation).

The installer does not change Windows security settings. A standard signed Windows release requires a trusted code-signing identity and a separate signing process. The preview does not claim that signing or reputation review has happened.

## Everyday use and storage

Pitwall automatically starts its bundled server at `http://localhost:4173`, bound to this computer only. Opening Pitwall again focuses the existing window. Closing the last window quits the app and its server. If an older source server or another app already owns that port, Pitwall explains the conflict and leaves that process untouched.

Fresh forecasts, search, map tiles and radar need internet. The interface itself is bundled and can open offline; available saved forecasts keep their original timestamps.

Plans, preferences and forecast history use the app's private profile at `%APPDATA%\Pitwall`, separate from Edge, Chrome and other browsers. Transfer browser plans/settings using Export backup and Import backup in Weather preferences. History exports separately as CSV. The app sends no plans or history to a Pitwall backend. [Privacy details](PRIVACY.md).

To update, close Pitwall and run the new installer. Reinstallation keeps the app's profile. Back up important plans before updating. To uninstall, use Windows Settings > Apps > Installed apps > Pitwall > Uninstall. The profile is retained so reinstalling can restore access to local data; no cloud copy exists. Remove profile data only after exporting anything you want to keep.

## Build and verify (maintainers)

On Windows with Node.js 22.13 or newer:

```powershell
npm ci
npm run check
npm run desktop:windows
npm run desktop:smoke
npx playwright test --config playwright.desktop.config.ts
node scripts/package-manifest.mjs
```

The [Build desktop apps workflow](https://github.com/Arthur-Brht/pitwall/actions/workflows/macos.yml) builds both platforms. Its Windows job builds the x64 NSIS installer and requires the actual packaged app to render, keep localStorage and IndexedDB through quit/reopen, and preserve sandboxing with no renderer Node access. The separate Electron flow verifies all five synthetic provider feeds, plans and native backup export/import.

An installer lifecycle check runs only on the disposable Windows CI runner. It installs to a path containing spaces, verifies the Start menu shortcut and Windows Apps registration, launches and reopens the installed executable, reinstalls it, and uninstalls it while checking that profile data is retained. Tests use an isolated profile and port 4175 and do not call live weather providers.

Successful Windows builds include the installer, `WINDOWS-SHA256SUMS.txt` and `WINDOWS-BUILD-INFO.json`. Tagged builds create a draft release only after the Mac and Windows checks pass. Ordinary web/browser/security CI remains separate. Source builds on a computer whose security policy blocks unsigned applications may be unable to execute the packaged app; leave that protection in place and use the recorded CI evidence.
