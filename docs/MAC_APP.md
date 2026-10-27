# Pitwall for Mac

The universal disk image contains a complete application for Apple silicon and Intel Macs on macOS 13 or newer. Open the `.dmg`, drag Pitwall to Applications, then launch it normally. Node.js, Git, npm and Terminal are not needed to use the app.

Previews have `preview` in their filenames and are ad-hoc signed, not Apple notarized. They demonstrate the build and are not the standard public installer. A standard release requires a Developer ID certificate, Apple Developer membership and successful Apple notarization. Credentials are never included in source control. `BUILD-INFO.json` records which installer was produced.

## Everyday use and storage

Pitwall starts its bundled server at `http://localhost:4173` on this computer only. Opening it again focuses its existing window. Closing the Mac window leaves the Dock app running; use Pitwall > Quit Pitwall or Command-Q to stop it and its server.

If another app or an older source server owns port 4173, Pitwall explains the conflict and offers Try again or Quit. It leaves the other process untouched and never silently loads its content.

Fresh forecasts, location search, radar and map tiles need internet. The bundled interface opens offline. Saved forecasts retain their original receipt time.

The private profile is at `~/Library/Application Support/Pitwall`. It is separate from Safari/Chrome. Transfer circuits, preferences and plans using Export backup in the old browser and Import backup in the app. History exports separately as CSV; it is not part of the JSON plan backup.

To update, quit Pitwall and replace it in Applications with the new download. Data lives outside the app bundle. Back up important plans before updating. To uninstall, quit and move the app to the Trash; its profile is retained. Removing that profile permanently removes its local data, with no server copy to recover it.

## Build and verify (maintainers)

```sh
npm ci
npm run check
npm run desktop:mac
npm run desktop:smoke
npx playwright test --config playwright.desktop.config.ts
```

Mac packaging runs on macOS. The **Build Mac app** GitHub workflow produces a universal DMG/ZIP, checks both CPU architectures and the signature, and launches the actual packaged app twice to check rendering, persistent storage, sandboxing and absence of Node access in the page. Separate Electron tests use synthetic provider data to test plans and native file export/import. These checks do not call public weather services. Downloads include `SHA256SUMS.txt` and `BUILD-INFO.json`. Tagged builds create a draft release for review without publishing it.

`npm run desktop` runs the source UI in Electron. `npm run desktop:dir` packages the local platform for smoke tests. Normal browser/source checks remain available.

### Standard signed releases

Select the workflow's explicit **signed** option after adding these GitHub Actions secrets:

- `MAC_CERTIFICATE_P12`: base64-encoded Developer ID Application certificate.
- `MAC_CERTIFICATE_PASSWORD`: its export password.
- `APPLE_NOTARY_KEY_P8`: App Store Connect notarization key.
- `APPLE_API_KEY_ID` and `APPLE_API_ISSUER`: key and issuer identifiers.

Signed builds fail when credentials are missing. They use hardened runtime, submit the application to Apple, assess it and validate its ticket, then notarize/staple/validate the DMG. Only after those checks does the build report say signed and notarized. The temporary key is removed after the job. Never paste certificates, keys or passwords into source, issues, logs or chat.

Preparing an installer does not buy Apple Developer membership, create credentials or publish a release.
