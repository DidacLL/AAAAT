export interface JourneyScenario {
  readonly id: string;
  readonly title: string;
  readonly mode: "direct" | "chat" | "mcp";
  readonly journey: string;
  readonly scenarioClass: string;
  readonly prompt: string;
}
export declare const journeyScenarios: Readonly<Record<"direct" | "chat" | "mcp", readonly JourneyScenario[]>>;
export declare function selectedScenarios(
  mode: "direct" | "chat" | "mcp",
  ids?: readonly string[],
): JourneyScenario[];
export declare const allJourneys: readonly string[];
