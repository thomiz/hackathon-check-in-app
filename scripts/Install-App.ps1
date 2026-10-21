[CmdletBinding()]
param(
    [switch]$SkipImages
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
    & "$PSScriptRoot\Install-Prerequisites.ps1" -CheckOnly
    if (-not $?) { throw 'Prerequisite checks failed.' }
    $version = & node.exe -p 'process.versions.node'
    if ($LASTEXITCODE -ne 0 -or [version]$version -lt [version]'18.17.0') {
        throw 'Node.js 18.17 or newer is required; use a maintained Node.js LTS release for deployment.'
    }
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Locked dependency installation failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' }
    & npm.cmd run fhir:build
    if ($LASTEXITCODE -ne 0) { throw 'FHIR compilation failed.' }
    & npm.cmd run fhir:package
    if ($LASTEXITCODE -ne 0) { throw 'FHIR package creation failed.' }
    if (-not (Test-Path -LiteralPath '.env')) {
        & npm.cmd run configure
        if ($LASTEXITCODE -ne 0) { throw 'Initial configuration failed.' }
    }
    & docker.exe compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Deployment configuration validation failed.' }
    if (-not $SkipImages) {
        & docker.exe compose pull
        if ($LASTEXITCODE -ne 0) { throw 'Blaze FHIR server image download failed.' }
    }
    Write-Host 'Dependencies and build artifacts are installed. Services have not been started.'
    Write-Host 'Follow README.md to create the Blaze host data directory, start Blaze and verify application health.'
} finally {
    Pop-Location
}
