Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$source = Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\scripts\Ssh-Monitoring.ps1') -Raw
$tokens = $null; $parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count) { throw "PowerShell syntax errors: $parseErrors" }

# Run the real helper logic with simulated Windows cmdlets and sshd.
$fixture = [scriptblock]::Create($source.Replace(
    '$sshd = Join-Path $env:WINDIR ''System32\OpenSSH\sshd.exe''',
    '$sshd = ''Test-Sshd'''
).Replace('    exit', '    return'))
$script:events = @()
$script:rules = @()
$script:password = 'no'
$script:listener = $true
$script:active = $true
$script:administrator = $true
$script:port = '22'
$script:program = 'Any'

function New-Object {
    param([string]$TypeName, $ArgumentList)
    if ($TypeName -eq 'System.Text.UTF8Encoding') { return [System.Text.UTF8Encoding]::new($false) }
    $principal = [pscustomobject]@{}
    $principal | Add-Member -MemberType ScriptMethod -Name IsInRole -Value { param($role) return $script:administrator }
    return $principal
}
function Test-Path { param($LiteralPath) return ($LiteralPath -eq 'Test-Sshd') }
function Test-Sshd { param([switch]$T) $global:LASTEXITCODE = 0; "passwordauthentication $script:password" }
function Get-NetIPAddress {
    param($InterfaceIndex, $AddressFamily)
    [pscustomobject]@{ IPAddress = '192.168.137.1'; AddressState = $(if ($script:active) { 'Preferred' } else { 'Invalid' }) }
}
function Get-NetAdapter {
    param([switch]$IncludeHidden)
    [pscustomobject]@{ InterfaceIndex = 12; Name = 'Test hotspot'; Status = 'Up' }
}
function Get-NetFirewallRule {
    param($PolicyStore, $Direction, $Action, $ErrorAction)
    $script:rules
}
function Get-NetFirewallPortFilter {
    param([Parameter(ValueFromPipeline)]$Rule)
    process { [pscustomobject]@{ InstanceID = $Rule.Name; Protocol = 'TCP'; LocalPort = @($script:port) } }
}
function Get-NetFirewallApplicationFilter {
    param([Parameter(ValueFromPipeline)]$Rule)
    process {
        [pscustomobject]@{
            InstanceID = $Rule.Name
            Program = $(if ($Rule.Name -eq 'Hackathon-SSH-Monitoring') { 'Any' } else { $script:program })
        }
    }
}
function Get-NetFirewallServiceFilter {
    param([Parameter(ValueFromPipeline)]$Rule)
    process { [pscustomobject]@{ InstanceID = $Rule.Name; Service = 'Any' } }
}
function Get-NetFirewallAddressFilter {
    param([Parameter(ValueFromPipeline)]$Rule)
    process { [pscustomobject]@{ InstanceID = $Rule.Name; RemoteAddress = @('192.168.137.2'); LocalAddress = @('192.168.137.1') } }
}
function Get-NetFirewallInterfaceFilter {
    param([Parameter(ValueFromPipeline)]$Rule)
    process { [pscustomobject]@{ InstanceID = $Rule.Name; InterfaceAlias = @('Test hotspot') } }
}
function New-NetFirewallRule {
    param($Name, $DisplayName, $Direction, $Action, $Protocol, $LocalPort, $Profile, $InterfaceAlias, $LocalAddress, $RemoteAddress)
    if ($LocalPort -ne 22 -or $InterfaceAlias -ne 'Test hotspot' -or $LocalAddress -ne '192.168.137.1' -or $RemoteAddress -ne '192.168.137.2') { throw 'Incorrect firewall scope.' }
    $script:events += 'create'
    $script:rules += [pscustomobject]@{ Name = $Name; Enabled = 'True'; Profile = 'Any' }
}
function Remove-NetFirewallRule {
    param([Parameter(ValueFromPipeline)]$Rule)
    process { $script:events += 'remove'; $script:rules = @($script:rules | Where-Object Name -ne $Rule.Name) }
}
function Disable-NetFirewallRule {
    param([Parameter(ValueFromPipeline)]$Rule, $Name)
    process {
        $script:events += 'disable'
        $target = $(if ($Rule) { $Rule.Name } else { $Name })
        foreach ($entry in $script:rules) { if ($entry.Name -eq $target) { $entry.Enabled = 'False' } }
    }
}
function Start-Service { param($Name) $script:events += 'start' }
function Stop-Service { param($Name) $script:events += 'stop' }
function Get-Service { param($Name) [pscustomobject]@{ Status = 'Running' } }
function Get-NetTCPConnection {
    param($State, $LocalPort)
    if ($script:listener) { [pscustomobject]@{ LocalAddress = '0.0.0.0' } }
}
function Enable-Fixture {
    & $fixture -Action Enable -InterfaceIndex 12 -LocalAddress '192.168.137.1' -RemoteAddress '192.168.137.2'
}
function Assert-Events([string]$expected) {
    if (($script:events -join ',') -ne $expected) { throw "Expected $expected; got $($script:events -join ',')." }
    $script:events = @()
}
function Assert-Rejected([scriptblock]$operation, [string]$message) {
    $rejected = $false
    try { & $operation } catch {
        if ($_.Exception.Message -notlike "*$message*") { throw }
        $rejected = $true
    }
    if (-not $rejected) { throw "Expected rejection: $message" }
}

Enable-Fixture
Assert-Events 'create,start'
Enable-Fixture
Assert-Events 'remove,create,start'
& $fixture -Action Disable
Assert-Events 'disable'
& $fixture -Action Disable -StopService
Assert-Events 'disable,stop'
$script:rules = @()
$script:password = 'yes'
Assert-Rejected { Enable-Fixture } 'PasswordAuthentication no'
Assert-Events ''
$script:password = 'no'
$script:active = $false
Assert-Rejected { Enable-Fixture } 'no longer active'
Assert-Events ''
$script:active = $true
$script:rules = @([pscustomobject]@{ Name = 'Other-SSH-Rule'; Enabled = 'True'; Profile = 'Any' })
Assert-Rejected { Enable-Fixture } 'Other enabled inbound rules'
Assert-Events ''
$script:port = 'Any'
Assert-Rejected { Enable-Fixture } 'Other enabled inbound rules'
Assert-Events ''
$script:port = '20-30'
Assert-Rejected { Enable-Fixture } 'Other enabled inbound rules'
Assert-Events ''
$script:port = '22'
$script:program = 'C:\OtherProgram.exe'
Enable-Fixture
Assert-Events 'create,start'
$script:program = 'Any'
$script:rules = @()
$script:listener = $false
Assert-Rejected { Enable-Fixture } 'No SSH listener'
Assert-Events 'create,start,disable'
$script:administrator = $false
Assert-Rejected { Enable-Fixture } 'Administrator'
Assert-Events ''
$script:administrator = $true
Assert-Rejected { & $fixture -Action Enable -InterfaceIndex 12 -LocalAddress '192.168.137.1' -RemoteAddress '0.0.0.0/0' } 'never all networks'
Assert-Events ''
Assert-Rejected { & $fixture -Action Enable -InterfaceIndex 12 -LocalAddress '192.168.137.1' -RemoteAddress "192.168.137.2'; Stop-Service sshd" } 'Invalid remote IPv4'
Assert-Events ''
Write-Host 'PASS: PowerShell syntax, scoped/idempotent enable, disable, authentication, stale network, conflicting rules, failure cleanup and elevation checks. No Windows state was changed.'
