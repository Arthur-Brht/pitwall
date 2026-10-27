const signed = process.env.PITWALL_SIGNED_RELEASE === "1";
const identity = require("./desktop/app-identity.json");
if (
  signed &&
  [
    "CSC_LINK",
    "CSC_KEY_PASSWORD",
    "APPLE_API_KEY",
    "APPLE_API_KEY_ID",
    "APPLE_API_ISSUER",
  ].some((name) => !process.env[name])
)
  throw new Error(
    "A signed release requires the signing certificate and Apple notarization credentials.",
  );
module.exports = {
  appId: identity.appId,
  productName: identity.name,
  directories: {
    app: ".desktop-app",
    output: "release",
    buildResources: "desktop/resources",
  },
  files: ["**/*", "!node_modules/**"],
  asar: true,
  npmRebuild: false,
  publish: null,
  electronFuses: {
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
  },
  mac: {
    target: [
      { target: "dmg", arch: ["universal"] },
      { target: "zip", arch: ["universal"] },
    ],
    category: "public.app-category.weather",
    minimumSystemVersion: "13.0.0",
    icon: "desktop/resources/icon.icns",
    identity: signed ? undefined : "-",
    hardenedRuntime: true,
    entitlements: signed
      ? "desktop/entitlements.mac.plist"
      : "desktop/entitlements.preview.plist",
    entitlementsInherit: signed
      ? "desktop/entitlements.mac.plist"
      : "desktop/entitlements.preview.plist",
    notarize: signed,
    forceCodeSigning: signed,
    artifactName: signed
      ? "Pitwall-${version}-mac-universal.${ext}"
      : "Pitwall-${version}-mac-universal-preview.${ext}",
  },
  dmg: {
    title: signed ? identity.name : `${identity.name} (not notarized)`,
    sign: signed,
    contents: [
      { x: 150, y: 170 },
      { x: 430, y: 170, type: "link", path: "/Applications" },
    ],
    window: { width: 580, height: 370 },
  },
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "desktop/resources/icon.png",
    signExecutable: false,
    artifactName: "Pitwall-${version}-windows-x64-preview-setup.${ext}",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    selectPerMachineByDefault: false,
    allowElevation: false,
    allowToChangeInstallationDirectory: true,
    packElevateHelper: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: identity.name,
    uninstallDisplayName: identity.name,
    runAfterFinish: false,
    deleteAppDataOnUninstall: false,
  },
};
