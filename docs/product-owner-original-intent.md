# Product Owner Original Intent - Non-Authoritative Guidance

Status: historical product intent / guidance.
Authority: advisory only.

This document records the original Product Owner requirements and vocabulary for AAAAT. It is tracked openly because AAAAT is an open-source project and product prompts are part of the design history.

This document is not a permanent source of truth. Later accepted decisions may supersede it, including:
- architecture decision records;
- implementation plans accepted by the maintainer;
- issue discussions;
- merged pull requests;
- security/privacy corrections;
- explicit maintainer direction.

When this document conflicts with a later accepted decision, the later decision wins. Keep this document as product context, not as an immutable contract.

## Product Summary

AAAAT, AgentAgnostic Auto Application Tracker, is a handy local tool to track and easily access candidatures and applications managed by LLM agents or humans.

The product should remain local-first, agent-agnostic, and useful both manually and through external agents. Its core object is the Candidature.

## Core Product Objects

### Candidature

The Candidature is the main logic class. It stores candidature-related information, pending tasks queued for agents, and user-assigned todos shown in the dashboard.

Important fields include:
- candidature ID;
- raw pasted job offer text;
- description;
- company;
- company research;
- role;
- salary expectation;
- publication date;
- application date;
- raw pasted application form;
- application form responses;
- CV sent;
- cover letter;
- strengths;
- things to avoid;
- questions to ask;
- tech stack;
- state: draft, sent, precandidate, meeting, closed;
- short pitch;
- keywords;
- valuation /100;
- related todos;
- notes.

### Tasks

Tasks are queued for agent attention when accessing AAAAT. They point to dedicated instructions, endpoints, or standards so an agent knows how to execute that task.

Fields:
- task ID;
- task type;
- task instructions;
- task state.

### Keywords

Keywords are global terms with definitions and user notes. Every time a known keyword is rendered in dashboard content, it should be selectable and should open stored keyword information.

Fields:
- keyword literal used as unique ID;
- admitted forms or aliases;
- definition;
- notes.

## Dashboard Intent

The UI is mostly a dynamic dashboard, more like a single-window app than a set of disconnected pages.

Target dashboard states:
- `welcomeView`: current day, todos, pending tasks, last or important candidatures, brief summaries, useful links, meetings, notes.
- `smartView`: fast, clear mode for unexpected recruiter/interview calls; identify the candidature, then show offer description, selectable keywords, suggestions, questions, risks, and useful call information.
- `detailedView`: complete fields readable and editable inline; generative fields should create tasks for agents rather than silently overwrite.
- `userView`: a user-oriented view preset, not necessarily a persisted fork.

New candidature input should be an expandable panel/modal, not a separate heavy page. It should accept raw job offer input and optional typed fields. It may create initial tasks for field inference, company research, keyword definition, CV generation, cover-letter generation, and form-response generation.

## Document Generation Intent

Documents are generated from LaTeX templates filled programmatically with stored data. Prefer basic `pdflatex` compatibility when compilation is implemented.

Sensitive user data should be managed through variables/placeholders and resolved only at the latest local step possible. For LLM/agent jobs, sensitive values should be placeholders, redacted, summarized, or denied according to policy.
