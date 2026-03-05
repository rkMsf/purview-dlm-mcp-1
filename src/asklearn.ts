// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// ─── Types ───

export interface TopicEntry {
  topic: string;
  keywords: string[];
  description: string;
  links: { title: string; url: string }[];
  steps: string[];
}

export interface TopicMatch {
  topic: string;
  description: string;
  links: { title: string; url: string }[];
  steps: string[];
}

// ─── Topic Map ───

export const topics: TopicEntry[] = [
  {
    topic: "Retention Policies",
    keywords: ["retention", "retain", "delete after", "retention policy", "data lifecycle", "dlm", "lifecycle management"],
    description: "Create and manage retention policies to keep or delete content across Microsoft 365 workloads.",
    links: [
      { title: "Learn about retention policies and retention labels", url: "https://learn.microsoft.com/purview/retention" },
      { title: "Create and configure retention policies", url: "https://learn.microsoft.com/purview/create-retention-policies" },
      { title: "Common scenarios for retention policies", url: "https://learn.microsoft.com/purview/retention-policies-scenarios" },
    ],
    steps: [
      "Go to Microsoft Purview compliance portal \u2192 Data lifecycle management \u2192 Policies",
      "Choose 'Create a retention policy' and select target workloads (Exchange, SharePoint, OneDrive, Teams, etc.)",
      "Configure retention duration and action (retain, delete, or retain then delete)",
      "Choose between static scope (all locations) or adaptive scope (dynamic query-based targeting)",
      "Review and submit the policy \u2014 allow up to 24 hours for distribution",
    ],
  },
  {
    topic: "Retention Labels",
    keywords: ["retention label", "label content", "auto-apply label", "compliance tag", "classify content", "records label"],
    description: "Create retention labels to classify and manage individual items across Exchange, SharePoint, and OneDrive.",
    links: [
      { title: "Learn about retention labels", url: "https://learn.microsoft.com/purview/retention#retention-labels" },
      { title: "Create retention labels and apply them", url: "https://learn.microsoft.com/purview/create-retention-labels-information-governance" },
      { title: "Auto-apply retention labels", url: "https://learn.microsoft.com/purview/apply-retention-labels-automatically" },
    ],
    steps: [
      "Go to Purview portal \u2192 Data lifecycle management \u2192 Labels",
      "Create a label with retention settings (retain, delete, or mark as record)",
      "Publish the label via a label policy (manual application) or configure auto-apply rules",
      "For auto-apply: define conditions using KQL queries, sensitive information types, or trainable classifiers",
      "Monitor label activity in the Activity Explorer",
    ],
  },
  {
    topic: "Archive Mailboxes",
    keywords: ["archive", "archive mailbox", "auto-expanding archive", "mailbox archive", "online archive", "in-place archive"],
    description: "Enable and manage archive mailboxes and auto-expanding archives in Exchange Online.",
    links: [
      { title: "Enable archive mailboxes", url: "https://learn.microsoft.com/purview/enable-archive-mailboxes" },
      { title: "Auto-expanding archiving", url: "https://learn.microsoft.com/purview/autoexpanding-archiving" },
      { title: "Archive mailbox overview", url: "https://learn.microsoft.com/purview/archive-mailboxes" },
    ],
    steps: [
      "Go to Exchange admin center \u2192 Mailboxes \u2192 select the mailbox \u2192 Mailbox tab",
      "Enable 'Archive mailbox' for the user",
      "For auto-expanding: run Set-OrganizationConfig -AutoExpandingArchive in Exchange Online PowerShell",
      "Configure retention policies or MRM tags to move items to archive based on age",
      "Monitor archive size via Get-MailboxStatistics -Archive",
    ],
  },
  {
    topic: "Inactive Mailboxes",
    keywords: ["inactive mailbox", "deleted user mailbox", "preserve mailbox", "hold mailbox", "departed user"],
    description: "Preserve mailbox content for former employees using holds and inactive mailboxes.",
    links: [
      { title: "Inactive mailboxes overview", url: "https://learn.microsoft.com/purview/inactive-mailboxes-in-office-365" },
      { title: "Create and manage inactive mailboxes", url: "https://learn.microsoft.com/purview/create-and-manage-inactive-mailboxes" },
      { title: "Recover an inactive mailbox", url: "https://learn.microsoft.com/purview/recover-an-inactive-mailbox" },
    ],
    steps: [
      "Place a hold (litigation hold, retention policy, or eDiscovery hold) on the mailbox BEFORE deleting the user",
      "Delete the user account \u2014 the mailbox becomes inactive and content is preserved",
      "To recover: use Restore-Mailbox or create a new mailbox and merge content",
      "To view inactive mailboxes: Get-Mailbox -InactiveMailboxOnly",
      "To permanently delete: Remove-Mailbox -PermanentlyDelete after removing holds",
    ],
  },
  {
    topic: "eDiscovery",
    keywords: ["ediscovery", "e-discovery", "content search", "legal hold", "litigation hold", "case", "custodian", "review set", "search mailbox", "search content"],
    description: "Use eDiscovery tools to search, hold, and export content for legal and compliance investigations.",
    links: [
      { title: "eDiscovery solutions overview", url: "https://learn.microsoft.com/purview/ediscovery" },
      { title: "Create an eDiscovery (Premium) case", url: "https://learn.microsoft.com/purview/ediscovery-create-a-case" },
      { title: "Content search", url: "https://learn.microsoft.com/purview/ediscovery-content-search" },
      { title: "Manage holds in eDiscovery", url: "https://learn.microsoft.com/purview/ediscovery-managing-holds" },
    ],
    steps: [
      "Go to Purview portal \u2192 eDiscovery \u2192 Cases",
      "Create a new case and add custodians (data sources)",
      "Place holds on custodian mailboxes and sites to preserve content",
      "Create searches using KQL queries to find relevant content",
      "Add results to a review set for analysis, or export directly",
    ],
  },
  {
    topic: "Audit Log",
    keywords: ["audit", "audit log", "search audit", "activity log", "user activity", "admin activity", "audit trail", "who did what"],
    description: "Search the unified audit log to investigate user and admin activities across Microsoft 365.",
    links: [
      { title: "Audit solutions overview", url: "https://learn.microsoft.com/purview/audit-solutions-overview" },
      { title: "Search the audit log", url: "https://learn.microsoft.com/purview/audit-log-search" },
      { title: "Audit (Premium)", url: "https://learn.microsoft.com/purview/audit-premium" },
      { title: "Turn auditing on or off", url: "https://learn.microsoft.com/purview/audit-log-enable-disable" },
    ],
    steps: [
      "Go to Purview portal \u2192 Audit \u2192 Search",
      "Set the date range and filter by activities, users, or files",
      "Run the search and review results",
      "Export results to CSV for further analysis",
      "For Audit Premium: configure audit log retention policies for extended retention",
    ],
  },
  {
    topic: "Communication Compliance",
    keywords: ["communication compliance", "monitor communications", "policy violation", "inappropriate content", "offensive language", "regulatory compliance", "chat monitoring"],
    description: "Detect and act on communication policy violations across email, Teams, and other channels.",
    links: [
      { title: "Communication compliance overview", url: "https://learn.microsoft.com/purview/communication-compliance" },
      { title: "Create communication compliance policies", url: "https://learn.microsoft.com/purview/communication-compliance-policies" },
      { title: "Investigate and remediate alerts", url: "https://learn.microsoft.com/purview/communication-compliance-investigate-remediate" },
    ],
    steps: [
      "Go to Purview portal \u2192 Communication compliance \u2192 Policies",
      "Create a policy using a template (e.g., offensive language, regulatory compliance) or custom conditions",
      "Select users or groups to monitor and the communication channels",
      "Configure reviewers who will investigate flagged messages",
      "Review alerts in the dashboard and take remediation actions (escalate, resolve, notify)",
    ],
  },
  {
    topic: "Information Barriers",
    keywords: ["information barrier", "information barriers", "wall", "chinese wall", "segment", "block communication", "restrict communication"],
    description: "Define policies that prevent specific groups of users from communicating with each other.",
    links: [
      { title: "Information barriers overview", url: "https://learn.microsoft.com/purview/information-barriers" },
      { title: "Define information barrier policies", url: "https://learn.microsoft.com/purview/information-barriers-policies" },
      { title: "Troubleshoot information barriers", url: "https://learn.microsoft.com/purview/information-barriers-troubleshooting" },
    ],
    steps: [
      "Define user segments based on Azure AD attributes (department, group, etc.)",
      "Create information barrier policies that block or allow communication between segments",
      "Apply policies using Start-InformationBarrierPoliciesApplication",
      "Verify policy application status via Get-InformationBarrierPoliciesApplicationStatus",
      "Monitor for policy conflicts and troubleshoot using the IB troubleshooting guide",
    ],
  },
  {
    topic: "Insider Risk Management",
    keywords: ["insider risk", "insider threat", "data theft", "data exfiltration", "departing employee", "risky user", "policy violation"],
    description: "Detect and investigate potential insider threats such as data theft or policy violations.",
    links: [
      { title: "Insider risk management overview", url: "https://learn.microsoft.com/purview/insider-risk-management" },
      { title: "Create insider risk policies", url: "https://learn.microsoft.com/purview/insider-risk-management-policies" },
      { title: "Investigate insider risk alerts", url: "https://learn.microsoft.com/purview/insider-risk-management-activities" },
    ],
    steps: [
      "Go to Purview portal \u2192 Insider risk management \u2192 Policies",
      "Create a policy using a template (e.g., data theft by departing users, data leaks)",
      "Configure triggering events and risk indicators",
      "Review alerts and investigate user activities in the case dashboard",
      "Take action: escalate to eDiscovery, notify the user's manager, or create a case",
    ],
  },
  {
    topic: "Records Management",
    keywords: ["records management", "record", "declare record", "regulatory record", "file plan", "disposition", "disposition review"],
    description: "Manage records lifecycle from declaration through disposition with regulatory compliance.",
    links: [
      { title: "Records management overview", url: "https://learn.microsoft.com/purview/records-management" },
      { title: "Declare records using retention labels", url: "https://learn.microsoft.com/purview/declare-records" },
      { title: "Disposition of content", url: "https://learn.microsoft.com/purview/disposition" },
      { title: "File plan manager", url: "https://learn.microsoft.com/purview/file-plan-manager" },
    ],
    steps: [
      "Go to Purview portal \u2192 Records management \u2192 File plan",
      "Create retention labels that mark items as records or regulatory records",
      "Publish labels or auto-apply them to content",
      "Configure disposition review to approve or extend retention at the end of the retention period",
      "Use the file plan manager to import/export label settings in bulk",
    ],
  },
  {
    topic: "Adaptive Scopes",
    keywords: ["adaptive scope", "dynamic scope", "scope query", "target users", "target sites", "scope membership"],
    description: "Use adaptive scopes to dynamically target retention policies based on user or site attributes.",
    links: [
      { title: "Adaptive scopes", url: "https://learn.microsoft.com/purview/retention#adaptive-or-static-policy-scopes-for-retention" },
      { title: "Configure adaptive scopes", url: "https://learn.microsoft.com/purview/retention-settings#configure-adaptive-scopes" },
    ],
    steps: [
      "Go to Purview portal \u2192 Data lifecycle management \u2192 Adaptive scopes",
      "Create a scope with a query based on user attributes (department, location, etc.) or site properties",
      "Assign the adaptive scope to a retention policy",
      "Allow up to 24 hours for the scope to evaluate and populate membership",
      "Verify scope membership via Get-AdaptiveScope in Security & Compliance PowerShell",
    ],
  },
];

export const fallback: TopicMatch = {
  topic: "Microsoft Purview",
  description: "Microsoft Purview provides a unified data governance and compliance platform.",
  links: [
    { title: "Microsoft Purview documentation", url: "https://learn.microsoft.com/purview/" },
    { title: "Microsoft Purview compliance portal", url: "https://learn.microsoft.com/purview/purview-compliance-portal" },
    { title: "What is Microsoft Purview?", url: "https://learn.microsoft.com/purview/purview" },
  ],
  steps: [
    "Visit the Microsoft Purview documentation hub for an overview of all compliance solutions",
    "Navigate to the specific solution area (Data lifecycle management, eDiscovery, Audit, etc.)",
    "Follow the quickstart guides for initial setup and configuration",
  ],
};

// ─── Topic Lookup ───

/**
 * Look up a user question against the Purview topic map.
 * Returns all matching topics (sorted by relevance), or the fallback if none match.
 */
export function lookup(question: string): TopicMatch[] {
  const q = question.toLowerCase();

  const scored = topics
    .map((entry) => ({
      entry,
      score: entry.keywords.filter((kw) => q.includes(kw.toLowerCase())).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [fallback];

  return scored.map((x) => ({
    topic: x.entry.topic,
    description: x.entry.description,
    links: x.entry.links,
    steps: x.entry.steps,
  }));
}

/** Format topic matches into a readable markdown response. */
export function formatResponse(matches: TopicMatch[]): string {
  const lines: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    if (i > 0) lines.push("\n---\n");

    const m = matches[i];
    lines.push(`## ${m.topic}`);
    lines.push("");
    lines.push(m.description);
    lines.push("");
    lines.push("### Documentation");
    lines.push("");
    for (const link of m.links) {
      lines.push(`- [${link.title}](${link.url})`);
    }
    lines.push("");
    lines.push("### Steps");
    lines.push("");
    for (let j = 0; j < m.steps.length; j++) {
      lines.push(`${j + 1}. ${m.steps[j]}`);
    }
  }

  return lines.join("\n");
}
