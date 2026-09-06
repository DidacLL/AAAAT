import { randomUUID } from "node:crypto";

import {
  candidatureComparisonPreviewSchema,
  candidatureComparisonRequestSchema,
  candidatureComparisonResultSchema,
  providerCandidatureComparisonContextSchema,
  providerCandidatureComparisonResultSchema,
  type CandidatureComparisonPreview,
  type CandidatureComparisonRequest,
  type CandidatureComparisonResult,
  type ProviderCandidatureComparisonContext,
} from "../shared/candidature-comparison-contracts";
import type { CandidatureRuntimeValue } from "../shared/contracts";
import { requireAiConnectionForOperation } from "./ai-connection-service";
import { createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";
import { listCandidatureFields } from "./candidature-field-service";
import { getCandidature } from "./candidature-service";

export class CandidatureComparisonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureComparisonError";
  }
}

interface ComparisonProjection {
  readonly preview: CandidatureComparisonPreview;
  readonly providerContext: ProviderCandidatureComparisonContext;
  readonly candidatureIdsByRef: ReadonlyMap<string, string>;
  readonly tokenMap: ReadonlyMap<string, string>;
}

function runtimeStrings(value: CandidatureRuntimeValue): string[] {
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function tokenFactory(tokenMap: Map<string, string>, forbidden: readonly string[]) {
  const blocked = [...forbidden];
  return (value: string): string => {
    let placeholder: string;
    do {
      placeholder = `[AAAT_PRIVATE_${randomUUID()}]`;
    } while (tokenMap.has(placeholder) || blocked.some((text) => text.includes(placeholder)));
    tokenMap.set(placeholder, value);
    blocked.push(value, placeholder);
    return placeholder;
  };
}

function tokenRuntimeValue(
  value: CandidatureRuntimeValue,
  token: (value: string) => string,
): CandidatureRuntimeValue {
  return Array.isArray(value) ? value.map((item) => token(String(item))) : token(String(value));
}

function localChoiceLabels(
  choices: ReadonlyMap<string, string>,
  value: CandidatureRuntimeValue,
): CandidatureRuntimeValue {
  if (choices.size === 0) return value;
  const label = (candidate: string | number | boolean) =>
    typeof candidate === "string" ? (choices.get(candidate) ?? candidate) : candidate;
  return Array.isArray(value) ? value.map(label) : label(value);
}

function projectionFor(
  rootPath: string,
  request: CandidatureComparisonRequest,
): ComparisonProjection {
  const connection = requireAiConnectionForOperation(rootPath, "candidature_comparison");
  const fieldConfigurations = listCandidatureFields(rootPath);
  const fields = new Map(fieldConfigurations.map((field) => [field.definition.id, field]));
  const tokenMap = new Map<string, string>();
  const candidatureIdsByRef = new Map<string, string>();
  const scope = `aaaat_comparison_${randomUUID()}`;

  const selected = request.candidatureIds.map((candidatureId) => {
    try {
      return getCandidature(rootPath, candidatureId);
    } catch {
      throw new CandidatureComparisonError("A selected candidature no longer exists.");
    }
  });
  const privacyCorpus = [
    ...selected.map((candidature) => candidature.label),
    ...selected.flatMap((candidature) =>
      candidature.values.flatMap((retained) => runtimeStrings(retained.value)),
    ),
    ...fieldConfigurations.map((field) => field.definition.label),
  ];
  const tokenMapFactory = tokenFactory(tokenMap, privacyCorpus);

  const entries = selected.map((candidature, index) => {
    const providerLabel = `Candidature ${index + 1}`;
    const information = candidature.values.flatMap((retained) => {
      const field = fields.get(retained.fieldId);
      if (!field || field.preferences.aiContextMode === "omit") return [];
      const choices = new Map(
        field.definition.choices.map((choice) => [choice.id, choice.label]),
      );
      const projected =
        field.preferences.aiContextMode === "token"
          ? tokenRuntimeValue(retained.value, tokenMapFactory)
          : retained.value;
      return [
        {
          label: field.definition.label,
          value: localChoiceLabels(choices, projected),
        },
      ];
    });
    return {
      candidatureId: candidature.id,
      localLabel: candidature.label,
      providerLabel,
      information,
    };
  });

  const providerEntries = entries.map((entry, index) => {
    const candidatureRef = `${scope}_${index + 1}`;
    candidatureIdsByRef.set(candidatureRef, entry.candidatureId);
    return {
      candidatureRef,
      label: entry.providerLabel,
      information: entry.information,
    };
  });

  return {
    preview: candidatureComparisonPreviewSchema.parse({ connection, entries }),
    providerContext: providerCandidatureComparisonContextSchema.parse({
      candidatures: providerEntries,
    }),
    candidatureIdsByRef,
    tokenMap,
  };
}

function rehydrate(value: string, tokenMap: ReadonlyMap<string, string>): string {
  if (tokenMap.size === 0) return value;
  const escaped = [...tokenMap.keys()]
    .sort((left, right) => right.length - left.length)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(escaped.join("|"), "g");
  return value.replace(pattern, (token) => tokenMap.get(token) ?? token);
}

export function previewCandidatureComparison(
  rootPath: string,
  rawRequest: CandidatureComparisonRequest,
): CandidatureComparisonPreview {
  const request = candidatureComparisonRequestSchema.parse(rawRequest);
  return projectionFor(rootPath, request).preview;
}

export async function compareCandidatures(
  rootPath: string,
  rawRequest: CandidatureComparisonRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<CandidatureComparisonResult> {
  const request = candidatureComparisonRequestSchema.parse(rawRequest);
  const projection = projectionFor(rootPath, request);
  const compare = provider.compareCandidatures;
  if (!compare) {
    throw new CandidatureComparisonError(
      "The configured provider does not support candidature comparison.",
    );
  }
  const providerResult = providerCandidatureComparisonResultSchema.parse(
    await compare(projection.preview.connection, projection.providerContext),
  );
  const expectedRefs = new Set(projection.candidatureIdsByRef.keys());
  if (
    providerResult.analyses.length !== expectedRefs.size ||
    providerResult.analyses.some((analysis) => !expectedRefs.has(analysis.candidatureRef))
  ) {
    throw new CandidatureComparisonError(
      "The model comparison did not match the selected candidatures.",
    );
  }

  return candidatureComparisonResultSchema.parse({
    analyses: providerResult.analyses.map((analysis) => {
      const candidatureId = projection.candidatureIdsByRef.get(analysis.candidatureRef);
      if (!candidatureId) {
        throw new CandidatureComparisonError(
          "The model comparison referenced an unselected candidature.",
        );
      }
      return {
        candidatureId,
        strengths: analysis.strengths.map((value) => rehydrate(value, projection.tokenMap)),
        concerns: analysis.concerns.map((value) => rehydrate(value, projection.tokenMap)),
        questions: analysis.questions.map((value) => rehydrate(value, projection.tokenMap)),
      };
    }),
    considerations: providerResult.considerations.map((value) =>
      rehydrate(value, projection.tokenMap),
    ),
  });
}
