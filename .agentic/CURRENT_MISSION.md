# Current mission — finish v2 installation

The current Product Owner instruction is to remove unnecessary installer restrictions and machinery, then finish the requested delivery. AAAAT is a single-developer, provider-agnostic application promoting optional local AI. Users own their choice to connect another service. Commercial-provider certification, paid-account sign-in and hypothetical provider charges are not release prerequisites. Development verification does not authorize using the owner's metered subscriptions.

## Current work

[Issue #438](https://github.com/DidacLL/AAAAT/issues/438) tracks native Windows, macOS and Linux packages, optional llama.cpp with the tested Granite model, optional PDF tools, and the editable startup script. [PR #439](https://github.com/DidacLL/AAAAT/pull/439) integrated those capabilities; [PR #441](https://github.com/DidacLL/AAAAT/pull/441) removed the invented Windows 11, Node/npm and Linux release-name restrictions. Neither AI nor PDF setup may restrict ordinary AAAAT installation or manual use.

The current correction removes PDF-setup helpers from mandatory Linux package dependencies and lets APT use MiKTeX's signing key directly, without a separate gpg conversion or redundant HTTP repository precheck. Administrator authorization remains specific to the user's chosen PDF installation. Existing AI choices, working TeX installations and the user-editable startup script stay intact.

## Evidence to reuse

- [All six native builds](https://github.com/DidacLL/AAAAT/actions/runs/38542332660) passed. The corrected installer installed, opened and uninstalled on actual Windows 10 build 19045. Rebuild only affected artifacts when needed.
- Fresh optional setup downloaded the actual runtime and complete 2 GB Granite model into an empty local profile. The packaged desktop started that server and filled a fictional new application through normal UI controls. This was local inference, not a hosted subscription.
- Actual PDF output was produced with native setup on Windows, Intel macOS, Apple Silicon, Linux x64 and Linux ARM64. [The latest Linux observations](https://github.com/DidacLL/AAAAT/actions/runs/38544681523) exercise repository discovery. For the current simplification, real APT in the existing local Ubuntu environment verified the official ASCII-armored key and fetched MiKTeX's signed repository metadata without conversion, installing anything or changing system repositories.
- The accepted desktop refinement is integrated through [PR #435](https://github.com/DidacLL/AAAAT/pull/435). Preserve the owner-accepted [visual direction](../docs/UX_VISUAL_DIRECTION.md) and [interaction direction](../docs/UX_DEFINITION.md); this is not another redesign.

## Limits and next step

The correction passes local typecheck/lint and the affected Linux signing-key path has real APT evidence. Integrate it, then prepare the final release assets. No new tests, provider frameworks, compatibility layers or certification programme are required.

Interactive administrator/Microsoft license dialogs have not all been exercised, and local-model inference has not been observed on every platform. [Issue #428](https://github.com/DidacLL/AAAAT/issues/428) also preserves unverified external-host, native-picker export and late-Tag observations. These are evidence limits, not newly invented product requirements or a request to use a commercial account. Do not claim those observations passed.

No v2 release has been published; the package remains `2.0.0-alpha.0`. No release tag or publication has been authorized.
