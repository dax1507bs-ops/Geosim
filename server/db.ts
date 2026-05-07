import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, gameSessions, gameStates, turnReports, playerDecisions } from "../drizzle/schema";
import { ENV } from './_core/env';
import type { GameStateData, TurnReportData } from "../shared/gameTypes";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;

    for (const field of textFields) {
      const value = user[field];
      if (value === undefined) continue;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Game Sessions ───────────────────────────────────────────────────────────

export async function createGameSession(data: {
  userId: number;
  countryCode: string;
  countryName: string;
  startYear: number;
  currentYear: number;
  currentMonth: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(gameSessions).values({
    ...data,
    currentTurn: 1,
    status: "active",
  });
  return result[0].insertId as number;
}

export async function getGameSession(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).limit(1);
  return result[0];
}

export async function getUserGameSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gameSessions)
    .where(eq(gameSessions.userId, userId))
    .orderBy(desc(gameSessions.updatedAt));
}

export async function updateGameSessionTurn(sessionId: number, turn: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(gameSessions)
    .set({ currentTurn: turn, currentYear: year, currentMonth: month })
    .where(eq(gameSessions.id, sessionId));
}

// ─── Game State ───────────────────────────────────────────────────────────────

export async function upsertGameState(sessionId: number, state: GameStateData) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  const values = {
    sessionId,
    gdpNominal: state.gdpNominal,
    gdpGrowth: state.gdpGrowth,
    gdpPerCapita: state.gdpPerCapita,
    inflation: state.inflation,
    unemployment: state.unemployment,
    treasuryBalance: state.treasuryBalance,
    nationalDebt: state.nationalDebt,
    centralBankRate: state.centralBankRate,
    tradeBalance: state.tradeBalance,
    foreignReserves: state.foreignReserves,
    currencyRate: state.currencyRate,
    stockIndex: state.stockIndex,
    stockIndexChange: state.stockIndexChange,
    population: state.population,
    approvalRating: state.approvalRating,
    avgSalaryUsd: state.avgSalaryUsd,
    militaryBudgetPct: state.militaryBudgetPct,
    militaryPersonnel: state.militaryPersonnel,
    militaryStrength: state.militaryStrength,
    factions: JSON.stringify(state.factions),
    diplomaticRelations: JSON.stringify(state.diplomaticRelations),
    pendingLegislation: JSON.stringify(state.pendingLegislation),
    activeConflicts: JSON.stringify(state.activeConflicts),
  };

  await db.insert(gameStates).values(values).onDuplicateKeyUpdate({ set: values });
}

export async function getGameState(sessionId: number): Promise<GameStateData | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gameStates).where(eq(gameStates.sessionId, sessionId)).limit(1);
  if (!result[0]) return undefined;
  const row = result[0];
  return {
    gdpNominal: row.gdpNominal,
    gdpGrowth: row.gdpGrowth,
    gdpPerCapita: row.gdpPerCapita,
    inflation: row.inflation,
    unemployment: row.unemployment,
    treasuryBalance: row.treasuryBalance,
    nationalDebt: row.nationalDebt,
    centralBankRate: row.centralBankRate,
    tradeBalance: row.tradeBalance,
    foreignReserves: row.foreignReserves,
    currencyRate: row.currencyRate,
    stockIndex: row.stockIndex,
    stockIndexChange: row.stockIndexChange,
    population: row.population,
    approvalRating: row.approvalRating,
    avgSalaryUsd: row.avgSalaryUsd,
    militaryBudgetPct: row.militaryBudgetPct,
    militaryPersonnel: row.militaryPersonnel,
    militaryStrength: row.militaryStrength,
    factions: typeof row.factions === 'string' ? JSON.parse(row.factions) : (row.factions as any),
    diplomaticRelations: typeof row.diplomaticRelations === 'string' ? JSON.parse(row.diplomaticRelations) : (row.diplomaticRelations as any),
    pendingLegislation: typeof row.pendingLegislation === 'string' ? JSON.parse(row.pendingLegislation) : (row.pendingLegislation as any),
    activeConflicts: typeof row.activeConflicts === 'string' ? JSON.parse(row.activeConflicts) : (row.activeConflicts as any),
  };
}

// ─── Turn Reports ─────────────────────────────────────────────────────────────

export async function saveTurnReport(data: {
  sessionId: number;
  turnNumber: number;
  year: number;
  month: number;
  headline: string;
  reportMarkdown: string;
  worldEvents: any[];
  availableDecisions: any[];
  pendingLegislation: any[];
  stateSnapshot: GameStateData;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(turnReports).values({
    ...data,
    worldEvents: JSON.stringify(data.worldEvents),
    availableDecisions: JSON.stringify(data.availableDecisions),
    pendingLegislation: JSON.stringify(data.pendingLegislation),
    stateSnapshot: JSON.stringify(data.stateSnapshot),
  });
  return result[0].insertId as number;
}

export async function getTurnReport(sessionId: number, turnNumber: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(turnReports)
    .where(and(eq(turnReports.sessionId, sessionId), eq(turnReports.turnNumber, turnNumber)))
    .limit(1);
  return result[0];
}

export async function getLatestTurnReport(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(turnReports)
    .where(eq(turnReports.sessionId, sessionId))
    .orderBy(desc(turnReports.turnNumber))
    .limit(1);
  return result[0];
}

export async function getTurnHistory(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: turnReports.id,
    turnNumber: turnReports.turnNumber,
    year: turnReports.year,
    month: turnReports.month,
    headline: turnReports.headline,
    createdAt: turnReports.createdAt,
  }).from(turnReports)
    .where(eq(turnReports.sessionId, sessionId))
    .orderBy(desc(turnReports.turnNumber));
}

// ─── Player Decisions ─────────────────────────────────────────────────────────

export async function savePlayerDecisions(data: {
  sessionId: number;
  turnNumber: number;
  decisions: any[];
  legislationVotes: any[];
  diplomaticActions: any[];
  militaryOrders: any[];
}) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(playerDecisions).values({
    ...data,
    decisions: JSON.stringify(data.decisions),
    legislationVotes: JSON.stringify(data.legislationVotes),
    diplomaticActions: JSON.stringify(data.diplomaticActions),
    militaryOrders: JSON.stringify(data.militaryOrders),
  });
}

export async function getPlayerDecisions(sessionId: number, turnNumber: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(playerDecisions)
    .where(and(eq(playerDecisions.sessionId, sessionId), eq(playerDecisions.turnNumber, turnNumber)))
    .limit(1);
  return result[0];
}
