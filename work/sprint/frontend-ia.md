# Sprint 3 Frontend IA Decision Record

## Multi-agent Review Summary

- Information Architect: split the dashboard into fast recognition, focused application identity, keyword context, and secondary detail tabs.
- Interaction Designer: use server-rendered query links with `application_id`, `keyword`, and `tab`; all navigation must work without JavaScript.
- Accessibility Reviewer: use semantic headings, real links for app selection/tabs/keywords, `aria-current` on active items, a skip link, and no hover-only critical data.
- Local-first Frontend Engineer: keep one server-rendered dashboard renderer and preserve full/read-only/static security modes.
- Agent-workflow Designer: derive review queue items from stored fields and glossary gaps; expose them through CLI, local API, dashboard, agent guide, and MCP descriptor.
- Contrarian Reviewer: avoid reintroducing all-field clutter, avoid provider coupling, and avoid brittle CSS assertions.

## Final Decisions

- The application list optimizes recognition: company and role first, status/activity/next action second, and keywords as links.
- The focused application header keeps company, role, status, priority, next action, keywords, and pitch visible.
- Secondary data moves into server-rendered tabs: Company, Notes, Recommendations, Artifacts, and Raw intake in full mode only.
- Keyword drilldown updates a side panel without leaving the selected application context.
- Full mode is the normal local working dashboard, not a separate edit mode. Large create/edit forms stay out of the main dashboard; raw offers enter through a dedicated intake flow and manual edits stay contextual.
- The agent review queue is deterministic and stored nowhere; it reports raw-offer extraction work, missing review fields, and missing keyword definitions.
- “Call probability” remains a placeholder label until real local signals are designed.
