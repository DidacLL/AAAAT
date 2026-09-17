import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";

import { createCoverLetter, createWorkingCv } from "./document-domain-service";
import { createOrOpenWorkspace, withWorkspaceDatabase } from "./workspace";

const orgField = "00000000-0000-4000-8000-000000000101";
const roleField = "00000000-0000-4000-8000-000000000102";
const locationField = "00000000-0000-4000-8000-000000000103";
const compensationField = "00000000-0000-4000-8000-000000000104";
const notesField = "00000000-0000-4000-8000-000000000106";

export function createDemoWorkspace(rootPath: string) {
  if (readdirSync(rootPath).length > 0) throw new Error("Demo data can only be created in an empty folder.");
  const workspace = createOrOpenWorkspace(rootPath);
  const now = new Date().toISOString();
  const first = randomUUID();
  const second = randomUUID();
  const languageField = randomUUID();
  const tags = [
    { id: randomUUID(), name: "Remote", definition: "Remote-friendly opportunity." },
    { id: randomUUID(), name: "Backend", definition: "Backend/platform engineering work." },
    { id: randomUUID(), name: "ML", definition: "Machine-learning product work." },
  ];

  withWorkspaceDatabase(workspace.rootPath, (database) => {
    database.exec("BEGIN IMMEDIATE");
    try {
      database.prepare("INSERT INTO workspace_metadata(key, value) VALUES (?, ?)").run("workspace.demo", "1");
      database.prepare(`INSERT INTO candidature_fields(
        id, system_key, label, description, value_type, cardinality, options_json, enabled, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, 'text', 'many', '[]', 1, ?, ?)`)
        .run(languageField, "Languages", "Languages required or useful for the opportunity.", now, now);
      database.prepare(`INSERT INTO candidature_field_preferences(
        field_id, focus_visible, focus_order, focus_prominence, ai_use_allowed
      ) VALUES (?, 0, NULL, 'normal', 1)`).run(languageField);

      const insertCandidature = database.prepare(
        "INSERT INTO candidatures(id, archived, opportunity_research_selected, created_at, updated_at) VALUES (?, 0, 0, ?, ?)",
      );
      insertCandidature.run(first, now, now);
      insertCandidature.run(second, now, now);
      const value = database.prepare(`INSERT INTO candidature_field_values(
        candidature_id, field_id, value_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`);
      const setValues = (id: string, rows: readonly [string, unknown][]) => {
        for (const [fieldId, item] of rows) value.run(id, fieldId, JSON.stringify(item), now, now);
      };
      setValues(first, [
        [orgField, "Northstar Labs"], [roleField, "Platform Engineer"], [locationField, "Spain · Remote"],
        [compensationField, "€55k–€70k"], [languageField, ["English", "Spanish"]],
        [notesField, "Fictional demo application. Recruiter screen expected next week."],
      ]);
      setValues(second, [
        [orgField, "Lumen Health"], [roleField, "ML Product Engineer"], [locationField, "Barcelona · Hybrid"],
        [languageField, ["English"]], [notesField, "Fictional demo application. Portfolio link requested."],
      ]);
      const source = database.prepare(`INSERT INTO candidature_sources(
        id, candidature_id, kind, title, url, source_text, created_at, updated_at
      ) VALUES (?, ?, 'job_posting', ?, ?, ?, ?, ?)`);
      source.run(randomUUID(), first, "Platform Engineer — Northstar Labs", "https://example.test/northstar-platform",
        `<main><h1>Platform Engineer</h1><p>Northstar Labs builds developer infrastructure for distributed teams.</p><p>We are looking for experience with TypeScript, APIs, PostgreSQL and production observability.</p><p>English is required. Spanish is useful.</p><p>Remote within Spain. Salary €55,000–€70,000.</p></main>`, now, now);
      source.run(randomUUID(), second, "ML Product Engineer — Lumen Health", "https://example.test/lumen-ml",
        `<article><h1>ML Product Engineer</h1><p>Build user-facing ML workflows with Python and TypeScript.</p><p>Experience shipping models is valued; healthcare experience is helpful but not required.</p><p>English required. Hybrid in Barcelona.</p></article>`, now, now);

      for (const tag of tags) {
        database.prepare(`INSERT INTO tags(id, name, definition, notes, aliases_json, created_at, updated_at)
          VALUES (?, ?, ?, '', '[]', ?, ?)`).run(tag.id, tag.name, tag.definition, now, now);
      }

      const organisations = ["Aster Dynamics", "Boreal Systems", "Cinder Works", "Deepfield Research", "Eon Transit", "Faro Robotics", "Granite Health", "Helix Energy", "Ion Cartography", "Juniper Studio", "Kepler Tools", "Morrow Labs"];
      const roles = ["Backend Engineer", "Platform Engineer", "Product Engineer", "Data Engineer", "Systems Engineer", "Developer Tools Engineer", "ML Engineer", "Technical Product Specialist"];
      const locations = ["Madrid · Hybrid", "Barcelona · On site", "Spain · Remote", "Remote EU", "Valencia · Hybrid", "Bilbao · On site"];
      const demoIds: string[] = [];
      for (let index = 0; index < 126; index += 1) {
        const id = randomUUID();
        demoIds.push(id);
        const date = new Date(Date.now() - (index + 2) * 3_600_000).toISOString();
        const organisation = organisations[index % organisations.length]!;
        const role = roles[index % roles.length]!;
        const location = locations[index % locations.length]!;
        insertCandidature.run(id, date, date);
        setValues(id, [
          [orgField, organisation], [roleField, role], [locationField, location],
          ...(index % 4 === 0 ? [[compensationField, `€${String(42 + (index % 8) * 4)}k–€${String(52 + (index % 8) * 4)}k`] as [string, unknown]] : []),
          [languageField, index % 3 === 0 ? ["English", "Spanish"] : ["English"]],
          ...(index % 5 === 0 ? [[notesField, `Demo note ${String(index + 1)}: follow up on team scope and ownership.`] as [string, unknown]] : []),
        ]);
        if (index % 3 === 0) {
          source.run(randomUUID(), id, `${role} — ${organisation}`, `https://example.test/demo-${String(index + 1)}`,
            `<article><h1>${role}</h1><p>${organisation} is hiring for its product engineering group.</p><p>Work from ${location}. The role values practical delivery, clear communication and reliable systems.</p></article>`, date, date);
        }
      }
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(first, tags[0]!.id);
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(first, tags[1]!.id);
      database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)").run(second, tags[2]!.id);
      const assignTag = database.prepare("INSERT INTO candidature_tags(candidature_id, tag_id) VALUES (?, ?)");
      for (const [index, id] of demoIds.entries()) assignTag.run(id, tags[index % tags.length]!.id);

      const profile = database.prepare(`INSERT INTO profile_items(
        id, kind, title, subtitle, description, start_date, end_date, url, sort_order, ai_use_allowed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, 1, ?, ?)`);
      profile.run(randomUUID(), "identity", "Alex Morgan", "Software engineer", "Backend systems, developer tooling and practical ML products.", 0, now, now);
      profile.run(randomUUID(), "contact", "alex.morgan@example.test", "Email", "Madrid, Spain", 1, now, now);
      profile.run(randomUUID(), "experience", "Software Engineer", "Example Cooperative", "Built TypeScript services, PostgreSQL data flows and internal automation used by distributed teams.", 2, now, now);
      profile.run(randomUUID(), "education", "BSc Computer Science", "Example University", "Software engineering and distributed systems.", 3, now, now);
      profile.run(randomUUID(), "skill", "Backend engineering", null, "TypeScript, Python, SQL, API design, testing and observability.", 4, now, now);
      profile.run(randomUUID(), "language", "English", "Professional working proficiency", null, 5, now, now);
      database.prepare(`UPDATE career_context SET career_direction = ?, objectives = ?, constraints_text = ?, target_roles = ?, target_markets_locations = ?, work_preferences = ?, application_writing_preferences = ?, updated_at = ? WHERE id = 1`)
        .run("Backend/platform or ML product engineering.", "Find a product team with strong engineering ownership.", "Prefer Spain or remote EU roles.", "Backend Engineer; Platform Engineer; ML Product Engineer", "Spain; Remote EU", "Small-to-medium product teams; pragmatic engineering culture.", "Concise, concrete, avoid inflated claims.", now);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  });

  createWorkingCv(workspace.rootPath, {
    title: "Demo application CV",
    language: "en",
    candidatureId: first,
    source: { kind: "profile" },
  });
  createCoverLetter(workspace.rootPath, {
    candidatureId: first,
    title: "Demo cover letter",
    language: "en",
    recipient: "Hiring team",
    subject: "Platform Engineer application",
    bodyParagraphs: [
      "I am interested in the fictional Platform Engineer role because it matches my backend and developer-tooling experience.",
      "My recent work includes TypeScript services, PostgreSQL workflows and production automation for distributed teams.",
    ],
    closing: "Kind regards",
  });
  return workspace;
}
