import { invokeLLM } from "./_core/llm";
import type { GameStateData, TurnReportData, Bill, Decision, WorldEvent, FactionState, DiplomaticRelation } from "../shared/gameTypes";
import { MONTH_NAMES } from "../shared/gameTypes";

export interface TurnInput {
  countryCode: string;
  countryName: string;
  startYear: number;
  turnNumber: number;
  year: number;
  month: number;
  currentState: GameStateData;
  previousDecisions?: {
    decisions: { decisionId: string; choiceId: string; choiceLabel: string }[];
    legislationVotes: { billId: string; vote: string; billTitle: string }[];
    diplomaticActions: { action: string; targetCountry: string }[];
    militaryOrders: { order: string; details: string }[];
  };
  previousHeadline?: string;
}

function buildSystemPrompt(): string {
  return `You are a ruthless, sarcastic geopolitical simulation engine. You simulate governing a real country with absolute realism. No fantasy. No arcade mechanics. Real macroeconomics, real political incentives, real military logic.

RULES:
- Elites steal. Allies betray. Business flees at risk. Bureaucracies resist reform.
- Economic outcomes depend on demographics, productivity, logistics, energy, debt, trust, corruption, institutions.
- Wars damage economies, create refugees, increase debt, radicalize populations.
- Nuclear powers avoid irrational escalation unless facing internal collapse.
- Populations react emotionally to inflation, food prices, unemployment, propaganda, casualties.
- Strong countries feel structurally powerful. Weak countries feel weak.

You must respond with ONLY valid JSON matching the exact schema provided. No markdown code blocks. No extra text. Pure JSON.`;
}

function buildUserPrompt(input: TurnInput): string {
  const monthName = MONTH_NAMES[input.month - 1];
  const s = input.currentState;

  const prevDecisionsText = input.previousDecisions
    ? `\n\nPLAYER'S PREVIOUS DECISIONS (Turn ${input.turnNumber - 1}):
${input.previousDecisions.decisions.map(d => `- Policy: ${d.choiceLabel}`).join('\n')}
${input.previousDecisions.legislationVotes.map(v => `- Legislation "${v.billTitle}": ${v.vote}`).join('\n')}
${input.previousDecisions.diplomaticActions.map(a => `- Diplomacy vs ${a.targetCountry}: ${a.action}`).join('\n')}
${input.previousDecisions.militaryOrders.map(o => `- Military: ${o.order} — ${o.details}`).join('\n')}`
    : '';

  return `SIMULATION: ${input.countryName} (${input.countryCode}), Turn #${input.turnNumber}, ${monthName} ${input.year}
Game started: ${input.startYear}

CURRENT STATE:
GDP: $${s.gdpNominal.toFixed(0)}B (${s.gdpGrowth > 0 ? '+' : ''}${s.gdpGrowth.toFixed(2)}% m/m)
GDP per capita: $${s.gdpPerCapita.toFixed(0)}
Population: ${s.population.toFixed(2)}M
Inflation: ${s.inflation.toFixed(1)}% y/y
Unemployment: ${s.unemployment.toFixed(1)}%
Treasury: $${s.treasuryBalance.toFixed(1)}B
National Debt: $${s.nationalDebt.toFixed(0)}B
Central Bank Rate: ${s.centralBankRate.toFixed(2)}%
Trade Balance: $${s.tradeBalance.toFixed(1)}B
Foreign Reserves: $${s.foreignReserves.toFixed(1)}B
Currency vs USD: ${s.currencyRate.toFixed(4)}
Stock Index: ${s.stockIndex.toFixed(0)} (${s.stockIndexChange > 0 ? '+' : ''}${s.stockIndexChange.toFixed(1)}%)
Approval Rating: ${s.approvalRating.toFixed(1)}%
Avg Salary: $${s.avgSalaryUsd.toFixed(0)}/mo
Military Budget: ${s.militaryBudgetPct.toFixed(1)}% GDP
Military Personnel: ${s.militaryPersonnel.toLocaleString()}
Military Strength Index: ${s.militaryStrength.toFixed(1)}/100

FACTIONS:
${s.factions.map(f => `- ${f.name}: loyalty ${f.loyalty > 0 ? '+' : ''}${f.loyalty}/10, influence ${f.influence}/10`).join('\n')}

DIPLOMATIC RELATIONS (top 8):
${s.diplomaticRelations.slice(0, 8).map(r => `- ${r.countryName}: ${r.status} (score: ${r.relationScore})`).join('\n')}

ACTIVE CONFLICTS: ${s.activeConflicts.length === 0 ? 'None' : s.activeConflicts.map(c => c.name).join(', ')}
${prevDecisionsText}

Generate the monthly turn report for ${monthName} ${input.year}. Apply realistic consequences of previous decisions. Generate 1 global world event, update all economic indicators realistically (use uneven numbers, not round figures), propose 3-4 policy decisions for the player, generate 2-3 bills from the legislature, and update faction loyalties based on events.

Respond with JSON matching this exact schema:
{
  "headline": "string (dramatic 5-10 word headline for this month)",
  "reportMarkdown": "string (full markdown report with sections: ## Monthly Overview, ## Economic Indicators, ## Political Climate, ## World Affairs, ## Intelligence Briefing — be specific with numbers, sarcastic tone, no fluff)",
  "gdpGrowth": number,
  "gdpNominal": number,
  "gdpPerCapita": number,
  "inflation": number,
  "unemployment": number,
  "treasuryBalance": number,
  "nationalDebt": number,
  "centralBankRate": number,
  "tradeBalance": number,
  "foreignReserves": number,
  "currencyRate": number,
  "stockIndex": number,
  "stockIndexChange": number,
  "population": number,
  "approvalRating": number,
  "avgSalaryUsd": number,
  "militaryBudgetPct": number,
  "militaryPersonnel": number,
  "militaryStrength": number,
  "factionUpdates": [
    { "id": "string", "loyaltyDelta": number, "reason": "string" }
  ],
  "diplomaticUpdates": [
    { "countryCode": "string", "relationDelta": number, "newStatus": "string", "notes": "string" }
  ],
  "worldEvents": [
    {
      "id": "string",
      "type": "economic|political|military|social|diplomatic|natural",
      "title": "string",
      "description": "string",
      "affectedCountries": ["string"],
      "impact": "string"
    }
  ],
  "availableDecisions": [
    {
      "id": "string",
      "category": "economic|social|military|diplomatic",
      "title": "string",
      "description": "string",
      "choices": [
        { "id": "string", "label": "string", "description": "string", "shortEffects": "string" },
        { "id": "string", "label": "string", "description": "string", "shortEffects": "string" },
        { "id": "string", "label": "string", "description": "string", "shortEffects": "string" }
      ]
    }
  ],
  "pendingLegislation": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "lobbyFor": "string",
      "lobbyAgainst": "string",
      "consequences": "string",
      "effects": {
        "approvalDelta": number,
        "gdpDelta": number,
        "inflationDelta": number,
        "factionLoyaltyDeltas": [{ "factionId": "string", "delta": number }],
        "budgetDelta": number
      },
      "status": "pending",
      "revisedOnce": false
    }
  ]
}`;
}

export async function generateTurnReport(input: TurnInput): Promise<{
  newState: GameStateData;
  headline: string;
  reportMarkdown: string;
  worldEvents: WorldEvent[];
  availableDecisions: Decision[];
  pendingLegislation: Bill[];
}> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input) },
    ],
    response_format: { type: "json_object" } as any,
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === 'string' ? rawContent : "{}";
  let data: any;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("LLM returned invalid JSON: " + content.slice(0, 200));
  }

  // Apply faction updates
  const updatedFactions: FactionState[] = input.currentState.factions.map(f => {
    const update = (data.factionUpdates || []).find((u: any) => u.id === f.id);
    if (!update) return f;
    return {
      ...f,
      loyalty: Math.max(-10, Math.min(10, f.loyalty + (update.loyaltyDelta ?? 0))),
    };
  });

  // Apply diplomatic updates
  const updatedRelations: DiplomaticRelation[] = input.currentState.diplomaticRelations.map(r => {
    const update = (data.diplomaticUpdates || []).find((u: any) => u.countryCode === r.countryCode);
    if (!update) return r;
    const newScore = Math.max(-100, Math.min(100, r.relationScore + (update.relationDelta ?? 0)));
    return {
      ...r,
      relationScore: newScore,
      status: (update.newStatus || r.status) as DiplomaticRelation["status"],
      notes: update.notes || r.notes,
    };
  });

  const newState: GameStateData = {
    gdpNominal: data.gdpNominal ?? input.currentState.gdpNominal,
    gdpGrowth: data.gdpGrowth ?? input.currentState.gdpGrowth,
    gdpPerCapita: data.gdpPerCapita ?? input.currentState.gdpPerCapita,
    inflation: data.inflation ?? input.currentState.inflation,
    unemployment: data.unemployment ?? input.currentState.unemployment,
    treasuryBalance: data.treasuryBalance ?? input.currentState.treasuryBalance,
    nationalDebt: data.nationalDebt ?? input.currentState.nationalDebt,
    centralBankRate: data.centralBankRate ?? input.currentState.centralBankRate,
    tradeBalance: data.tradeBalance ?? input.currentState.tradeBalance,
    foreignReserves: data.foreignReserves ?? input.currentState.foreignReserves,
    currencyRate: data.currencyRate ?? input.currentState.currencyRate,
    stockIndex: data.stockIndex ?? input.currentState.stockIndex,
    stockIndexChange: data.stockIndexChange ?? input.currentState.stockIndexChange,
    population: data.population ?? input.currentState.population,
    approvalRating: Math.max(0, Math.min(100, data.approvalRating ?? input.currentState.approvalRating)),
    avgSalaryUsd: data.avgSalaryUsd ?? input.currentState.avgSalaryUsd,
    militaryBudgetPct: data.militaryBudgetPct ?? input.currentState.militaryBudgetPct,
    militaryPersonnel: data.militaryPersonnel ?? input.currentState.militaryPersonnel,
    militaryStrength: Math.max(0, Math.min(100, data.militaryStrength ?? input.currentState.militaryStrength)),
    factions: updatedFactions,
    diplomaticRelations: updatedRelations,
    pendingLegislation: data.pendingLegislation ?? [],
    activeConflicts: input.currentState.activeConflicts,
  };

  return {
    newState,
    headline: data.headline ?? `${MONTH_NAMES[input.month - 1]} ${input.year} Report`,
    reportMarkdown: data.reportMarkdown ?? "Report generation failed.",
    worldEvents: data.worldEvents ?? [],
    availableDecisions: data.availableDecisions ?? [],
    pendingLegislation: data.pendingLegislation ?? [],
  };
}

// ─── Initial State Generator ──────────────────────────────────────────────────

export async function generateInitialState(countryCode: string, countryName: string, startYear: number): Promise<{
  state: GameStateData;
  headline: string;
  reportMarkdown: string;
  worldEvents: WorldEvent[];
  availableDecisions: Decision[];
  pendingLegislation: Bill[];
}> {
  const prompt = `Generate historically accurate starting data for ${countryName} (${countryCode}) in January ${startYear}.

Use real macroeconomic data. If exact data is unavailable, use realistic estimates based on historical context.

Respond with JSON:
{
  "headline": "string (dramatic opening headline for the simulation)",
  "reportMarkdown": "string (opening briefing markdown with sections: ## Welcome to Power, ## Your Nation at a Glance, ## Immediate Challenges, ## The World Around You — be specific, sarcastic, immersive)",
  "gdpNominal": number (billions USD),
  "gdpGrowth": number (% m/m, typically 0.1-0.4),
  "gdpPerCapita": number (USD),
  "inflation": number (% y/y),
  "unemployment": number (%),
  "treasuryBalance": number (billions USD, can be negative),
  "nationalDebt": number (billions USD),
  "centralBankRate": number (%),
  "tradeBalance": number (billions USD, can be negative),
  "foreignReserves": number (billions USD),
  "currencyRate": number (local currency per USD, use 1.0 if USD),
  "stockIndex": number (main stock index value),
  "stockIndexChange": number (% change, start at 0),
  "population": number (millions),
  "approvalRating": number (%, realistic starting approval),
  "avgSalaryUsd": number (monthly average salary in USD),
  "militaryBudgetPct": number (% of GDP),
  "militaryPersonnel": number (total active military),
  "militaryStrength": number (0-100 index, US=95, Russia=80, small nations=20-40),
  "factions": [
    { "id": "security", "name": "Security Forces", "loyalty": number, "influence": number, "description": "string" },
    { "id": "legislature", "name": "Legislature", "loyalty": number, "influence": number, "description": "string" },
    { "id": "business", "name": "Big Business", "loyalty": number, "influence": number, "description": "string" },
    { "id": "populists", "name": "Regional Populists", "loyalty": number, "influence": number, "description": "string" }
  ],
  "diplomaticRelations": [
    { "countryCode": "string", "countryName": "string", "relationScore": number, "status": "ally|friendly|neutral|tense|hostile|war", "tradeVolume": number, "hasSanctions": boolean, "hasAlliance": boolean, "notes": "string" }
  ],
  "pendingLegislation": [
    {
      "id": "string", "title": "string", "description": "string",
      "lobbyFor": "string", "lobbyAgainst": "string", "consequences": "string",
      "effects": { "approvalDelta": number, "gdpDelta": number, "inflationDelta": number, "factionLoyaltyDeltas": [], "budgetDelta": number },
      "status": "pending", "revisedOnce": false
    }
  ],
  "availableDecisions": [
    {
      "id": "string", "category": "economic|social|military|diplomatic", "title": "string", "description": "string",
      "choices": [
        { "id": "string", "label": "string", "description": "string", "shortEffects": "string" },
        { "id": "string", "label": "string", "description": "string", "shortEffects": "string" },
        { "id": "string", "label": "string", "description": "string", "shortEffects": "string" }
      ]
    }
  ],
  "worldEvents": [
    { "id": "string", "type": "string", "title": "string", "description": "string", "affectedCountries": [], "impact": "string" }
  ]
}

Include 8-12 diplomatic relations with the most relevant countries. Make faction names culturally appropriate for ${countryName}. Use uneven, realistic numbers (not round figures).`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" } as any,
  });

  const rawContent2 = response.choices[0]?.message?.content;
  const content = typeof rawContent2 === 'string' ? rawContent2 : "{}";
  let data: any;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("LLM returned invalid JSON for initial state");
  }

  const state: GameStateData = {
    gdpNominal: data.gdpNominal ?? 1000,
    gdpGrowth: data.gdpGrowth ?? 0.2,
    gdpPerCapita: data.gdpPerCapita ?? 10000,
    inflation: data.inflation ?? 3.0,
    unemployment: data.unemployment ?? 5.0,
    treasuryBalance: data.treasuryBalance ?? 50,
    nationalDebt: data.nationalDebt ?? 500,
    centralBankRate: data.centralBankRate ?? 4.0,
    tradeBalance: data.tradeBalance ?? 0,
    foreignReserves: data.foreignReserves ?? 100,
    currencyRate: data.currencyRate ?? 1.0,
    stockIndex: data.stockIndex ?? 1000,
    stockIndexChange: 0,
    population: data.population ?? 50,
    approvalRating: data.approvalRating ?? 45,
    avgSalaryUsd: data.avgSalaryUsd ?? 1000,
    militaryBudgetPct: data.militaryBudgetPct ?? 2.0,
    militaryPersonnel: data.militaryPersonnel ?? 100000,
    militaryStrength: data.militaryStrength ?? 40,
    factions: data.factions ?? [],
    diplomaticRelations: data.diplomaticRelations ?? [],
    pendingLegislation: data.pendingLegislation ?? [],
    activeConflicts: [],
  };

  return {
    state,
    headline: data.headline ?? `${countryName} — January ${startYear}`,
    reportMarkdown: data.reportMarkdown ?? "Welcome to power.",
    worldEvents: data.worldEvents ?? [],
    availableDecisions: data.availableDecisions ?? [],
    pendingLegislation: data.pendingLegislation ?? [],
  };
}
