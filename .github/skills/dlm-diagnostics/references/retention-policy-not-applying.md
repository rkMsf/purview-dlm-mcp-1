# Retention Policy Not Applying to Workloads

## Symptoms

- **Policy "Distributed" but hold not stamped:** Policy shows "Success" in the portal, but `InPlaceHolds` on the target mailbox does not contain the policy GUID (prefix `mbx` or `skp`).
- **Content not being retained:** Items are being deleted by users or MRM despite an active retain policy covering the location.
- **Content not being deleted:** Items remain past the configured retention period despite an active delete-only or retain-then-delete policy.
- **Policy scope mismatch:** Policy targets "All" but a specific user, site, or group is excluded — or the user is not in the explicit inclusion list.
- **Exchange propagation delay:** Mailbox has less than 10 MB of content, or the policy was applied within the last 7 days — retention does not apply below the 10 MB threshold.
- **SharePoint/OneDrive not reflecting hold:** Site content is not being retained — site may not be indexed or may be locked.

---

## Data Collection

Execute all commands below to gather the complete diagnostic dataset. Replace `<PolicyName>` with the policy name and `<UPN>` with the affected user.

### 1.1 Policy Status & Distribution

```powershell
Get-RetentionCompliancePolicy "<PolicyName>" | FL Name, Guid, Enabled, Mode, DistributionStatus
Get-RetentionCompliancePolicy "<PolicyName>" -DistributionDetail | FL DistributionDetail
```

### 1.2 Retention Rule

```powershell
Get-RetentionComplianceRule -Policy "<PolicyName>" | FL Name, RetentionDuration, RetentionComplianceAction, Mode
```

### 1.3 Policy Scope (All Workloads)

```powershell
Get-RetentionCompliancePolicy "<PolicyName>" | FL ExchangeLocation, ExchangeLocationException, SharePointLocation, SharePointLocationException, OneDriveLocation, OneDriveLocationException, TeamsChannelLocation, TeamsChatLocation
```

### 1.4 Adaptive Scope (If Applicable)

```powershell
Get-AdaptiveScope "<ScopeName>" | FL FilterQuery, WhenCreated, LocationType
Get-Recipient -Filter "<same filter from adaptive scope>" -ResultSize 10 | FL Name, RecipientType
```

### 1.5 Hold Stamp on Target Mailbox

```powershell
Get-Mailbox <UPN> | FL InPlaceHolds, RetentionPolicy, LitigationHoldEnabled
```

---

## Diagnostic Analysis

Analyze the collected data against the following criteria. Flag each as ✅ (healthy) or ❌ (issue found).

| # | Check | Condition for ❌ |
|---|---|---|
| 1 | **Distribution status** | `DistributionStatus` ≠ Success → switch to [Policy Stuck in Error](policy-stuck-error.md) |
| 2 | **Retention rule exists** | No rules returned for the policy |
| 3 | **Target in scope** | User/site/group not in location list, or is in an exception list |
| 4 | **Adaptive scope match** | `Get-Recipient -Filter` returns no results for the target |
| 5 | **Hold stamped on mailbox** | Policy GUID (prefix `mbx` or `skp`) missing from `InPlaceHolds` |
| 6 | **Propagation window** | Exchange: up to 7 days (mailbox must have ≥10 MB). SharePoint/OneDrive: up to 24 hrs. Teams: up to 48–72 hrs |
| 7 | **Adaptive scope age < 5 days** | `WhenCreated` on the adaptive scope is < 5 days ago — scope may not be fully populated yet |

---

## Resolution & Remediation

Based on flagged issues from the diagnostic report, apply the corresponding resolution:

| ❌ Check | Root Cause | Resolution |
|---|---|---|
| 1 | Distribution failure | Switch to [Policy Stuck in Error](policy-stuck-error.md) TSG |
| 2 | Policy created without retention settings | Add rule: `New-RetentionComplianceRule -Name "<RuleName>" -Policy "<PolicyName>" -RetentionDuration 730 -RetentionComplianceAction Keep` |
| 3 | Misconfigured policy scope | Update scope to include target; remove from exception list |
| 4 | Adaptive scope query mismatch | Review and correct `FilterQuery` on the adaptive scope |
| 5 | Policy Sync failure | Retry: `Set-RetentionCompliancePolicy "<PolicyName>" -RetryDistribution` — wait 24–48 hrs. If still not stamped → **escalate** (backend Policy Sync issue, possibly AD duplicate conflict) |
| 6 | Normal propagation delay | Wait for propagation window to elapse, then re-verify |
| 7 | Adaptive scope not yet populated | Wait at least 5 days after scope creation, then verify membership → see [adaptive-scope.md](adaptive-scope.md) |

---

## Cross-References

- [policy-stuck-error.md](policy-stuck-error.md) — Policy distribution failures
- [adaptive-scope.md](adaptive-scope.md) — Adaptive scope query and membership issues
- [auto-apply-labels.md](auto-apply-labels.md) — Auto-apply label troubleshooting
