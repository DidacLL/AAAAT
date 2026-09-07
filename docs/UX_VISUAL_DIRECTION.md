# AAAAT visual direction

Status: Product Owner visual-direction reference for future UX/UI implementation.

This document defines the intended visual character of AAAAT. It is not a navigation contract, component specification, design system, color token file, or instruction to start a standalone styling/redesign loop. Product behavior and interaction architecture remain governed by current Product Owner intent, `docs/OWNER_INTENT.md`, `docs/SPEC.md`, and the canonical UX definition produced by Mission #204.

Use this document whenever work changes visible UI. Interpret the direction rather than copying individual historical mockups or locking onto incidental details.

## Character

AAAAT should feel like a kind, capable outlaw AI-robot surviving in a post-AI data wasteland.

It is old, patched, slightly rusted and visibly repaired, but dependable and useful. Its apparent age is part of its charm rather than a sign of incompetence. AAAAT is especially good at finding useful information in disorder, keeping it understandable, and turning rough material into clean, useful artifacts.

The product personality is therefore a contrast:

- the surrounding machine/workspace may look worn, improvised and retro;
- the information AAAAT recovers should be legible and well organized;
- the documents/artifacts it produces should feel clean, intentional and trustworthy;
- the robot/system can be personable and slightly cute without becoming childish, cartoon-heavy or distracting.

The visual metaphor is closer to a repaired field terminal, paper dossier and workshop instrument than to a modern SaaS dashboard.

## Aesthetic direction

The broad visual language is retrofuturist and post-apocalyptic, combining roughly:

- mid-century / 1950s industrial and atomic-age interface cues;
- old control panels, terminals, gauges, labels and mechanical switches;
- paper, folders, dossiers, typed annotations and printed-document texture;
- patched metal, worn paint, oxidized/rusted surfaces and visible repair history;
- a restrained wasteland/workshop atmosphere;
- useful, professional information design underneath the patina.

References such as *Fallout*, *Dota 2* and a 1950s-meets-wasteland/Mad-Max atmosphere communicate mood only. Do not copy their assets, characters, iconography, layouts or branded visual language. Translate the underlying qualities into AAAAT's own identity.

## Color and material feel

The palette should lean toward subdued, warm, weathered and pastel industrial colors rather than aggressive cyberpunk saturation.

Useful families include, without fixing exact tokens yet:

- parchment / paper cream;
- dusty beige and faded tan;
- muted rust, terracotta and oxidized copper;
- worn red/orange accents used sparingly;
- faded olive, sage or military green;
- desaturated teal/blue where useful;
- charcoal, dark metal and warm grey for structure;
- off-white rather than sterile pure white.

The intended feeling is "sun-faded and repaired", not "neon hacker terminal".

Avoid making the entire application brown, dirty or low-contrast. Patina is atmosphere and framing; information must remain easy to read.

## Panels, paper and consoles

AAAAT can combine two visual materials:

1. **machine/panel surfaces** for navigation, controls, status, tools and framing;
2. **paper/document surfaces** for information, Sources, notes, CV/letter content and other readable material.

This contrast supports the product story: the machine looks old and patched, while the information it helps recover and construct is clear.

Potential cues include inset panels, stamped labels, restrained bevels, screws/fasteners, typed or terminal-like metadata, paper sheets, ruled sections, tabs, clipped notes or dossier-like grouping. These are design vocabulary, not requirements to decorate every component.

Do not turn every block into a novelty prop. The interface must still behave like a professional desktop application.

## Typography

Typography should reinforce the old-machine / paper contrast without sacrificing readability.

Potential direction:

- highly readable humanist/serif or utilitarian sans treatment for long-form information and document-like areas;
- restrained monospace/terminal typography for technical metadata, diagnostics, labels or advanced surfaces;
- occasional stamped/typewriter/industrial display treatment for headings or identity, not body text.

Do not use distressed, novelty or monospace fonts for substantial reading just to satisfy the theme.

## AAAAT as a character

AAAAT may be represented as the helpful robot/personality of the tool.

The character should communicate:

- resourcefulness;
- kindness/helpfulness;
- independence / outsider character;
- old but capable machinery;
- patched or repaired construction;
- some visual warmth/cuteness without becoming childish.

The mascot should support orientation, empty states, onboarding, waiting/status moments or brand identity where useful. It must not consume valuable operational space during candidature review, recruiter-call Focus, editing or document work.

## Interaction feel

Visual motion and feedback should be restrained and purposeful.

If mechanical/analog cues are used, they should suggest:

- a switch engaging;
- a panel waking up;
- paper/file movement;
- a terminal resolving information;
- a machine assembling something useful.

Avoid constant animation, game-like HUD noise, glitch effects, fake scanlines over readable content, or movement that interferes with rapid recruiter-call use.

The product may look old; it should not feel slow or unreliable.

## Relationship to UX hierarchy

Theme must reinforce rather than override UX hierarchy.

In particular:

- Candidature Focus remains calm and rapidly readable;
- Sources should feel trustworthy and document-like;
- editing controls should be clear rather than hidden behind decorative machinery;
- VCVGenerator should emphasize the cleanliness and ownership of the artifact being constructed;
- Settings/advanced technical surfaces can carry somewhat stronger console/instrumentation cues than ordinary candidature work;
- progressive disclosure remains the mechanism for technical depth, not visual clutter.

## Accessibility and restraint

The style is subordinate to usability.

Future visual work must preserve:

- sufficient text/control contrast;
- clear focus indication;
- meaning independent of color alone;
- readable body text;
- obvious interactive controls;
- usable default and minimum window sizes;
- no essential information obscured by texture, decoration or fixed chrome.

Weathering should mostly affect large surfaces, edges, borders, icons and decorative layers—not the legibility of content.

## What this direction rejects

Avoid drifting toward:

- aggressive neon cyberpunk;
- glossy modern SaaS minimalism with no AAAAT character;
- generic dark-mode developer dashboard aesthetics;
- military/tactical severity;
- horror/grunge that makes the interface hostile;
- excessive steampunk ornament;
- direct imitation of Fallout, Dota 2, Mad Max or other reference IP;
- skeuomorphism so literal that interaction becomes unclear;
- decoration that increases cognitive load during recruiter/interview use.

The target is **friendly worn retrofuturism with professional information clarity**.

## Historical visual references

`docs/v2DefinitionPrompt/` currently contains historical generated AAAAT visual assets, including:

- `AAAATART.png`
- `AAAATlogo.png` / `AAAATlogolight.png`
- `AAAATbanner.png` / `AAAATbannerlight.png`
- `AAAATbg.png` / `AAAATbglight.png`
- `AAAATloading.png` / `AAAATloadinglight.png`

These are visual research inputs only. The surrounding `v2DefinitionPrompt` folder is not guaranteed to reflect current product authority. A future visual-design run should inspect the images directly, preserve useful motifs where they agree with this owner direction, and discard anything that conflicts with current UX/product requirements.

## Guidance for future visual implementation runs

Before changing visible UI, read this document together with the current canonical UX definition.

A visual implementation should be able to explain:

- how the result expresses AAAAT's patched, kind, retrofuturist machine character;
- how paper/document and machine/panel surfaces support the information hierarchy;
- why the styling remains calm and readable during candidature work;
- how it avoids generic SaaS or aggressive cyberpunk aesthetics;
- how the design remains accessible and functional at supported desktop sizes.

Do not initiate a separate full-brand/design-system program merely because this document exists. Establish concrete tokens/components incrementally when the corresponding UX surface is actually being implemented, while keeping them coherent with this direction.
