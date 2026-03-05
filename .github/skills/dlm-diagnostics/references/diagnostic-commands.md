# Diagnostic Quick Commands Cheat Sheet

Quick-reference PowerShell commands for ad-hoc DLM investigations. For structured troubleshooting, use the symptom-specific reference guides linked from SKILL.md.

## Connection

```powershell
Connect-IPPSSession                              # Purview / Compliance PowerShell
Connect-ExchangeOnline                           # Exchange Online PowerShell
```

## Retention Policy

```powershell
Get-RetentionCompliancePolicy "<name>" | FL *
Get-RetentionCompliancePolicy "<name>" -DistributionDetail
Get-RetentionCompliancePolicy "<name>" | FL AdaptiveScopeLocation
```

## Retention Rules & Labels

```powershell
Get-RetentionComplianceRule -Policy "<name>" | FL *
Get-ComplianceTag | FL Name, RetentionDuration, RetentionAction
```

## Mailbox Holds

```powershell
Get-Mailbox <user> | FL InPlaceHolds, LitigationHoldEnabled, ComplianceTagHoldApplied, DelayHoldApplied, DelayReleaseHoldApplied, RetentionPolicy, RetentionHoldEnabled, ElcProcessingDisabled
```

## Archive

```powershell
Get-Mailbox <user> | FL ArchiveStatus, AutoExpandingArchiveEnabled, ArchiveQuota
Get-MailboxStatistics <user> -Archive | FL TotalItemSize, TotalDeletedItemSize
Get-Mailbox <user> | Select -ExpandProperty MailboxLocations
```

## MRM

```powershell
Get-RetentionPolicy "<name>" | FL RetentionPolicyTagLinks
Get-RetentionPolicyTag | FL Name, Type, RetentionAction, AgeLimitForRetention, RetentionEnabled
```

## Recoverable Items

```powershell
Get-MailboxFolderStatistics <user> -FolderScope RecoverableItems | FL Name, FolderSize, ItemsInFolder
```

## Inactive Mailboxes

```powershell
Get-Mailbox -InactiveMailboxOnly | FL UserPrincipalName, InPlaceHolds, LitigationHoldEnabled
Get-Mailbox -SoftDeletedMailbox | FL UserPrincipalName, WhenSoftDeleted
```

## Advanced Diagnostics

```powershell
# ELC last success timestamp
$logs = Export-MailboxDiagnosticLogs <user> -ExtendedProperties
([xml]$logs.MailboxLog).Properties.MailboxTable.Property | Where-Object {$_.Name -eq "ELCLastSuccessTimestamp"}

# DumpsterExpiration last success timestamp
([xml]$logs.MailboxLog).Properties.MailboxTable.Property | Where-Object {$_.Name -eq "DumpsterExpirationLastSuccessRunTimestamp"}

# MRM error logs
(Export-MailboxDiagnosticLogs <user> -ComponentName MRM).MailboxLog

# TracingFAI (tag processing errors)
(Export-MailboxDiagnosticLogs <user> -ComponentName TracingFai).MailboxLog | ConvertFrom-Json

# DumpsterExpiration logs
(Export-MailboxDiagnosticLogs <user> -ComponentName DumpsterExpiration).MailboxLog

# Archive connectivity + MRM config validation
Test-ArchiveConnectivity <user> -IncludeArchiveMRMConfiguration

# Ghosted folder detection
Get-MailboxFolderStatistics <archiveGUID> | Where-Object {$_.LastMovedTimeStamp -ne $null -and $_.ItemsInFolder -ne 0}
```

## Adaptive Scopes

```powershell
Get-AdaptiveScope "<name>" | FL Name, LocationType, FilterQuery, WhenCreated
Get-Recipient -Filter "<same filter from adaptive scope>" -ResultSize Unlimited | Measure-Object
Get-User -Filter "<same filter from adaptive scope>" -ResultSize Unlimited | Measure-Object
```

> **NOTE:** `Get-AdaptiveScopeMembers` is not available via the MCP tool. This command must be executed manually by the admin in a PowerShell session.

```powershell
Get-AdaptiveScopeMembers -Identity "<name>"
```

## Auto-Apply Retention Labels

```powershell
# List auto-apply policies
Get-RetentionCompliancePolicy | Where-Object {$_.Type -eq "ApplyTag"} | FL Name, Enabled, Mode, DistributionStatus

# Auto-apply rule with matching criteria
Get-RetentionComplianceRule -Policy "<name>" | FL ContentMatchQuery, ContentContainsSensitiveInformation, PublishComplianceTag

# Linked retention label
Get-ComplianceTag | FL Name, Guid, RetentionDuration, RetentionAction
```

> **NOTE:** `Get-Label` is not available via the MCP tool. This command must be executed manually by the admin in a PowerShell session.

```powershell
Get-Label | Format-Table DisplayName, Name, Guid
```

## Self-Help Diagnostics

- https://aka.ms/PillarArchiveMailbox
- https://aka.ms/PillarRetentionPolicy
