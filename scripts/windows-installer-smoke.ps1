$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Installer tests belong on a disposable GitHub runner, never a user's installation.
if ($env:CI -ne 'true' -or -not $env:RUNNER_TEMP -or -not $env:GITHUB_ACTIONS) {
    throw 'Run the installer lifecycle check on the isolated Windows CI runner.'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$temporaryRoot = [IO.Path]::GetFullPath($env:RUNNER_TEMP).TrimEnd('\')
$installDirectory = [IO.Path]::GetFullPath((Join-Path $temporaryRoot 'Pitwall installer test'))
if (-not $installDirectory.StartsWith($temporaryRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'The installer test directory must stay inside RUNNER_TEMP.'
}
if (Test-Path -LiteralPath $installDirectory) {
    throw 'The installer test directory must be new.'
}
$installers = @(Get-ChildItem -LiteralPath 'release' -Filter '*-windows-x64-preview-setup.exe')
if ($installers.Count -ne 1) { throw 'Expected exactly one Windows installer.' }
$installer = $installers[0]
$version = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
$identity = Get-Content -LiteralPath 'desktop/app-identity.json' -Raw | ConvertFrom-Json
$binary = Join-Path $installDirectory ($identity.name + '.exe')
$shortcut = Join-Path ([Environment]::GetFolderPath('Programs')) ($identity.name + '.lnk')
$profile = Join-Path $env:APPDATA $identity.profile
$marker = Join-Path $profile 'installer-preservation-check.txt'
if (Test-Path -LiteralPath $profile) { throw 'The CI app profile must be new.' }

function Invoke-InstallerProcess([string]$File, [string[]]$InstallerArguments) {
    $process = Start-Process -FilePath $File -ArgumentList $InstallerArguments -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Installer process exited $($process.ExitCode)." }
}

function Get-PitwallRegistration([string]$AppName = $identity.name) {
    @(Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
        Where-Object { $_.PSObject.Properties.Name -contains 'DisplayName' -and $_.DisplayName -eq $AppName })
}

& node scripts/download-baseline.mjs
if ($LASTEXITCODE -ne 0) { throw 'The reference installer could not be verified.' }
$baselineDirectory = [IO.Path]::GetFullPath((Join-Path $temporaryRoot 'Pitwall 2.3 reference'))
if (-not $baselineDirectory.StartsWith($temporaryRoot + '\', [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $baselineDirectory)) { throw 'The reference install must use a new RUNNER_TEMP directory.' }
if ((Test-Path -LiteralPath (Join-Path $env:APPDATA 'Pitwall 2.3 Preview')) -or @(Get-PitwallRegistration 'Pitwall 2.3 Preview').Count) { throw 'The runner must not contain an existing Pitwall installation.' }
Invoke-InstallerProcess (Join-Path $temporaryRoot 'pitwall-baseline.exe') @('/S', '/currentuser', "/D=$baselineDirectory")
$baselineBinary = Join-Path $baselineDirectory 'Pitwall 2.3 Preview.exe'
$baselineShortcut = Join-Path ([Environment]::GetFolderPath('Programs')) 'Pitwall 2.3 Preview.lnk'
if (-not (Test-Path -LiteralPath $baselineBinary) -or -not (Test-Path -LiteralPath $baselineShortcut)) { throw 'The reference app did not install.' }

foreach ($attempt in @('install', 'reinstall')) {
    Invoke-InstallerProcess $installer.FullName @('/S', '/currentuser', "/D=$installDirectory")
    if (-not (Test-Path -LiteralPath $binary)) { throw 'The installed app is missing.' }
    if (-not (Test-Path -LiteralPath $shortcut)) { throw 'The Start menu shortcut is missing.' }
    $registration = @(Get-PitwallRegistration)
    if ($registration.Count -ne 1 -or $registration[0].DisplayVersion -ne $version) {
        throw 'Windows Apps must register the expected application version.'
    }
    if ($attempt -eq 'install') {
        New-Item -ItemType Directory -Path $profile | Out-Null
        Set-Content -LiteralPath $marker -Value 'retained'
    }
    if ((Get-Content -LiteralPath $marker -Raw).Trim() -ne 'retained') {
        throw 'The installer did not preserve existing application data.'
    }
    & npm.cmd run desktop:smoke -- --executable $binary
    if ($LASTEXITCODE -ne 0) { throw "The installed app failed its $attempt launch/reopen check." }
}

& node scripts/coexist-smoke.mjs $baselineBinary $binary
if ($LASTEXITCODE -ne 0) { throw 'Production side-by-side launch failed.' }
$uninstaller = Join-Path $installDirectory ('Uninstall ' + $identity.name + '.exe')
if (-not (Test-Path -LiteralPath $uninstaller)) { throw 'The app uninstaller is missing.' }
Invoke-InstallerProcess $uninstaller @('/S', '/currentuser', "_?=$installDirectory")
if ((Test-Path -LiteralPath $binary) -or (Test-Path -LiteralPath $shortcut)) {
    throw 'Uninstall did not remove the application and Start menu shortcut.'
}
if (@(Get-PitwallRegistration).Count -ne 0) { throw 'Uninstall did not remove Windows Apps registration.' }
if ((Get-Content -LiteralPath $marker -Raw).Trim() -ne 'retained') {
    throw 'Uninstall must retain saved application data.'
}
if (-not (Test-Path -LiteralPath $baselineBinary) -or -not (Test-Path -LiteralPath $baselineShortcut) -or @(Get-PitwallRegistration 'Pitwall 2.3 Preview').Count -ne 1) { throw 'Removing 2.4 must preserve the 2.3 app, shortcut and registration.' }
$baselineMarker = Join-Path $env:APPDATA 'Pitwall 2.3 Preview\coexistence-check.txt'
if ((Get-Content -LiteralPath $baselineMarker -Raw) -ne 'baseline-only') { throw 'The reference profile changed.' }
Invoke-InstallerProcess (Join-Path $baselineDirectory 'Uninstall Pitwall 2.3 Preview.exe') @('/S', '/currentuser', "_?=$baselineDirectory")
$signature = (Get-AuthenticodeSignature -LiteralPath $installer.FullName).Status.ToString()
if ($signature -ne 'NotSigned') { throw 'The preview manifest must match the actual installer signature.' }
@{
    installer = $installer.Name
    version = $version
    architecture = 'x64'
    signature = $signature
    installedAndReinstalled = $true
    launchAndReopenPassed = $true
    uninstalled = $true
    appDataRetained = $true
    baselineAppPreserved = $true
    productionCoexistencePassed = $true
} | ConvertTo-Json
