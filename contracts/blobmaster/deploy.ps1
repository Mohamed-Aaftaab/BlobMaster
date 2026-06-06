#!/usr/bin/env pwsh
# deploy.ps1 — Deploy BlobMaster Move contract to Sui Testnet
# Usage: .\deploy.ps1
# Requires: Sui CLI (suiup install sui@testnet) and testnet SUI in wallet

$ErrorActionPreference = "Stop"
$env:PATH = "$env:LOCALAPPDATA\bin;" + $env:PATH

Write-Host "==> BlobMaster Deploy Script" -ForegroundColor Cyan
Write-Host "==> Checking Sui CLI..."
sui --version

Write-Host "`n==> Current wallet address:"
$addr = (sui client active-address 2>&1).Trim()
Write-Host $addr

Write-Host "`n==> Checking gas balance..."
sui client gas

Write-Host "`n==> Publishing BlobMaster contract to testnet..."
$result = sui client publish --gas-budget 100000000 2>&1
Write-Host $result

# Extract the package ID from publish output
$packageIdLine = $result | Select-String "PackageID:"
if ($packageIdLine) {
    $packageId = ($packageIdLine -split "PackageID:\s*")[1].Trim()
    Write-Host "`n==> Package ID: $packageId" -ForegroundColor Green
    
    # Auto-update the SDK networks.ts
    $networksFile = "$PSScriptRoot\..\..\blobmaster-sdk\src\config\networks.ts"
    if (Test-Path $networksFile) {
        $content = Get-Content $networksFile -Raw
        $updated = $content -replace "packageId: '0x[0-9a-f]{63,64}'.*// testnet", "packageId: '$packageId' // testnet"
        Set-Content $networksFile $updated
        Write-Host "==> Updated networks.ts with real packageId" -ForegroundColor Green
    }
    
    # Write packageId to a file for reference
    Set-Content "$PSScriptRoot\deployed_package_id.txt" $packageId
    Write-Host "==> Saved to deployed_package_id.txt"
} else {
    Write-Host "`n[!] Could not extract PackageID from output — check output above" -ForegroundColor Yellow
}
