# Items Not Moving from Primary Mailbox to Archive

## Symptoms

- **Items not moving to archive:** User's primary mailbox is full or near quota, but items are not moving to the archive mailbox despite MRM archive policies being in place.
- **Archive not yet enabled:** Admin expects items to auto-archive, but the archive mailbox has never been enabled for the user — `ArchiveStatus` = None.
- **Archive requires license:** User does not have the required license (E3/E5 or Exchange Online Archiving add-on) to enable or use the archive mailbox.
- **Archive disabled — content at risk:** Admin disabled the archive mailbox and needs to re-enable it. If more than 30 days have passed since disabling, original archive content is permanently lost.
- **MFA not processing the mailbox:** Managed Folder Assistant has not run on the mailbox — `ELCLastSuccessTimestamp` is absent or stale (> 5 days).

---

## Data Collection

Execute all commands below to gather the complete diagnostic dataset. Replace `<UPN>` with the affected user's email address.

### 1.1 Mailbox & Archive Configuration

```powershell
Get-Mailbox <UPN> | FL DisplayName, ArchiveStatus, ArchiveGuid, ArchiveName, RetentionPolicy, RetentionHoldEnabled, ElcProcessingDisabled, StartDateForRetentionHold, EndDateForRetentionHold, IsShared, AccountDisabled, InPlaceHolds, LitigationHoldEnabled, ComplianceTagHoldApplied
```

### 1.2 Retention Policy Tags

```powershell
$policy = (Get-Mailbox <UPN>).RetentionPolicy
Get-RetentionPolicy $policy | Select -ExpandProperty RetentionPolicyTagLinks
Get-RetentionPolicyTag | Where-Object {$_.RetentionAction -eq "MoveToArchive"} | FL Name, Type, AgeLimitForRetention, RetentionEnabled
```

### 1.3 License Validation

```powershell
$plan = Get-MailboxPlan (Get-Mailbox <UPN>).MailboxPlan
$plan.PersistedCapabilities
```

### 1.4 Org-Level ELC Processing

```powershell
Get-OrganizationConfig | FL ElcProcessingDisabled
```

### 1.5 ELC Last Success & MRM Logs (Primary + Archive)

```powershell
$mbx = Get-Mailbox <UPN>
$primaryGuid = $mbx.ExchangeGuid
$archiveGuid = $mbx.ArchiveGuid

# ELC on primary
$logs = Export-MailboxDiagnosticLogs <UPN> -ExtendedProperties
$xmlprops = [xml]($logs.MailboxLog)
$xmlprops.Properties.MailboxTable.Property | Where-Object {$_.Name -eq "ELCLastSuccessTimestamp"} | Select-Object -ExpandProperty Value

# ELC on archive
$archiveLogs = Export-MailboxDiagnosticLogs $archiveGuid -ExtendedProperties
$archiveXml = [xml]($archiveLogs.MailboxLog)
$archiveXml.Properties.MailboxTable.Property | Where-Object {$_.Name -eq "ELCLastSuccessTimestamp"} | Select-Object -ExpandProperty Value

# MRM error logs
(Export-MailboxDiagnosticLogs <UPN> -ComponentName MRM).MailboxLog
```

### 1.6 Archive Connectivity & MRM Configuration (FAI)

```powershell
Test-ArchiveConnectivity <UPN> -IncludeArchiveMRMConfiguration | Select-Object -ExpandProperty Result
```

### 1.7 TracingFAI Errors

```powershell
$tracingFai = Export-MailboxDiagnosticLogs <UPN> -ComponentName TracingFai
$tracingFai.MailboxLog | ConvertFrom-Json
```

### 1.8 FAI Tag Consistency

```powershell
$config = Test-ArchiveConnectivity <UPN> -IncludeArchiveMRMConfiguration
$policyTags = ([xml]$config.PrimaryMRMConfiguration).UserConfiguration.Info.Data.PolicyTag
$archiveTags = ([xml]$config.PrimaryMRMConfiguration).UserConfiguration.Info.Data.ArchiveTag
$defaultArchiveTags = ([xml]$config.PrimaryMRMConfiguration).UserConfiguration.Info.Data.DefaultArchiveTag

$policyTags | Format-Table Name, Guid, IsVisible, OptedInto, Type
$archiveTags | Format-Table Name, Guid, IsVisible, OptedInto, Type
$defaultArchiveTags | Format-Table Name, Guid, IsVisible, OptedInto, Type
```

### 1.9 Active Move Requests

```powershell
Get-MoveRequest <UPN> -ErrorAction SilentlyContinue | FL Status, PercentComplete
```

### 1.10 Oversized Items Check

```powershell
Get-MailboxFolderStatistics <UPN> | Where-Object {$_.FolderSize -gt "150 MB"} | FL FolderPath, FolderSize, ItemsInFolder
```

---

## Diagnostic Analysis

Analyze the collected data against the following criteria. Flag each as ✅ (healthy) or ❌ (issue found).

| # | Check | Condition for ❌ |
|---|---|---|
| 1 | **Archive enabled** | `ArchiveStatus` = None |
| 2 | **MoveToArchive tag in policy** | No `RetentionPolicy` assigned, or policy has no tag with `RetentionAction` = MoveToArchive |
| 3 | **Retention hold** | `RetentionHoldEnabled` = True (MRM paused) |
| 4 | **ELC processing (mailbox)** | `ElcProcessingDisabled` = True |
| 5 | **ELC processing (org)** | Org-level `ElcProcessingDisabled` = True |
| 6 | **License** | `PersistedCapabilities` lacks `BPOS_S_Enterprise` (E3/E5) or `BPOS_S_Archive`/`BPOS_S_ArchiveAddOn` |
| 7 | **ELC last run (primary)** | `ELCLastSuccessTimestamp` > 5 days ago or absent |
| 8 | **ELC last run (archive)** | `ELCLastSuccessTimestamp` > 5 days ago or absent |
| 9 | **MRM errors** | MRM diagnostic logs contain errors (e.g., `MapiExceptionInvalidRecipients`) |
| 10 | **Account status** | `AccountDisabled` = True AND `IsShared` = False |
| 11 | **Archive connectivity** | `Test-ArchiveConnectivity` result does not contain "Successfully" |
| 12 | **TracingFAI errors** | Non-zero `Fs` entries (DumpsterQuotaTooSmall, RecipientCorrupt, CorruptComplianceEntry, etc.) |
| 13 | **FAI tag consistency** | FAI tags don't match `RetentionPolicyTagLinks` (stale/corrupt MRM config) |
| 14 | **Active MRS request** | Active move request with status ≠ Completed |
| 15 | **Oversized items** | Items > 150 MB present (MRM cannot auto-archive these) |

---

## Resolution & Remediation

Based on flagged issues from the diagnostic report, apply the corresponding resolution:

| ❌ Check | Root Cause | Resolution |
|---|---|---|
| 1 | Archive not enabled | `Enable-Mailbox <UPN> -Archive` |
| 2 | Missing archive tag | Assign policy: `Set-Mailbox <UPN> -RetentionPolicy "Default MRM Policy"` or add a MoveToArchive DPT to existing policy |
| 3 | MRM paused by retention hold | `Set-Mailbox <UPN> -RetentionHoldEnabled $false` |
| 4 | MFA disabled on mailbox | `Set-Mailbox <UPN> -ElcProcessingDisabled $false` |
| 5 | MFA disabled org-wide | `Set-OrganizationConfig -ElcProcessingDisabled $false` |
| 6 | Missing required license | Assign E3/E5 or Exchange Online Archiving add-on license |
| 7–8 | MFA not processing mailbox | Trigger manually: `Start-ManagedFolderAssistant <UPN>` — wait 24–48 hrs |
| 9 | MRM processing errors | Review MRM logs for specific error codes; address per error guidance |
| 10 | Disabled account blocking MRM | Re-enable the account or investigate disabled state |
| 11 | Archive connectivity broken | **Escalate** — content cannot be moved |
| 12 | Corrupted MRM configuration | `Set-Mailbox <UPN> -RemoveMRMConfiguration` then `Start-ManagedFolderAssistant <UPN>` |
| 13 | Stale FAI tags | `Set-Mailbox <UPN> -RemoveMRMConfiguration` then `Start-ManagedFolderAssistant <UPN>` |
| 14 | Mailbox locked by migration | Wait for active MRS request to complete |
| 15 | Oversized items (>150 MB) | Advise user to manually move or split oversized items |

---

## Additional Scenarios

### Archive Not Yet Enabled (#16a)

This guide assumes the archive mailbox exists. If `ArchiveStatus` = None, the archive must be enabled before MRM archive tags can function.

**Pre-requisites for enabling archive:**
1. User must have an E3/E5 license or Exchange Online Archiving add-on (`BPOS_S_Archive` or `BPOS_S_ArchiveAddOn` in `PersistedCapabilities`).
2. In hybrid environments, the archive must be enabled in the cloud (not on-premises) for Exchange Online mailboxes.

**Enable archive:**
```powershell
Enable-Mailbox <UPN> -Archive
```

**Verify:**
```powershell
Get-Mailbox <UPN> | FL ArchiveStatus, ArchiveGuid
```

### Archive Disabled — Content Loss Risk (#16d)

When an admin disables an archive mailbox, the contents are retained for only **30 days**. After 30 days, the original archive content is **permanently deleted** and cannot be recovered. Re-enabling after 30 days creates a brand-new, empty archive.

**Detection:**
```powershell
# Check if archive was recently disabled
Get-Mailbox <UPN> | FL ArchiveStatus, ArchiveGuid
# ArchiveStatus = None AND ArchiveGuid = 00000000-0000-0000-0000-000000000000 → archive never enabled or disabled
```

**Resolution:**
- **Within 30 days of disabling:** Re-enable the archive immediately to reconnect to original content: `Enable-Mailbox <UPN> -Archive`
- **Beyond 30 days:** Content is permanently lost. No recovery is possible.
- **Preventive:** Communicate to admins never to disable archive mailboxes unless absolutely intended.

### MRM Archive Policies Ignored on Inactive Mailboxes (#17g)

MRM retention tags with the `MoveToArchive` action are **ignored** on inactive mailboxes by design. Items tagged with archive policies remain in the primary mailbox and are retained indefinitely. However, MRM **deletion** policies continue to be processed on inactive mailboxes.

---

## Cross-References

- [auto-expanding-archive.md](auto-expanding-archive.md) — Auto-expanding archive provisioning issues
- [mrm-purview-conflict.md](mrm-purview-conflict.md) — MRM and Purview retention conflicts
- [retention-policy-not-applying.md](retention-policy-not-applying.md) — Purview retention policy application issues
