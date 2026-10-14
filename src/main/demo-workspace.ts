import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";

import { createCoverLetter, createCvTemplate, createWorkingCv } from "./document-domain-service";
import { createProfileVariant } from "./profile-variant-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "./workspace";

const orgField = "00000000-0000-4000-8000-000000000101";
const roleField = "00000000-0000-4000-8000-000000000102";
const locationField = "00000000-0000-4000-8000-000000000103";
const compensationField = "00000000-0000-4000-8000-000000000104";
const notesField = "00000000-0000-4000-8000-000000000106";

const demoTags = [
  { name: "Community", definition: "Work that connects people with local services, activities or mutual support." },
  { name: "Hybrid", definition: "A mix of workplace and home working. Check the actual days before applying." },
  { name: "Remote", definition: "Work away from the employer's premises. Geographic restrictions still matter." },
  { name: "Writing", definition: "Clear writing and editing are central to the work." },
  { name: "Public-facing", definition: "Regular, direct contact with visitors, customers or participants." },
  { name: "Human-readable", definition: "A posting that describes the work before describing its passion for describing the work." },
] as const;

type DemoTagName = typeof demoTags[number]["name"];

interface DemoOpportunity {
  readonly organisation?: string;
  readonly role?: string;
  readonly location?: string;
  readonly compensation?: string;
  readonly languages?: readonly string[];
  readonly notes?: string;
  readonly tags: readonly DemoTagName[];
  readonly source: {
    readonly kind: "job_posting" | "recruiter_message";
    readonly title: string;
    readonly url?: string;
    readonly text: string;
  };
}

const demoOpportunities: readonly DemoOpportunity[] = [
  {
    organisation: "Common Ground Cooperative",
    role: "Community Programmes Coordinator",
    location: "Manchester, UK · Hybrid",
    compensation: "£32,000–£36,000",
    languages: ["English", "Spanish"],
    notes: "Neighbourhood House workshops and volunteer coordination are the strongest examples. Ask how programme decisions involve residents.",
    tags: ["Community", "Hybrid", "Human-readable"],
    source: {
      kind: "job_posting",
      title: "Community Programmes Coordinator — Common Ground Cooperative",
      url: "https://example.test/common-ground",
      text: "Common Ground Cooperative\nCommunity Programmes Coordinator\nManchester, UK · Hybrid · £32,000–£36,000\n\nHelp residents turn ideas into useful neighbourhood activities. You will plan a monthly programme, support volunteer facilitators, keep a modest events budget and write clear updates for participants. Two days each week are based at our community hub; the other days can be worked from home. Some evening events are agreed in advance.\n\nWe value practical organising experience, inclusive communication and confidence working with people of different ages. English is needed for the role; Spanish is useful for some community sessions. A collaborative team. We checked: actual people.\n\nSend a CV and a short letter describing one activity you helped make happen.",
    },
  },
  {
    organisation: "Second Draft Studio",
    role: "Editorial & Content Coordinator",
    location: "Remote · UK",
    compensation: "£30,000–£34,000",
    languages: ["English"],
    notes: "Use the plain-language guides and monthly newsletter examples. Ask whether the role includes commissioning or mainly editing.",
    tags: ["Remote", "Writing"],
    source: {
      kind: "job_posting",
      title: "Editorial & Content Coordinator — Second Draft Studio",
      url: "https://example.test/second-draft",
      text: "Second Draft Studio makes useful guides for charities and small cultural organisations. We need someone to coordinate a publishing calendar, edit contributors' drafts and turn interviews into readable articles. Remote within the UK, £30,000–£34,000. Occasional travel for interviews is reimbursed. Please include two writing samples. The first draft may be messy; the published one should help somebody.",
    },
  },
  {
    organisation: "Actually Human Museum",
    role: "Visitor Experience Coordinator",
    location: "Leeds, UK · On site",
    compensation: "£28,500–£31,000",
    languages: ["English"],
    notes: "Recruiter: Sam Ellis, sam.ellis@example.test. Lantern Arts Centre visitor support is relevant. Clarify the weekend rota and access-training budget.",
    tags: ["Public-facing", "Human-readable"],
    source: {
      kind: "recruiter_message",
      title: "Sam's museum role introduction",
      text: "Hi Alex, I'm helping Actually Human Museum recruit a Visitor Experience Coordinator in Leeds. The role supports the welcome desk, trains seasonal colleagues and improves information for visitors who need access adjustments. Your arts-centre background looks relevant. Salary £28,500–£31,000; on site, including two weekends per month. Would you like the full brief? — Sam Ellis, sam.ellis@example.test",
    },
  },
  {
    tags: ["Community", "Public-facing"],
    source: {
      kind: "recruiter_message",
      title: "Library services — brief recruiter message",
      text: "Hi Alex — a library service near Manchester may need a community outreach assistant for a six-month reading programme. The brief isn't ready yet, and I don't have confirmed hours or pay. Interested in seeing it when it arrives? — Jo, jo.recruiter@example.test",
    },
  },
  {
    organisation: "Open Door Events",
    role: "Events & Volunteer Coordinator",
    location: "Sheffield, UK",
    compensation: "£29,000–£32,000",
    notes: "Translate ‘wear many hats’ into hours and responsibilities.",
    tags: ["Community", "Public-facing"],
    source: {
      kind: "job_posting",
      title: "Events & Volunteer Coordinator — Open Door Events",
      url: "https://example.test/open-door",
      text: "Organise accessible neighbourhood festivals and support a pool of volunteer stewards. You will manage bookings, brief helpers and keep suppliers informed. £29,000–£32,000 in Sheffield. The advert says you will ‘wear many hats’; ask which ones are part of the contract.",
    },
  },
  {
    organisation: "Table Together Food Bank",
    role: "Community Operations Assistant",
    location: "Salford, UK · On site",
    compensation: "£26,500",
    notes: "Part-time, 28 hours. Check whether the stated pay is full-time equivalent.",
    tags: ["Community"],
    source: {
      kind: "job_posting",
      title: "Community Operations Assistant — Table Together Food Bank",
      text: "Support food-bank sessions, coordinate volunteer shifts and maintain simple stock records. Work with partner organisations so visitors receive useful signposting. Salford, 28 hours per week; advertised salary £26,500. The posting does not say whether that figure is pro rata.",
    },
  },
  {
    organisation: "Good Neighbour Customer Care",
    role: "Customer Support Adviser",
    location: "Remote · UK",
    compensation: "£27,000–£29,000",
    tags: ["Remote", "Public-facing"],
    source: {
      kind: "job_posting",
      title: "Customer Support Adviser — Good Neighbour Customer Care",
      url: "https://example.test/good-neighbour",
      text: "Answer customer questions by phone and email for a small homewares business. Explain delivery options clearly, resolve problems and share recurring issues with the operations team. Remote within the UK. £27,000–£29,000. Training provided; no sales targets.",
    },
  },
  {
    organisation: "Mend & Make Workshop",
    role: "Repair Workshop Coordinator",
    location: "Manchester, UK",
    notes: "The coordination role is interesting; ask which repairs require a qualified technician.",
    tags: ["Community", "Public-facing"],
    source: {
      kind: "job_posting",
      title: "Repair Workshop Coordinator — Mend & Make Workshop",
      text: "Book repair sessions, welcome visitors and help volunteer repairers keep the bench running smoothly. This is a coordination role, not an electrical-repair qualification. Manchester, three days a week. Pay and days to be discussed.",
    },
  },
  {
    organisation: "Plain Ledger Cooperative",
    role: "Bookkeeping & Office Assistant",
    location: "Stockport, UK · Hybrid",
    compensation: "£25,000–£28,000",
    notes: "A possible change of direction. Budget tracking is relevant, but formal bookkeeping training would be needed.",
    tags: ["Hybrid"],
    source: {
      kind: "job_posting",
      title: "Bookkeeping & Office Assistant — Plain Ledger Cooperative",
      url: "https://example.test/plain-ledger",
      text: "Keep purchase records tidy, reconcile supplier invoices and help a small cooperative office stay organised. Stockport, hybrid after induction. £25,000–£28,000. Spreadsheet confidence is essential; introductory bookkeeping training is included.",
    },
  },
  {
    organisation: "Wild Patch Landscapes",
    role: "Community Garden Coordinator",
    location: "Greater Manchester, UK · Outdoors",
    languages: ["English"],
    notes: "Ask about outdoor duties, seasonal hours and horticultural support. Do not imply a qualification Alex does not hold.",
    tags: ["Community"],
    source: {
      kind: "job_posting",
      title: "Community Garden Coordinator — Wild Patch Landscapes",
      text: "Bring residents and volunteer gardeners together across three community plots. Plan sessions, arrange materials and work with the lead horticulturist on accessible activities. Based outdoors across Greater Manchester. No salary information supplied.",
    },
  },
  {
    organisation: "Step by Step Learning",
    role: "Training Programme Administrator",
    location: "Bolton, UK · Hybrid",
    compensation: "£28,000–£30,000",
    tags: ["Hybrid", "Writing"],
    source: {
      kind: "job_posting",
      title: "Training Programme Administrator — Step by Step Learning",
      url: "https://example.test/step-by-step",
      text: "Coordinate enrolment and attendance for adult-learning programmes. Keep learner information accurate, prepare clear joining instructions and support tutors with room bookings. Bolton, hybrid, £28,000–£30,000. Experience helping people navigate an unfamiliar service is valued.",
    },
  },
  {
    organisation: "Small Signal Tools",
    role: "Technical Support & Documentation Assistant",
    location: "Remote · UK",
    compensation: "£29,000–£33,000",
    notes: "An exploratory option: clear instructions and spreadsheet experience transfer, but product training is important.",
    tags: ["Remote", "Writing"],
    source: {
      kind: "job_posting",
      title: "Technical Support & Documentation Assistant — Small Signal Tools",
      url: "https://example.test/small-signal",
      text: "Help customers use our scheduling software and keep its help pages understandable. Reproduce reported problems, explain workarounds and improve setup instructions with the development team. Remote in the UK, £29,000–£33,000. This is a support and writing role; programming experience is useful, not required.",
    },
  },
];

export function createDemoWorkspace(rootPath: string) {
  if (readdirSync(rootPath).length > 0) throw new Error("Demo data can only be created in an empty folder.");
  const workspace = createOrOpenWorkspace(rootPath);
  const now = new Date().toISOString();
  const languageField = randomUUID();
  const opportunities = demoOpportunities.map(opportunity => ({ ...opportunity, id: randomUUID() }));
  const tags = demoTags.map(tag => ({ ...tag, id: randomUUID() }));
  const programmeExperienceId = randomUUID();

  withWorkspaceDatabase(workspace.rootPath, (database) => {
    database.exec("BEGIN IMMEDIATE");
    try {
      database.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)").run("workspace.demo", "1");
      database.prepare(`INSERT INTO candidature_fields(
        id, system_key, label, description, value_type, cardinality, options_json, enabled, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, 'text', 'many', '[]', 1, ?, ?)`)
        .run(languageField, "Languages", "Languages required or useful for the opportunity.", now, now);
      database.prepare(`INSERT INTO candidature_field_preferences(
        field_id, favourite, favourite_order, presentation_size, ai_use_allowed
      ) VALUES (?, 0, NULL, 'normal', 1)`).run(languageField);

      for (const tag of tags) {
        database.prepare(`INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at)
          VALUES (?, ?, ?, '', '[]', ?, ?)`).run(tag.id, tag.name, tag.definition, now, now);
      }

      const insertCandidature = database.prepare(
        "INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?, 0, 0, ?, ?)",
      );
      const value = database.prepare(`INSERT INTO candidature_field_values(
        candidature_id, field_id, value_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`);
      const source = database.prepare(`INSERT INTO candidature_sources(
        id, candidature_id, kind, title, url, source_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const assignTag = database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)");

      for (const [index, opportunity] of opportunities.entries()) {
        const date = new Date(Date.parse(now) - index * 3_600_000).toISOString();
        insertCandidature.run(opportunity.id, date, date);
        const values: readonly [string, unknown][] = [
          [orgField, opportunity.organisation], [roleField, opportunity.role],
          [locationField, opportunity.location], [compensationField, opportunity.compensation],
          [languageField, opportunity.languages], [notesField, opportunity.notes],
        ];
        for (const [fieldId, item] of values) {
          if (item !== undefined) value.run(opportunity.id, fieldId, JSON.stringify(item), date, date);
        }
        source.run(randomUUID(), opportunity.id, opportunity.source.kind, opportunity.source.title,
          opportunity.source.url ?? "", opportunity.source.text, date, date);
        for (const name of opportunity.tags) {
          assignTag.run(opportunity.id, tags.find(tag => tag.name === name)!.id);
        }
      }

      const profile = database.prepare(`INSERT INTO profile_items(
        id, kind, title, subtitle, description, start_date, end_date, url, sort_order, ai_use_allowed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, ?, ?)`);
      profile.run(randomUUID(), "identity", "Alex Morgan", "Community & communications coordinator",
        "Practical programmes, clear information and a welcoming first point of contact.", null, null, 0, now, now);
      profile.run(randomUUID(), "contact", "alex.morgan@example.test", "Email",
        null, null, null, 1, now, now);
      profile.run(randomUUID(), "contact", "Manchester, UK", "Location",
        null, null, null, 2, now, now);
      profile.run(programmeExperienceId, "experience", "Community Programmes Coordinator", "Neighbourhood House",
        "Plan monthly workshops with resident groups, brief 24 volunteers and track a £18,000 annual activities budget. Introduced clearer booking instructions and a shared session calendar; average attendance grew from 18 to 27 participants over one year.",
        "2022-04", null, 3, now, now);
      profile.run(randomUUID(), "experience", "Visitor Services & Communications Assistant", "Lantern Arts Centre",
        "Welcomed visitors, coordinated front-desk rotas and wrote plain-language event guides. Worked with colleagues to improve access information and produced a monthly newsletter for 1,200 subscribers.",
        "2019-09", "2022-03", 4, now, now);
      profile.run(randomUUID(), "education", "BA Community Development", "Greenfield College",
        "Community participation, inclusive programme design and practical project coordination.",
        "2016-09", "2019-06", 5, now, now);
      profile.run(randomUUID(), "skill", "Programme coordination", null,
        "Volunteer briefings, event planning, small-budget tracking and participant feedback.",
        null, null, 6, now, now);
      profile.run(randomUUID(), "skill", "Clear communication", null,
        "Plain-language writing, newsletter editing, spreadsheets and accessible joining instructions.",
        null, null, 7, now, now);
      profile.run(randomUUID(), "language", "English", "Fluent",
        null, null, null, 8, now, now);
      profile.run(randomUUID(), "language", "Spanish", "Conversational",
        "Comfortable welcoming participants and explaining everyday practical information.",
        null, null, 9, now, now);
      profile.run(randomUUID(), "Community work", "Volunteer Coordinator", "Riverside Repair Café",
        "Organise a monthly repair café with eight volunteer repairers, welcome visitors and record which items were repaired. Coordinate sessions; qualified volunteers handle electrical repairs.",
        "2021-06", null, 10, now, now);
      database.prepare(`UPDATE career_context SET career_direction = ?, objectives = ?, constraints_text = ?, target_roles = ?, target_markets_locations = ?, work_preferences = ?, application_writing_preferences = ?, updated_at = ? WHERE id = 1`)
        .run("Community programmes and communications, with room to grow in public-facing coordination.",
          "Help people access useful services and make local activities easier to take part in.",
          "Prefer Manchester or UK-remote work. Agree evening and weekend duties in advance.",
          "Community Programmes Coordinator; Editorial & Content Coordinator; Visitor Experience Coordinator",
          "Greater Manchester; UK remote; Leeds if the role and travel work together.",
          "Clear responsibilities, inclusive teams and time to do useful work well.",
          "Concrete examples. No rockstars, ninjas or ‘dynamic synergy’.", now);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  });

  const publicFacing = createProfileVariant(workspace.rootPath, {
    itemId: programmeExperienceId,
    name: "Public-facing emphasis",
    content: {
      title: "Community Programmes Coordinator",
      subtitle: "Neighbourhood House",
      description: "Welcome participants, support volunteer facilitators and make workshop information easy to understand. Introduced clearer booking instructions; average session attendance grew from 18 to 27. Plan a monthly programme with residents and coordinate 24 volunteers.",
      startDate: "2022-04",
    },
  });
  const generalCv = createWorkingCv(workspace.rootPath, {
    title: "Alex Morgan · General CV",
    language: "en",
    candidatureId: null,
    source: { kind: "profile" },
  });
  const collections = createCvTemplate(workspace.rootPath, {
    name: "Community & communications",
    language: "en",
    pdfMetadata: { title: "Alex Morgan — CV", author: "Alex Morgan", subject: "Community and communications", keywords: "" },
    sections: generalCv.sections.map(section => ({
      id: randomUUID(),
      name: section.name,
      presentationRole: section.name === "Profile" ? "header" : section.name === "Skills" || section.name === "Languages" ? "secondary" : "main",
      items: section.items.map(item => item.profileItemId === programmeExperienceId ? {
        id: randomUUID(),
        sourceMode: "variant" as const,
        profileItemId: programmeExperienceId,
        profileVariantId: publicFacing.id,
      } : {
        id: randomUUID(),
        sourceMode: "current" as const,
        profileItemId: item.profileItemId!,
      }),
    })),
  });
  createWorkingCv(workspace.rootPath, {
    title: "Common Ground · Alex Morgan CV",
    language: "en",
    candidatureId: opportunities[0]!.id,
    source: { kind: "template", templateId: collections.templates[0]!.id },
  });
  createCoverLetter(workspace.rootPath, {
    candidatureId: opportunities[0]!.id,
    title: "Common Ground · Cover letter",
    language: "en",
    recipient: "Common Ground Cooperative hiring team",
    subject: "Application for Community Programmes Coordinator",
    bodyParagraphs: [
      "I would like to bring my community-programme and communications experience to Common Ground Cooperative. Your focus on helping residents shape useful neighbourhood activities matches the work I enjoy at Neighbourhood House.",
      "In my current role, I plan monthly workshops, coordinate 24 volunteers and track an £18,000 annual activities budget. By simplifying booking information and sharing a clear session calendar, I helped average attendance grow from 18 to 27 participants over one year.",
      "At Lantern Arts Centre, I supported visitors and wrote plain-language event guides and a monthly newsletter. I would use that experience to make your programme welcoming and its information easy to act on. I speak fluent English and conversational Spanish.",
      "I would welcome the opportunity to discuss how I could support your residents and volunteer facilitators. Thank you for considering my application.",
    ],
    closing: "Kind regards",
  });
  return workspace;
}
