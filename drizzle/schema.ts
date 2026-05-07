import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Game session: one per playthrough
export const gameSessions = mysqlTable("game_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  countryCode: varchar("countryCode", { length: 8 }).notNull(),
  countryName: varchar("countryName", { length: 128 }).notNull(),
  startYear: int("startYear").notNull(),
  currentTurn: int("currentTurn").default(1).notNull(), // turn = month index
  currentYear: int("currentYear").notNull(),
  currentMonth: int("currentMonth").notNull(), // 1-12
  status: mysqlEnum("status", ["active", "ended"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameSession = typeof gameSessions.$inferSelect;

// Full game state snapshot (updated each turn)
export const gameStates = mysqlTable("game_states", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().unique(),
  // Economic
  gdpNominal: float("gdpNominal").notNull(), // billions USD
  gdpGrowth: float("gdpGrowth").notNull(), // % m/m
  gdpPerCapita: float("gdpPerCapita").notNull(),
  inflation: float("inflation").notNull(), // % y/y
  unemployment: float("unemployment").notNull(), // %
  treasuryBalance: float("treasuryBalance").notNull(), // billions USD
  nationalDebt: float("nationalDebt").notNull(), // billions USD
  centralBankRate: float("centralBankRate").notNull(), // %
  tradeBalance: float("tradeBalance").notNull(), // billions USD
  foreignReserves: float("foreignReserves").notNull(), // billions USD
  currencyRate: float("currencyRate").notNull(), // vs USD
  stockIndex: float("stockIndex").notNull(),
  stockIndexChange: float("stockIndexChange").notNull(), // %
  // Social
  population: float("population").notNull(), // millions
  approvalRating: float("approvalRating").notNull(), // %
  avgSalaryUsd: float("avgSalaryUsd").notNull(),
  // Military
  militaryBudgetPct: float("militaryBudgetPct").notNull(), // % of GDP
  militaryPersonnel: int("militaryPersonnel").notNull(),
  militaryStrength: float("militaryStrength").notNull(), // 0-100 index
  // Factions (loyalty -10 to +10, influence 1-10)
  factions: json("factions").notNull(), // FactionState[]
  // Diplomacy
  diplomaticRelations: json("diplomaticRelations").notNull(), // DiplomaticRelation[]
  // Pending legislation
  pendingLegislation: json("pendingLegislation").notNull(), // Bill[]
  // Active conflicts
  activeConflicts: json("activeConflicts").notNull(), // Conflict[]
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameState = typeof gameStates.$inferSelect;

// Turn reports (one per turn)
export const turnReports = mysqlTable("turn_reports", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  turnNumber: int("turnNumber").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  headline: varchar("headline", { length: 256 }).notNull(),
  reportMarkdown: text("reportMarkdown").notNull(), // Full LLM-generated report
  worldEvents: json("worldEvents").notNull(), // WorldEvent[]
  availableDecisions: json("availableDecisions").notNull(), // Decision[]
  pendingLegislation: json("pendingLegislation").notNull(), // Bill[]
  stateSnapshot: json("stateSnapshot").notNull(), // GameState snapshot
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TurnReport = typeof turnReports.$inferSelect;

// Player decisions (one per turn per session)
export const playerDecisions = mysqlTable("player_decisions", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  turnNumber: int("turnNumber").notNull(),
  decisions: json("decisions").notNull(), // { decisionId: string, choiceId: string }[]
  legislationVotes: json("legislationVotes").notNull(), // { billId: string, vote: 'sign'|'veto'|'revise' }[]
  diplomaticActions: json("diplomaticActions").notNull(), // DiplomaticAction[]
  militaryOrders: json("militaryOrders").notNull(), // MilitaryOrder[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlayerDecision = typeof playerDecisions.$inferSelect;
