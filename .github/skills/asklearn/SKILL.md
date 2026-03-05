---
name: asklearn
description: "Look up Microsoft Purview documentation and guidance from Microsoft Learn. Use this skill ONLY when the user's question does NOT match a diagnostic symptom in dlm-diagnostics. Use dlm-diagnostics first for troubleshooting issues like retention policy errors, archive problems, inactive mailboxes, etc. Use asklearn for general questions like: how do I create a retention policy, how do I set up eDiscovery, how do I enable audit logging, how do I configure communication compliance, how do I set up information barriers, how do I use insider risk management, how do I manage records, or how do I configure adaptive scopes."
---

# Ask Learn

Surface relevant Microsoft Learn documentation and step-by-step guidance for Microsoft Purview topics. This skill is a **fallback** — use the `dlm-diagnostics` skill first for troubleshooting active issues.

## When to Use This Skill

- User asks "how do I…" about a Purview feature
- User asks for help, guidance, or documentation
- User wants to learn about a Purview capability
- The question does **not** match a diagnostic symptom in `dlm-diagnostics`

## When NOT to Use This Skill

- User reports a specific problem or error → use `dlm-diagnostics` instead
- User needs to run diagnostic commands → use `dlm-diagnostics` instead
- The symptom matches any entry in the `dlm-diagnostics` decision tree → use that skill

## Supported Topics

| Topic | Keywords |
|-------|----------|
| Retention Policies | retention, retain, delete after, data lifecycle |
| Retention Labels | retention label, auto-apply label, compliance tag |
| Archive Mailboxes | archive, auto-expanding archive, online archive |
| Inactive Mailboxes | inactive mailbox, deleted user mailbox, preserve mailbox |
| eDiscovery | ediscovery, content search, legal hold, litigation hold, review set |
| Audit Log | audit, audit log, user activity, admin activity |
| Communication Compliance | communication compliance, monitor communications, chat monitoring |
| Information Barriers | information barrier, chinese wall, block communication |
| Insider Risk Management | insider risk, data theft, departing employee, risky user |
| Records Management | records management, declare record, disposition, file plan |
| Adaptive Scopes | adaptive scope, dynamic scope, scope query |

## Workflow

1. **Check dlm-diagnostics first** — if the user's question matches a diagnostic symptom, use that skill instead.
2. **Call the `ask_learn` MCP tool** — pass the user's question as the `question` parameter.
3. **Present the results** — the tool returns matching Microsoft Learn links and step-by-step guidance.
4. **Summarize** — provide the user with the most relevant links and a brief overview of the steps.

## Output Format

```
## 📚 Microsoft Learn Resources

**Topic:** <matched topic>

### Documentation
- [Link title](url) — brief context

### Quick Steps
1. Step 1
2. Step 2
3. ...

> 💡 For detailed instructions, visit the linked documentation.
> ⚠️ If you're experiencing an issue with this feature, try the `dlm-diagnostics` skill instead.
```
