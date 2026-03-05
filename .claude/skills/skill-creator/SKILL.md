---
name: skill-creator
description: "Meta-skill for creating new DLM diagnostic skills. Use this skill when you need to author a new troubleshooting guide (SKILL.md + reference files) that follows the project's conventions. Produces a complete skill directory structure that can be dropped into .github/skills/ and .claude/skills/."
---

# Skill Creator

Create new diagnostic skills for the DLM Diagnostics MCP server. Each skill is a self-contained directory with a `SKILL.md` and supporting reference files.

## Prerequisites

- Familiarity with the existing skill structure (see `.github/skills/dlm-diagnostics/` as the canonical example).
- Knowledge of the PowerShell cmdlet allowlist in `src/powershell/allowlist.ts`.
- Understanding of the project's read-only safety model.

## Safety Rules

1. **Only reference read-only cmdlets** — allowed verb prefixes: `Get-*`, `Test-*`, `Export-*`.
2. **Never include mutating commands in diagnostic steps** — `Set-*`, `New-*`, `Remove-*`, `Enable-*`, `Start-*`, `Invoke-*` must only appear in the "Recommended Actions" output section, clearly marked as manual-review-only.
3. **All cmdlets used in the skill must exist in `src/powershell/allowlist.ts`** — if a new `Get-*` cmdlet is needed, add it to the allowlist as a separate change.
4. **No credentials or secrets** — never embed tokens, passwords, or connection strings in skill files.

## SKILL.md Template

Every skill must have a `SKILL.md` at its root with the following structure:

```markdown
---
name: <skill-name>
description: "<One-paragraph description of when to invoke this skill. Include symptom keywords for matching.>"
---

# <Skill Title>

<Brief overview of what this skill investigates.>

## Prerequisites

<Required PowerShell sessions or environment setup.>

## Safety Rules

<Read-only enforcement rules specific to this skill.>

## Decision Tree

| Symptom | Reference |
|---------|-----------|
| <symptom description> | [<filename>.md](references/<filename>.md) |

## Workflow

1. **Identify the symptom** — match user description to the decision tree.
2. **Load the reference file** — read it fully before starting.
3. **Execute diagnostic commands** — step by step using `run_powershell`.
4. **Interpret results** — follow the reference guide's evaluation criteria.
5. **Cross-reference** — load linked references when directed.
6. **Report findings** — summarize using the Output Format below.
7. **Review execution log** — use `get_execution_log` for the audit trail.

## Output Format

<Standard investigation summary template.>
```

## Reference File Structure

Each reference file in `references/` should follow this pattern:

```markdown
# <Issue Title>

## Overview
<Brief description of the issue and when it occurs.>

## Diagnostic Steps

### Step N: <Step Name>
**Command:**
\`\`\`powershell
<Get-* / Test-* / Export-* command>
\`\`\`
**Evaluate:**
- <What to look for in the output>
- <Condition that indicates a problem>

## Root-Cause Table

| Finding | Root Cause | Remediation |
|---------|-----------|-------------|
| <diagnostic finding> | <why it happens> | <fix command or action — marked as manual> |

## Cross-References
- [related-file.md](related-file.md) — <when to follow this link>
```

## Creation Workflow

Follow these steps to create a new skill:

1. **Name the skill** — use kebab-case (e.g., `edr-diagnostics`, `compliance-search-triage`).
2. **Write the SKILL.md** — follow the template above. Start with the YAML frontmatter `name` and `description`.
3. **Build the decision tree** — list every symptom the skill can diagnose, each mapping to a reference file.
4. **Create reference files** — one `.md` per symptom in a `references/` subdirectory. Each must include diagnostic steps with exact PowerShell commands, evaluation criteria, a root-cause table, and cross-references.
5. **Validate cmdlets** — every cmdlet used in diagnostic steps must be in `src/powershell/allowlist.ts`. If a new read-only cmdlet is needed, add it to the allowlist.
6. **Test the flow** — mentally walk through at least one symptom end-to-end: decision tree → reference file → commands → evaluation → root cause → remediation.
7. **Write the output format** — ensure it matches the standard investigation summary template.
8. **Mirror the skill** — copy the complete skill directory to both locations:
   - `.github/skills/<skill-name>/`
   - `.claude/skills/<skill-name>/`
9. **Update documentation** — if the skill introduces new cmdlets, update `CLAUDE.md` and `.github/copilot-instructions.md`.
10. **Commit** — commit both skill copies and any allowlist changes together.

## Validation Checklist

Before finalizing a new skill, verify:

- [ ] SKILL.md has valid YAML frontmatter with `name` and `description`
- [ ] Description includes symptom keywords for AI matching
- [ ] Decision tree covers all intended symptoms
- [ ] Every decision tree entry links to an existing reference file
- [ ] All reference files exist in `references/` subdirectory
- [ ] All diagnostic commands use only `Get-*`, `Test-*`, or `Export-*` cmdlets
- [ ] All cmdlets are present in `src/powershell/allowlist.ts`
- [ ] Mutating commands appear only in remediation sections with manual-review warnings
- [ ] Reference files include root-cause tables
- [ ] Skill is mirrored in both `.github/skills/` and `.claude/skills/`
- [ ] Relative `references/` links resolve correctly from both locations

## Canonical Example

See `.github/skills/dlm-diagnostics/` (or `.claude/skills/dlm-diagnostics/`) for the reference implementation. It demonstrates all conventions: YAML frontmatter, decision tree, 12 reference files, safety rules, workflow, and output format.
