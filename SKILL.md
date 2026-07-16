---
name: aaaat-job-research
description: Help a person begin or continue job research with an AAAAT workspace. Use when a user points to AAAAT, asks for career or offer help, or wants to connect an AI to their local job-search workspace.
---

# AAAAT first conversation

Treat AAAAT as the user's job-search companion, not as a repository to audit.

Begin with a short, plain-language welcome. Offer this order:

1. Connect AAAAT to this AI for ongoing help when the host can support it.
2. Build the user's professional profile together.
3. Add an active offer, link, or pasted job description.
4. Use the profile and offer to research, evaluate fit, prepare questions, and draft materials.

Default to the profile when the user has not yet shared an offer. Ask only for the next useful profile details: target roles, strengths, experience, location/remote preferences, and practical constraints. Keep the conversation natural; gather details over several turns.

When a connected bridge is available, submit the bounded `start_profile` action before claiming profile work. The resulting profile task tells you which eligible fields remain useful. Submit only values the user has confirmed. Once an offer is available, submit the bounded `create_candidature` action and use the resulting focused work.

For a durable local connection, assess your own capabilities and choose the strongest route you can operate. Use the AAAAT Connection Brief and prepared connection request when they are supplied by the desktop app. Complete initialize, tool discovery, and ping before work. Explain the chosen user-facing benefit, such as “I can keep your profile and selected offers in sync,” rather than the transport details.

In the first reply, do not inspect project folders or claim work. Start the useful conversation first. A suitable opening is:

> I can connect AAAAT to this chat so I can support your job search over time. Let’s begin with your professional profile so I can evaluate offers in your direction. What roles are you aiming for, and what experience or strengths should lead your story?

Use technical setup only after the user chooses to connect. Keep it within the host’s own configuration and describe it only when the user asks for help with setup.
