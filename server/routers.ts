import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createGameSession, getGameSession, getUserGameSessions,
  updateGameSessionTurn, upsertGameState, getGameState,
  saveTurnReport, getTurnReport, getLatestTurnReport,
  getTurnHistory, savePlayerDecisions, getPlayerDecisions,
} from "./db";
import { generateInitialState, generateTurnReport } from "./turnEngine";
import type { GameStateData } from "../shared/gameTypes";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  game: router({
    // List all sessions for current user
    listSessions: protectedProcedure.query(async ({ ctx }) => {
      return getUserGameSessions(ctx.user.id);
    }),

    // Create a new game session and generate initial state
    createSession: protectedProcedure
      .input(z.object({
        countryCode: z.string(),
        countryName: z.string(),
        startYear: z.number().min(1900).max(2024),
      }))
      .mutation(async ({ ctx, input }) => {
        const { state, headline, reportMarkdown, worldEvents, availableDecisions, pendingLegislation } =
          await generateInitialState(input.countryCode, input.countryName, input.startYear);

        const sessionId = await createGameSession({
          userId: ctx.user.id,
          countryCode: input.countryCode,
          countryName: input.countryName,
          startYear: input.startYear,
          currentYear: input.startYear,
          currentMonth: 1,
        });

        await upsertGameState(sessionId, state);

        await saveTurnReport({
          sessionId,
          turnNumber: 1,
          year: input.startYear,
          month: 1,
          headline,
          reportMarkdown,
          worldEvents,
          availableDecisions,
          pendingLegislation,
          stateSnapshot: state,
        });

        return { sessionId, headline };
      }),

    // Get session info
    getSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        return session;
      }),

    // Get current game state
    getState: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        return getGameState(input.sessionId);
      }),

    // Get latest turn report
    getLatestReport: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        const report = await getLatestTurnReport(input.sessionId);
        if (!report) return null;
        return {
          ...report,
          worldEvents: typeof report.worldEvents === 'string' ? JSON.parse(report.worldEvents) : report.worldEvents,
          availableDecisions: typeof report.availableDecisions === 'string' ? JSON.parse(report.availableDecisions) : report.availableDecisions,
          pendingLegislation: typeof report.pendingLegislation === 'string' ? JSON.parse(report.pendingLegislation) : report.pendingLegislation,
          stateSnapshot: typeof report.stateSnapshot === 'string' ? JSON.parse(report.stateSnapshot) : report.stateSnapshot,
        };
      }),

    // Get specific turn report
    getTurnReport: protectedProcedure
      .input(z.object({ sessionId: z.number(), turnNumber: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        const report = await getTurnReport(input.sessionId, input.turnNumber);
        if (!report) return null;
        return {
          ...report,
          worldEvents: typeof report.worldEvents === 'string' ? JSON.parse(report.worldEvents) : report.worldEvents,
          availableDecisions: typeof report.availableDecisions === 'string' ? JSON.parse(report.availableDecisions) : report.availableDecisions,
          pendingLegislation: typeof report.pendingLegislation === 'string' ? JSON.parse(report.pendingLegislation) : report.pendingLegislation,
          stateSnapshot: typeof report.stateSnapshot === 'string' ? JSON.parse(report.stateSnapshot) : report.stateSnapshot,
        };
      }),

    // Get turn history (lightweight)
    getTurnHistory: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        return getTurnHistory(input.sessionId);
      }),

    // Submit decisions and advance to next turn
    submitDecisions: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        decisions: z.array(z.object({
          decisionId: z.string(),
          choiceId: z.string(),
          choiceLabel: z.string(),
        })),
        legislationVotes: z.array(z.object({
          billId: z.string(),
          vote: z.enum(["sign", "veto", "revise"]),
          billTitle: z.string(),
        })),
        diplomaticActions: z.array(z.object({
          action: z.string(),
          targetCountry: z.string(),
        })).default([]),
        militaryOrders: z.array(z.object({
          order: z.string(),
          details: z.string(),
        })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        if (session.status === "ended") throw new Error("Game has ended");

        const currentState = await getGameState(input.sessionId);
        if (!currentState) throw new Error("Game state not found");

        // Save player decisions
        await savePlayerDecisions({
          sessionId: input.sessionId,
          turnNumber: session.currentTurn,
          decisions: input.decisions,
          legislationVotes: input.legislationVotes,
          diplomaticActions: input.diplomaticActions,
          militaryOrders: input.militaryOrders,
        });

        // Apply legislation votes to state
        const stateWithLegislation = applyLegislationVotes(currentState, input.legislationVotes);

        // Advance time
        let nextMonth = session.currentMonth + 1;
        let nextYear = session.currentYear;
        if (nextMonth > 12) { nextMonth = 1; nextYear++; }
        const nextTurn = session.currentTurn + 1;

        // Generate next turn report via LLM
        const result = await generateTurnReport({
          countryCode: session.countryCode,
          countryName: session.countryName,
          startYear: session.startYear,
          turnNumber: nextTurn,
          year: nextYear,
          month: nextMonth,
          currentState: stateWithLegislation,
          previousDecisions: input,
        });

        // Persist new state
        await upsertGameState(input.sessionId, result.newState);
        await updateGameSessionTurn(input.sessionId, nextTurn, nextYear, nextMonth);

        const reportId = await saveTurnReport({
          sessionId: input.sessionId,
          turnNumber: nextTurn,
          year: nextYear,
          month: nextMonth,
          headline: result.headline,
          reportMarkdown: result.reportMarkdown,
          worldEvents: result.worldEvents,
          availableDecisions: result.availableDecisions,
          pendingLegislation: result.pendingLegislation,
          stateSnapshot: result.newState,
        });

        return {
          success: true,
          nextTurn,
          nextYear,
          nextMonth,
          headline: result.headline,
          reportId,
        };
      }),

    // Diplomatic action (standalone)
    diplomaticAction: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        targetCountryCode: z.string(),
        action: z.enum(["improve", "sanction", "alliance", "trade_deal", "declare_war", "peace"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        const state = await getGameState(input.sessionId);
        if (!state) throw new Error("State not found");

        const updatedRelations = state.diplomaticRelations.map(r => {
          if (r.countryCode !== input.targetCountryCode) return r;
          switch (input.action) {
            case "improve": return { ...r, relationScore: Math.min(100, r.relationScore + 10) };
            case "sanction": return { ...r, hasSanctions: true, relationScore: Math.max(-100, r.relationScore - 20), status: "hostile" as const };
            case "alliance": return { ...r, hasAlliance: true, status: "ally" as const, relationScore: Math.min(100, r.relationScore + 30) };
            case "trade_deal": return { ...r, tradeVolume: r.tradeVolume * 1.2, relationScore: Math.min(100, r.relationScore + 15) };
            case "declare_war": return { ...r, status: "war" as const, relationScore: -100 };
            case "peace": return { ...r, status: "neutral" as const, relationScore: Math.max(-20, r.relationScore + 40) };
            default: return r;
          }
        });

        await upsertGameState(input.sessionId, { ...state, diplomaticRelations: updatedRelations });
        return { success: true };
      }),

    // Military budget adjustment
    adjustMilitary: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        budgetPct: z.number().min(0).max(20),
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getGameSession(input.sessionId);
        if (!session || session.userId !== ctx.user.id) throw new Error("Session not found");
        const state = await getGameState(input.sessionId);
        if (!state) throw new Error("State not found");

        const newStrength = Math.max(0, Math.min(100,
          state.militaryStrength + (input.budgetPct - state.militaryBudgetPct) * 2
        ));

        await upsertGameState(input.sessionId, {
          ...state,
          militaryBudgetPct: input.budgetPct,
          militaryStrength: newStrength,
        });
        return { success: true };
      }),
  }),
});

function applyLegislationVotes(state: GameStateData, votes: { billId: string; vote: string; billTitle: string }[]): GameStateData {
  let newState = { ...state };
  for (const vote of votes) {
    const bill = state.pendingLegislation.find(b => b.id === vote.billId);
    if (!bill) continue;
    if (vote.vote === "sign") {
      // Apply effects
      if (bill.effects.gdpDelta) newState.gdpNominal += bill.effects.gdpDelta;
      if (bill.effects.inflationDelta) newState.inflation += bill.effects.inflationDelta;
      if (bill.effects.approvalDelta) newState.approvalRating = Math.max(0, Math.min(100, newState.approvalRating + bill.effects.approvalDelta));
      if (bill.effects.budgetDelta) newState.treasuryBalance += bill.effects.budgetDelta;
      if (bill.effects.factionLoyaltyDeltas) {
        newState.factions = newState.factions.map(f => {
          const delta = bill.effects.factionLoyaltyDeltas?.find(d => d.factionId === f.id);
          if (!delta) return f;
          return { ...f, loyalty: Math.max(-10, Math.min(10, f.loyalty + delta.delta)) };
        });
      }
    }
  }
  return newState;
}

export type AppRouter = typeof appRouter;
