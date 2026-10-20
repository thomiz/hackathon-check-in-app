[CmdletBinding()]
param(
    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    throw 'This installer supports Windows only.'
}

function Update-ProcessPath {
    $paths = @(
        $env:Path
        [Environment]::GetEnvironmentVariable('Path', 'Machine')
        [Environment]::GetEnvironmentVariable('Path', 'User')
    )
    $env:Path = ($paths | Where-Object { $_ }) -join ';'
}

function Find-Executable {
    param(
        [string]$Name,
        [string[]]$FallbackPaths = @()
    )

    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($command) {
        return $command.Source
    }
    foreach ($path in $FallbackPaths) {
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            return $path
        }
    }
    return $null
}

Update-ProcessPath
$requirements = @(
    @{
        Label = 'Git'
        Name = 'git.exe'
        Package = 'Git.Git'
        FallbackPaths = @("$env:ProgramFiles\Git\cmd\git.exe")
    }
    @{
        Label = 'Node.js LTS (includes npm)'
        Name = 'node.exe'
        Package = 'OpenJS.NodeJS.LTS'
        FallbackPaths = @("$env:ProgramFiles\nodejs\node.exe")
    }
    @{
        Label = 'Docker Desktop'
        Name = 'docker.exe'
        Package = 'Docker.DockerDesktop'
        FallbackPaths = @("$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe")
    }
)

$missing = @()
foreach ($requirement in $requirements) {
    $executable = Find-Executable -Name $requirement.Name -FallbackPaths $requirement.FallbackPaths
    if ($executable) {
        Write-Host "$($requirement.Label): found at $executable"
        $env:Path = (Split-Path -Parent $executable) + ';' + $env:Path
        continue
    }
    if ($CheckOnly) {
        $missing += $requirement.Label
        continue
    }

    $winget = Find-Executable -Name 'winget.exe'
    if (-not $winget) {
        throw 'WinGet is missing. Install or update Microsoft App Installer, reopen PowerShell, and rerun this script.'
    }
    Write-Host "Installing $($requirement.Label). Installer prompts or elevation may be required."
    & $winget install --id $requirement.Package --exact --source winget
    $installExitCode = $LASTEXITCODE
    if ($installExitCode -ne 0) {
        throw "Installation of $($requirement.Label) returned exit code $installExitCode. Resolve any installer or restart requirements, then rerun."
    }
    Update-ProcessPath
    $executable = Find-Executable -Name $requirement.Name -FallbackPaths $requirement.FallbackPaths
    if (-not $executable) {
        throw "$($requirement.Label) is still unavailable. Open a new PowerShell window after any required restart and rerun."
    }
    $env:Path = (Split-Path -Parent $executable) + ';' + $env:Path
}

if ($missing.Count -gt 0) {
    throw "Missing prerequisites: $($missing -join ', '). Rerun without -CheckOnly to install them."
}

$git = Find-Executable -Name 'git.exe' -FallbackPaths $requirements[0].FallbackPaths
& $git --version
if ($LASTEXITCODE -ne 0) { throw 'Git could not run.' }

$node = Find-Executable -Name 'node.exe' -FallbackPaths $requirements[1].FallbackPaths
& $node --version
if ($LASTEXITCODE -ne 0) { throw 'Node.js could not run.' }

$npm = Find-Executable -Name 'npm.cmd' -FallbackPaths @(
    (Join-Path (Split-Path -Parent $node) 'npm.cmd')
)
if (-not $npm) { throw 'npm is missing. Repair the Node.js LTS installation and rerun.' }
& $npm --version
if ($LASTEXITCODE -ne 0) { throw 'npm could not run.' }

$docker = Find-Executable -Name 'docker.exe' -FallbackPaths $requirements[2].FallbackPaths
& $docker compose version
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose is unavailable. Repair Docker Desktop and rerun.' }

& $docker info
if ($LASTEXITCODE -ne 0) {
    throw 'Docker engine is not ready. Start Docker Desktop, complete its WSL 2 setup, switch to Linux containers, and rerun. See README.md for restart and licensing requirements.'
}
$containerOS = & $docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) { throw 'Could not verify the Docker container platform.' }
if (($containerOS -join '').Trim() -ne 'linux') {
    throw 'Docker Desktop must use Linux containers for the planned Medplum deployment.'
}

Write-Host 'Windows prerequisites are available and the Docker Linux engine is responsive.'
Write-Host 'Next run scripts\Install-App.ps1 to install locked application dependencies and pull Medplum images.'
Write-Host 'No npm packages, Medplum images, databases, or application services have been installed or started by this prerequisite script.'
