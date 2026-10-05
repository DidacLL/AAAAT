# AAAAT v2

AAAAT is an **open-source, provider-agnostic agentic-human tool for managing job applications and producing the text/document artifacts needed for them**.

It is local-first and user-owned. Applications/candidatures, reusable professional information, Sources, Tags, editable document content, generated source and rendered artifacts remain under the user's control.

AAAAT supports three peer ways of working:

- **Human → AAAAT:** every essential capability is available through the desktop UI without mandatory AI, JSON, shell or protocol knowledge.
- **AAAAT → AI:** configured AI can assist bounded application/document tasks while AAAAT owns context, validation and local mutation boundaries.
- **AI → AAAAT:** external AI/tools can use bounded AAAAT capabilities through suitable carriers such as MCP, skills/plugins, commands, files or copy/paste without turning any one carrier/provider into product architecture.

VCVGenerator/document work is independently core: CVs, cover letters and application artifacts can be created, edited and rendered without a candidature and without AI, while also integrating naturally with candidature context.

AAAAT is not an in-app job-discovery engine, ATS lifecycle/workflow product, generic AI/chat platform or agent orchestration framework. Architecture stays small and explicit for one-developer maintainability.

[PRODUCT_DEFINITION.md](PRODUCT_DEFINITION.md) is canonical product authority below current explicit Product Owner instruction. [PRODUCT_CONTEXT.md](PRODUCT_CONTEXT.md) explains rationale. [OWNER_DEVELOPMENT_PRINCIPLES.md](OWNER_DEVELOPMENT_PRINCIPLES.md) governs development style. [AGENTS.md](AGENTS.md) is the development entry point; [docs/SPEC.md](docs/SPEC.md) is derived technical architecture; [.agentic/CURRENT_MISSION.md](.agentic/CURRENT_MISSION.md) identifies current execution only.

For alpha installation, ordinary workflows, optional AI, bounded external assistants, backup/restore and troubleshooting, see [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

AI connections are optional. Current direct-AI connection support accepts loopback `http:` endpoints and remote `https:` endpoints whose authentication is handled outside AAAAT. That adapter is implementation, not provider/product authority.

## Development

```text
npm ci
npm run verify
npm start
```

Native packaging for the current machine is separate:

```text
npm run verify:package
```

The release workflow builds native v2 artifacts for Windows, macOS and Linux on x64 and ARM64 runners. Windows and macOS publish portable ZIPs; Linux publishes a portable ZIP and a DEB. Tagged `v2*` releases are published only when the tag exactly matches the version in `package.json`.
