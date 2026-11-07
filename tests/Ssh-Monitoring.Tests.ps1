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
).Replace(
    '(Join-Path $env:WINDIR ''System32\OpenSSH\ssh-keygen.exe'')',
    'Test-SshKeygen'
).Replace('    exit', '    return'))
$script:events = @()
$script:rules = @()
$script:password = 'no'
$script:listener = $true
$script:active = $true
$script:administrator = $true
$script:port = '22'
$script:program = 'Any'
$script:keys = @()
$script:directoryDenied = $false
$script:configDenied = $false
$script:keyFailure = 'none'

function New-Object {
    param([string]$TypeName, $ArgumentList)
    if ($TypeName -eq 'System.Text.UTF8Encoding') { return [System.Text.UTF8Encoding]::new($false) }
    if ($TypeName -eq 'System.Collections.Generic.List[string]') { return ,([System.Collections.Generic.List[string]]::new()) }
    $principal = [pscustomobject]@{}
    $principal | Add-Member -MemberType ScriptMethod -Name IsInRole -Value { param($role) return $script:administrator }
    return $principal
}
function Test-Path { param($LiteralPath) return $true }
function Get-ChildItem {
    param($LiteralPath, $Filter)
    if ($script:directoryDenied) { throw 'Access to host-key directory denied.' }
    $script:keys
}
function Test-SshKeygen {
    param([switch]$lf, [string]$Path)
    if ($Path -like '*ecdsa*') {
        if ($script:keyFailure -eq 'stderr') {
            & powershell.exe -NoProfile -NonInteractive -Command '[Console]::Error.WriteLine(''ssh-keygen: Permission denied''); exit 1'
            return
        }
        if ($script:keyFailure -eq 'exit') {
            $global:LASTEXITCODE = 1
            return 'Invalid public key.'
        }
    }
    $global:LASTEXITCODE = 0
    '256 SHA256:fixture test (ED25519)'
}
function Test-Sshd {
    param([switch]$T)
    if ($script:configDenied) { throw 'sshd_config: Permission denied' }
    $global:LASTEXITCODE = 0
    "passwordauthentication $script:password"
}
function Get-NetConnectionProfile { [pscustomobject]@{ InterfaceIndex = 12; NetworkCategory = 'Public' } }
function Get-NetIPAddress {
    param($InterfaceIndex, $AddressFamily)
    [pscustomobject]@{ IPAddress = '192.168.137.1'; InterfaceIndex = 12; InterfaceAlias = 'Test hotspot'; PrefixLength = 24; AddressState = $(if ($script:active) { 'Preferred' } else { 'Invalid' }) }
}
function Get-NetAdapter {
    param([switch]$IncludeHidden)
    [pscustomobject]@{ InterfaceIndex = 12; Name = 'Test hotspot'; Status = 'Up'; HardwareInterface = $false }
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
function Get-Service { param($Name) [pscustomobject]@{ Name = 'sshd'; Status = 'Running' } }
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
$script:rules = @([pscustomobject]@{ Name = 'Other-SSH-Rule'; Enabled = 'True'; Profile = 'Any' })
$script:administrator = $false
$report = & $fixture -Action Status | ConvertFrom-Json
if ($report.warnings.Count -ne 0 -or $report.fingerprints.Count -ne 0 -or $report.passwordAuthentication -ne 'no') { throw 'Incorrect empty-key status.' }
$script:keys = @(
    [pscustomobject]@{ Name = 'ssh_host_ecdsa_key.pub'; FullName = 'C:\Test\ssh_host_ecdsa_key.pub' },
    [pscustomobject]@{ Name = 'ssh_host_ed25519_key.pub'; FullName = 'C:\Test\ssh_host_ed25519_key.pub' }
)
foreach ($failure in @('none', 'stderr', 'exit')) {
    $script:keyFailure = $failure
    $report = & $fixture -Action Status | ConvertFrom-Json
    $expectedWarnings = $(if ($failure -eq 'none') { 0 } else { 1 })
    if ($report.warnings.Count -ne $expectedWarnings -or $report.fingerprints.Count -ne (2 - $expectedWarnings)) { throw "Incorrect fingerprint status for $failure." }
    if ($failure -ne 'none' -and $report.warnings[0] -notlike '*ssh_host_ecdsa_key.pub*') { throw 'Missing failed key name.' }
    if ($failure -eq 'stderr' -and $report.warnings[0] -notlike '*Permission denied*') { throw "Missing native permission error: $($report.warnings[0])" }
    if ($report.interfaces.Count -ne 1 -or $report.rules.Count -ne 1 -or $report.service -ne 'Running') { throw 'Key failure hid available status.' }
    Assert-Events ''
}
$script:directoryDenied = $true
$script:configDenied = $true
$report = & $fixture -Action Status | ConvertFrom-Json
if ($report.warnings.Count -ne 2 -or $report.fingerprints.Count -ne 0 -or $report.passwordAuthentication -ne 'Unknown') { throw 'Missing directory/configuration warnings.' }
Assert-Events ''
$script:administrator = $true
Assert-Rejected { Enable-Fixture } 'sshd_config: Permission denied'
Assert-Events ''
Write-Host 'PASS: PowerShell syntax, scoped/idempotent enable, disable, authentication, stale network, conflicting rules, failure cleanup and elevation checks. No Windows state was changed.'
