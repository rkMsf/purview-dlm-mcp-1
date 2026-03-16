# SharePoint Site Deletion Blocked by Retention Policy

## Symptoms

- **Site deletion error:** Admin attempts to delete a SharePoint site or OneDrive account but receives a compliance policy error preventing deletion.
- **Site stuck in "Deleting" state:** The site remains in a "deleting" state indefinitely after the admin initiated deletion.
- **Preservation Hold Library consuming quota:** The hidden Preservation Hold Library (PHL) on the site grows excessively, consuming site storage quota and preventing cleanup.
- **Files not deleted after retention period:** Documents remain on the site after the configured retention period has expired, and are not being moved to the Recycle Bin or permanently deleted.
- **"This item can't be deleted" error:** Users see errors when attempting to delete files or libraries subject to retention.

---

## Data Collection

Execute the commands below to gather the diagnostic dataset. Part A commands are available via the MCP tool. Part B commands require PnP PowerShell or SharePoint Online Management Shell and must be run manually by the admin.

Replace `<SiteURL>` with the affected SharePoint site URL (e.g., `https://contoso.sharepoint.com/sites/target`).

### Part A: MCP-Available Commands (run these first)

### 1.1 Identify Retention Policies Targeting SharePoint

```powershell
Get-RetentionCompliancePolicy | FL Name, SharePointLocation, SharePointLocationException, OneDriveLocation, OneDriveLocationException, DistributionStatus, Enabled
```

### 1.2 Retention Rules for Each Policy

```powershell
Get-RetentionComplianceRule | FL Name, Policy, RetentionDuration, RetentionComplianceAction, Mode
```

### 1.3 Check for eDiscovery Holds

```powershell
Get-ComplianceCase | FL Name, Status, CaseType
```

### 1.4 Organization Config

```powershell
Get-OrganizationConfig | FL ElcProcessingDisabled
```

### Part B: Manual Commands (require PnP PowerShell / SPO Shell)

> The following commands require **PnP PowerShell** (`PnP.PowerShell`) or **SharePoint Online Management Shell** (`Microsoft.Online.SharePoint.PowerShell`) and **cannot be run via the MCP tool**. Provide these to the admin for manual execution.

### 1.5 Preservation Hold Library Status

```powershell
Connect-PnPOnline -Url "<SiteURL>" -Interactive
Get-PnPList -Identity "Preservation Hold Library" | FL Title, ItemCount, LastItemModifiedDate
```

### 1.6 Site Lock State

```powershell
Get-SPOSite -Identity "<SiteURL>" | Select Url, LockState, StorageQuota, StorageUsageCurrent
```

### 1.7 Site Compliance Attribute

```powershell
Connect-PnPOnline -Url "<SiteURL>" -Interactive
Get-PnPSite -Includes InformationRightsManagementSettings | FL ComplianceAttribute
```

### 1.8 Retention Labels on Site Content

```powershell
Connect-PnPOnline -Url "<SiteURL>" -Interactive
Get-PnPListItem -List "Documents" | Where-Object {$_["_ComplianceTag"] -ne $null} | Select FileLeafRef, _ComplianceTag
```

### 1.9 Second-Stage Recycle Bin

```powershell
Get-PnPRecycleBinItem -SecondStage | Measure-Object
```

---

## Diagnostic Analysis

Analyze the collected data against the following criteria. Flag each as ✅ (healthy) or ❌ (issue found).

**Preservation Hold Library (PHL) behavior:**
- When a retention policy applies to a site, every edit or deletion of a document creates a copy in the PHL.
- The PHL is a hidden system library — manually editing or deleting its contents is **not supported**.
- After a retention policy is removed, the PHL timer job processes cleanup every 7 days, with a 30-day minimum before items move to the Recycle Bin.

**SharePoint/OneDrive deletion timeline after retention release:**

| Phase | Duration |
|-------|----------|
| Policy update propagation | Up to **7 days** |
| PHL items moved to site Recycle Bin | Up to **7 days** (timer job) + **30 days** minimum |
| First-stage Recycle Bin retention | **93 days** |
| Second-stage Recycle Bin purge | **30 days** |
| **Total maximum delay** | **~130 days** |

| # | Check | Condition for ❌ |
|---|---|---|
| 1 | **Site in scope of retention policy** | One or more retention policies with `SharePointLocation` covering the site (explicit or "All") |
| 2 | **Retention label on site content** | Documents in the site have retention labels applied (`_ComplianceTag` populated) — site cannot be deleted while labeled content exists |
| 3 | **PHL contains items** | `ItemCount` > 0 on Preservation Hold Library — retained copies are blocking site deletion |
| 4 | **PHL consuming quota** | PHL item count is significant and site `StorageUsageCurrent` is approaching `StorageQuota` |
| 5 | **Site locked** | `LockState` ≠ Unlock — site is locked (`NoAccess` or `ReadOnly`), preventing retention processing and deletion |
| 6 | **Multiple policies targeting site** | More than one retention policy covers the site — all must be removed before deletion is possible |
| 7 | **Policy uses Preservation Lock** | Retention policy has Preservation Lock enabled — the site **cannot** be removed from the policy. Contact Microsoft Support |
| 8 | **eDiscovery hold on site** | Site is subject to an eDiscovery case hold — blocks permanent deletion independently of retention policies |
| 9 | **Second-stage Recycle Bin not empty** | Second-stage Recycle Bin contains items — permanent deletion still pending (up to 93 days) |
| 10 | **Files not deleted after retention expiry** | Retention period has expired but content remains — check if within the 37-day timer job + PHL processing window |

---

## Resolution & Remediation

Based on flagged issues from the diagnostic analysis, apply the corresponding resolution:

| ❌ Check | Root Cause | Resolution |
|---|---|---|
| 1 | Retention policy preventing site deletion | Remove the site from the policy: `Set-RetentionCompliancePolicy "<PolicyName>" -RemoveSharePointLocation "<SiteURL>"` — or add an exception: `Set-RetentionCompliancePolicy "<PolicyName>" -AddSharePointLocationException "<SiteURL>"` |
| 2 | Retention labels on content blocking deletion | Remove retention labels from all items in the site before deletion. Use PnP PowerShell or the Purview portal to identify and remove labels |
| 3 | PHL cleanup pending | After removing all retention policies, wait up to 37 days for PHL timer job to process. Do NOT manually delete PHL contents |
| 4 | PHL consuming site quota | Increase site storage quota via SharePoint admin. Do not manually edit the PHL. After retention release, PHL will self-clean |
| 5 | Site locked | Unlock the site: `Set-SPOSite -Identity "<SiteURL>" -LockState Unlock` — then retry deletion |
| 6 | Multiple policies | Remove the site from **all** retention policies. Use the data collection commands to identify every policy covering the site |
| 7 | Preservation Lock active | **Cannot be resolved by admin.** Preservation Lock is irreversible — contact Microsoft Support for assistance |
| 8 | eDiscovery hold | Remove the eDiscovery case hold from the site via the Purview portal, or close the eDiscovery case |
| 9 | Recycle Bin retention period | Wait up to 93 days for second-stage Recycle Bin to permanently delete items. No manual acceleration is available |
| 10 | Normal processing delay | Wait up to 37 days after retention expiry for PHL timer job (7-day cycle + 30-day minimum). If beyond 37 days → **escalate** |

---

## Escalation Decision Tree

```
Identify all retention policies/labels/holds on the site
│
├── Retention policy present
│   ├── Remove site from policy → Wait for PHL cleanup (up to 130 days)
│   │   ├── PHL empty after cleanup → Retry site deletion → Resolved
│   │   └── PHL not emptying after 37+ days → Escalate
│   └── Policy has Preservation Lock → Contact Microsoft Support
│
├── Retention labels on content
│   ├── Remove labels → Retry site deletion → Resolved
│   └── Cannot remove labels (record label) → Contact Microsoft Support
│
├── eDiscovery hold
│   ├── Remove hold → Wait for cleanup → Retry → Resolved
│   └── Cannot remove hold (active case) → Resolve case first
│
└── No holds/policies found but deletion still blocked
    └── Escalate — possible orphaned compliance binding
```

**For urgent site deletions** → escalate to Microsoft Support for accelerated PHL cleanup.

---

## Cross-References

- [retention-policy-not-applying.md](retention-policy-not-applying.md) — Policy distribution and application issues
- [policy-stuck-error.md](policy-stuck-error.md) — Policy stuck in Error or PendingDeletion
- [substrateholds-quota.md](substrateholds-quota.md) — Recoverable Items quota issues (Exchange equivalent)
