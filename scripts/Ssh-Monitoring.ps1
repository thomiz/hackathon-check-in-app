[CmdletBinding()]
param(
    [ValidateSet('Status', 'Enable', 'Disable')][string]$Action = 'Status',
    [int]$InterfaceIndex,
    [string]$LocalAddress,
    [string]$RemoteAddress,
    [switch]$StopService
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$ruleName = 'Hackathon-SSH-Monitoring'
$sshd = Join-Path $env:WINDIR 'System32\OpenSSH\sshd.exe'

function Get-SshRules {
    $rules = @(Get-NetFirewallRule -PolicyStore ActiveStore -Direction Inbound -Action Allow -ErrorAction Stop)
    $ports = @{}
    foreach ($filter in @($rules | Get-NetFirewallPortFilter -ErrorAction Stop)) { $ports[$filter.InstanceID] = $filter }
    $candidates = @(
      foreach ($rule in $rules) {
        if (-not $ports.ContainsKey($rule.Name)) { throw "Cannot read port filter for $($rule.Name)." }
        $port = $ports[$rule.Name]
        if ("$($port.Protocol)" -notin @('TCP', '6', 'Any', '256')) { continue }
        $matchesPort = $false
        foreach ($entry in @($port.LocalPort)) {
            if ($entry -eq 'Any' -or $entry -eq '22') { $matchesPort = $true }
            elseif ($entry -match '^(\d+)-(\d+)$' -and [int]$Matches[1] -le 22 -and [int]$Matches[2] -ge 22) { $matchesPort = $true }
        }
        if (-not $matchesPort) { continue }
        $rule
      }
    )
    $applications = @{}; $services = @{}; $addresses = @{}; $interfaces = @{}
    foreach ($filter in @($candidates | Get-NetFirewallApplicationFilter -ErrorAction Stop)) { $applications[$filter.InstanceID] = $filter }
    foreach ($filter in @($candidates | Get-NetFirewallServiceFilter -ErrorAction Stop)) { $services[$filter.InstanceID] = $filter }
    foreach ($filter in @($candidates | Get-NetFirewallAddressFilter -ErrorAction Stop)) { $addresses[$filter.InstanceID] = $filter }
    foreach ($filter in @($candidates | Get-NetFirewallInterfaceFilter -ErrorAction Stop)) { $interfaces[$filter.InstanceID] = $filter }
    foreach ($rule in $candidates) {
        foreach ($map in @($applications, $services, $addresses, $interfaces)) {
            if (-not $map.ContainsKey($rule.Name)) { throw "Cannot read firewall scope for $($rule.Name)." }
        }
        $port = $ports[$rule.Name]
        $application = $applications[$rule.Name]
        $program = [Environment]::ExpandEnvironmentVariables("$($application.Program)")
        if ($program -ne 'Any' -and $program -ne $sshd) { continue }
        $serviceFilter = $services[$rule.Name]
        if ("$($serviceFilter.Service)" -notin @('Any', 'sshd')) { continue }
        $address = $addresses[$rule.Name]
        $interface = $interfaces[$rule.Name]
        [pscustomobject]@{
            name = $rule.Name; enabled = ("$($rule.Enabled)" -eq 'True'); profile = "$($rule.Profile)"
            remoteAddress = @($address.RemoteAddress); localAddress = @($address.LocalAddress)
            interfaceAlias = @($interface.InterfaceAlias); localPort = @($port.LocalPort)
        }
    }
}

function Get-KeyAuthentication {
    if (-not (Test-Path -LiteralPath $sshd)) { return 'OpenSSH not installed' }
    $output = & $sshd -T 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Cannot validate sshd configuration: $output" }
    $setting = @($output | Where-Object { "$_" -match '^passwordauthentication ' })
    if ($setting.Count -ne 1) { throw 'sshd did not report PasswordAuthentication.' }
    return ("$($setting[0])" -split ' ')[1]
}

if ($Action -eq 'Status') {
    $service = Get-Service | Where-Object Name -eq 'sshd'
    $profiles = @(Get-NetConnectionProfile)
    $adapters = @(Get-NetAdapter -IncludeHidden)
    $interfaces = @(
        foreach ($ip in @(Get-NetIPAddress -AddressFamily IPv4)) {
            if ($ip.IPAddress -match '^(127\.|169\.254\.)' -or "$($ip.AddressState)" -ne 'Preferred' -or $ip.PrefixLength -lt 1) { continue }
            $adapter = $adapters | Where-Object InterfaceIndex -eq $ip.InterfaceIndex | Select-Object -First 1
            if (-not $adapter -or "$($adapter.Status)" -ne 'Up') { continue }
            $profile = $profiles | Where-Object InterfaceIndex -eq $ip.InterfaceIndex | Select-Object -First 1
            [pscustomobject]@{
                index = [int]$ip.InterfaceIndex; alias = $ip.InterfaceAlias; address = $ip.IPAddress
                prefix = [int]$ip.PrefixLength; virtual = (-not $adapter.HardwareInterface)
                profile = $(if ($profile) { "$($profile.NetworkCategory)" } else { 'Unknown' })
            }
        }
    )
    $fingerprints = @(
        $keyDirectory = Join-Path $env:ProgramData 'ssh'
        $keys = @()
        if (Test-Path -LiteralPath $keyDirectory) { $keys = @(Get-ChildItem -LiteralPath $keyDirectory -Filter 'ssh_host_*_key.pub') }
        foreach ($key in $keys) {
            $fingerprint = & (Join-Path $env:WINDIR 'System32\OpenSSH\ssh-keygen.exe') -lf $key.FullName
            if ($LASTEXITCODE -ne 0) { throw 'Cannot read SSH host-key fingerprint.' }
            "$fingerprint"
        }
    )
    [pscustomobject]@{
        service = $(if ($service) { "$($service.Status)" } else { 'Not installed' })
        passwordAuthentication = Get-KeyAuthentication
        interfaces = $interfaces; rules = @(Get-SshRules); fingerprints = $fingerprints
    } | ConvertTo-Json -Depth 6 -Compress
    exit
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this command in PowerShell as Administrator on the registration PC.'
}
if ($Action -eq 'Disable') {
    $rule = @(Get-NetFirewallRule | Where-Object Name -eq $ruleName)
    if ($rule.Count) { $rule | Disable-NetFirewallRule }
    if ($StopService) {
        Write-Warning 'Stopping sshd disconnects all SSH users, not just monitoring.'
        Stop-Service sshd
    }
    Write-Host 'Monitoring firewall rule disabled. Other SSH rules and startup settings were not changed.'
    exit
}
if ($StopService) { throw '-StopService is only valid with Disable.' }
if (-not $InterfaceIndex -or -not $LocalAddress -or -not $RemoteAddress) { throw 'Select an interface, local IPv4 address and remote IPv4 address/subnet.' }
$ipv4 = '^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$'
if ($LocalAddress -notmatch $ipv4) { throw 'Invalid local IPv4 address.' }
$parts = $RemoteAddress.Split('/')
if ($parts.Count -gt 2 -or $parts[0] -notmatch $ipv4) { throw 'Invalid remote IPv4 address/subnet.' }
if ($parts.Count -eq 2 -and ($parts[1] -notmatch '^\d{1,2}$' -or [int]$parts[1] -lt 1 -or [int]$parts[1] -gt 32)) { throw 'Use a subnet prefix from 1 to 32, never all networks.' }
$ip = @(Get-NetIPAddress -InterfaceIndex $InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -eq $LocalAddress -and "$($_.AddressState)" -eq 'Preferred' })
$adapter = Get-NetAdapter -IncludeHidden | Where-Object InterfaceIndex -eq $InterfaceIndex | Select-Object -First 1
if ($ip.Count -ne 1 -or -not $adapter -or "$($adapter.Status)" -ne 'Up' -or $LocalAddress -match '^(127\.|169\.254\.)') { throw 'The selected address/interface is no longer active. Refresh the dashboard.' }
if ((Get-KeyAuthentication) -ne 'no') { throw 'Set PasswordAuthentication no in sshd_config and provision authorized keys before enabling monitoring.' }
$otherRules = @(Get-SshRules | Where-Object { $_.enabled -and $_.name -ne $ruleName })
if ($otherRules.Count) {
    throw "Other enabled inbound rules may allow SSH: $($otherRules.name -join ', '). Review and disable conflicting rules explicitly; this helper will not change them."
}
$existing = @(Get-NetFirewallRule | Where-Object Name -eq $ruleName)
if ($existing.Count) { $existing | Remove-NetFirewallRule }
New-NetFirewallRule -Name $ruleName -DisplayName 'Hackathon SSH monitoring' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 22 -Profile Any -InterfaceAlias $adapter.Name -LocalAddress $LocalAddress -RemoteAddress $RemoteAddress | Out-Null
try {
    Start-Service sshd
    if ((Get-Service sshd).Status -ne 'Running') { throw 'sshd did not start.' }
    if (-not @(Get-NetTCPConnection -State Listen -LocalPort 22 | Where-Object { $_.LocalAddress -in @('0.0.0.0', '::', $LocalAddress) }).Count) { throw 'No SSH listener is available on the selected address on port 22.' }
    if (-not @(Get-SshRules | Where-Object { $_.name -eq $ruleName -and $_.enabled }).Count) { throw 'The monitoring rule is not enabled in the active firewall policy.' }
} catch {
    Disable-NetFirewallRule -Name $ruleName
    throw
}
Write-Host 'sshd is running and the restricted monitoring rule is enabled. Test port 22 from the monitoring PC.'
Write-Host 'Service startup settings and network profiles were not changed.'
