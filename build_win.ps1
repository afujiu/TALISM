param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) {
    $scriptDir = (Get-Location).Path
}
Set-Location $scriptDir

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    throw "Node.js is required. Install Node.js and ensure 'node' is available in PATH."
}

$npmCommand = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    throw "npm is required. Install npm with Node.js."
}

$packageMergeScript = @"
const fs = require('fs');
const path = require('path');
const root = process.argv[2];

const sveltePkgPath = path.join(root, 'svelte', 'package.json');
const tauriPkgPath = path.join(root, 'tauri', 'package.json');

const sveltePkg = JSON.parse(fs.readFileSync(sveltePkgPath, 'utf8'));
const tauriPkg = JSON.parse(fs.readFileSync(tauriPkgPath, 'utf8'));

for (const key of ['dependencies', 'devDependencies', 'scripts']) {
  if (sveltePkg[key] && typeof sveltePkg[key] === 'object' && !Array.isArray(sveltePkg[key])) {
    if (!tauriPkg[key] || typeof tauriPkg[key] !== 'object' || Array.isArray(tauriPkg[key])) {
      tauriPkg[key] = {};
    }
    for (const [name, value] of Object.entries(sveltePkg[key])) {
      if (tauriPkg[key][name] === undefined) {
        tauriPkg[key][name] = value;
      }
    }
  }
}

fs.writeFileSync(tauriPkgPath, JSON.stringify(tauriPkg, null, 2) + '\n', 'utf8');
"@

$packageMergeScript | & $nodeCommand.Source - $scriptDir

$srcDir = Join-Path $scriptDir 'tauri/src'
if (Test-Path $srcDir) {
    Remove-Item -Recurse -Force $srcDir
}
New-Item -ItemType Directory -Path $srcDir -Force | Out-Null

$sourceDir = Join-Path $scriptDir 'svelte/src'
Copy-Item -Path (Join-Path $sourceDir '*') -Destination $srcDir -Recurse -Force

Set-Location (Join-Path $scriptDir 'tauri')
& $npmCommand.Source install
& $npmCommand.Source run tauri -- build

$distDir = Join-Path $scriptDir 'dist'
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

$artifactCandidates = @(
    Join-Path $scriptDir 'tauri/src-tauri/target/release/bundle/msi/*.msi',
    Join-Path $scriptDir 'tauri/src-tauri/target/release/bundle/nsis/*.exe',
    Join-Path $scriptDir 'tauri/src-tauri/target/release/bundle/dmg/*.dmg'
)

$artifact = $null
foreach ($pattern in $artifactCandidates) {
    $matches = @(Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    if ($matches.Count -gt 0) {
        $artifact = $matches[0]
        break
    }
}

if (-not $artifact) {
    throw "No build artifact found. Check the Tauri build output under tauri/src-tauri/target/release/bundle."
}

$artifactName = [System.IO.Path]::GetFileName($artifact.FullName)
$destinationPath = Join-Path $distDir $artifactName
Copy-Item -Path $artifact.FullName -Destination $destinationPath -Force

Write-Host "Build artifact copied to $destinationPath"
