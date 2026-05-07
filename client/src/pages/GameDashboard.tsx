import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Globe, TrendingUp, Shield, Users, DollarSign, BarChart3,
  ChevronLeft, Loader2, CheckCircle, Clock, Newspaper,
  Swords, HandshakeIcon, ScrollText, History, ChevronRight,
  AlertTriangle, TrendingDown, Minus, RefreshCw, Activity
} from "lucide-react";
import { MONTH_NAMES } from "../../../shared/gameTypes";
import type { GameStateData, Decision, Bill, DiplomaticRelation, FactionState } from "../../../shared/gameTypes";
import { Streamdown } from "streamdown";

type Tab = "overview" | "report" | "decisions" | "legislation" | "diplomacy" | "military" | "history";

export default function GameDashboard() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = parseInt(params.sessionId ?? "0");
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedDecisions, setSelectedDecisions] = useState<Record<string, string>>({});
  const [selectedDecisionLabels, setSelectedDecisionLabels] = useState<Record<string, string>>({});
  const [legislationVotes, setLegislationVotes] = useState<Record<string, "sign" | "veto" | "revise">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTurnOverlay, setShowTurnOverlay] = useState(false);

  const { data: session, isLoading: sessionLoading } = trpc.game.getSession.useQuery(
    { sessionId }, { enabled: isAuthenticated && !!sessionId }
  );
  const { data: gameState, refetch: refetchState } = trpc.game.getState.useQuery(
    { sessionId }, { enabled: isAuthenticated && !!sessionId }
  );
  const { data: latestReport, refetch: refetchReport } = trpc.game.getLatestReport.useQuery(
    { sessionId }, { enabled: isAuthenticated && !!sessionId }
  );
  const { data: history, refetch: refetchHistory } = trpc.game.getTurnHistory.useQuery(
    { sessionId }, { enabled: isAuthenticated && !!sessionId }
  );

  const submitDecisions = trpc.game.submitDecisions.useMutation({
    onSuccess: async (data) => {
      await refetchState();
      await refetchReport();
      await refetchHistory();
      setSelectedDecisions({});
      setSelectedDecisionLabels({});
      setLegislationVotes({});
      setActiveTab("report");
      setIsSubmitting(false);
      setTimeout(() => {
        setShowTurnOverlay(false);
        toast.success(`Turn ${data.nextTurn}: ${data.headline}`);
      }, 600);
    },
    onError: (err) => {
      toast.error("Failed to advance turn: " + err.message);
      setIsSubmitting(false);
      setShowTurnOverlay(false);
    },
  });

  const diplomaticAction = trpc.game.diplomaticAction.useMutation({
    onSuccess: () => { toast.success("Diplomatic action executed."); refetchState(); },
    onError: (err) => toast.error(err.message),
  });

  const adjustMilitary = trpc.game.adjustMilitary.useMutation({
    onSuccess: () => { toast.success("Military budget updated."); refetchState(); },
    onError: (err) => toast.error(err.message),
  });

  const handleEndTurn = () => {
    if (!latestReport) return;
    const decisions = Object.entries(selectedDecisions).map(([decisionId, choiceId]) => ({
      decisionId,
      choiceId,
      choiceLabel: selectedDecisionLabels[decisionId] ?? choiceId,
    }));
    const votes = Object.entries(legislationVotes).map(([billId, vote]) => {
      const bill = latestReport.pendingLegislation?.find((b: Bill) => b.id === billId);
      return { billId, vote, billTitle: bill?.title ?? billId };
    });

    setIsSubmitting(true);
    setShowTurnOverlay(true);
    submitDecisions.mutate({
      sessionId,
      decisions,
      legislationVotes: votes,
      diplomaticActions: [],
      militaryOrders: [],
    });
  };

  const state = gameState as GameStateData | undefined;
  const report = latestReport as any;

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading simulation...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Session not found.</p>
          <Button onClick={() => navigate("/sessions")} className="mt-4" size="sm">Back</Button>
        </div>
      </div>
    );
  }

  const monthName = MONTH_NAMES[(session.currentMonth || 1) - 1];
  const decisionsRequired = (report?.availableDecisions?.length ?? 0) > 0;
  const decisionsCompleted = Object.keys(selectedDecisions).length >= (report?.availableDecisions?.length ?? 0);
  const canEndTurn = !decisionsRequired || decisionsCompleted;

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
    { id: "report", label: "Report", icon: <Newspaper className="w-4 h-4" /> },
    { id: "decisions", label: "Decisions", icon: <CheckCircle className="w-4 h-4" />, badge: (report?.availableDecisions?.length ?? 0) - Object.keys(selectedDecisions).length },
    { id: "legislation", label: "Laws", icon: <ScrollText className="w-4 h-4" />, badge: (report?.pendingLegislation?.length ?? 0) - Object.keys(legislationVotes).length },
    { id: "diplomacy", label: "Diplomacy", icon: <HandshakeIcon className="w-4 h-4" /> },
    { id: "military", label: "Military", icon: <Swords className="w-4 h-4" /> },
    { id: "history", label: "History", icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Turn processing overlay */}
      <AnimatePresence>
        {showTurnOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full border-2 border-primary/30 flex items-center justify-center mx-auto">
                <Globe className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Processing Turn</h3>
                <p className="text-sm text-muted-foreground mt-1">The world is responding to your decisions...</p>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="relative z-20 flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-background/90 backdrop-blur-sm sticky top-0">
        <button onClick={() => navigate("/sessions")} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {session.countryName}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {monthName} {session.currentYear}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Turn {session.currentTurn}</span>
            {state && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className={`text-xs font-medium ${state.approvalRating >= 50 ? 'text-green-400' : state.approvalRating >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {state.approvalRating.toFixed(0)}% approval
                </span>
              </>
            )}
          </div>
        </div>
        {/* End Turn Button */}
        <Button
          size="sm"
          onClick={handleEndTurn}
          disabled={isSubmitting || !canEndTurn}
          className={`gap-1.5 text-xs px-3 flex-shrink-0 ${canEndTurn ? 'glow-gold' : 'opacity-50'}`}
        >
          {isSubmitting ? (
            <><Loader2 className="w-3 h-3 animate-spin" />Processing...</>
          ) : (
            <><RefreshCw className="w-3 h-3" />End Turn</>
          )}
        </Button>
      </header>

      {/* Tab navigation */}
      <div className="relative z-10 flex overflow-x-auto border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-[57px]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium flex-shrink-0 transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="relative z-10 flex-1 overflow-y-auto pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
        {activeTab === "overview" && state && (
          <OverviewTab state={state} session={session} />
        )}
        {activeTab === "report" && report && (
          <ReportTab report={report} />
        )}
        {activeTab === "decisions" && report && (
          <DecisionsTab
            decisions={report.availableDecisions ?? []}
            selected={selectedDecisions}
            onSelect={(decisionId, choiceId, choiceLabel) => {
              setSelectedDecisions(prev => ({ ...prev, [decisionId]: choiceId }));
              setSelectedDecisionLabels(prev => ({ ...prev, [decisionId]: choiceLabel }));
            }}
          />
        )}
        {activeTab === "legislation" && report && (
          <LegislationTab
            bills={report.pendingLegislation ?? []}
            votes={legislationVotes}
            onVote={(billId, vote) => setLegislationVotes(prev => ({ ...prev, [billId]: vote }))}
          />
        )}
        {activeTab === "diplomacy" && state && (
          <DiplomacyTab
            relations={state.diplomaticRelations}
            sessionId={sessionId}
            onAction={(targetCountryCode, action) =>
              diplomaticAction.mutate({ sessionId, targetCountryCode, action })
            }
          />
        )}
        {activeTab === "military" && state && (
          <MilitaryTab
            state={state}
            sessionId={sessionId}
            onAdjust={(pct) => adjustMilitary.mutate({ sessionId, budgetPct: pct })}
          />
        )}
        {activeTab === "history" && (
          <HistoryTab
            history={history ?? []}
            sessionId={sessionId}
          />
        )}
        {!state && activeTab !== "history" && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ state, session }: { state: GameStateData; session: any }) {
  const fmt = (n: number, decimals = 1) => n.toFixed(decimals);
  const fmtB = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(2)}T` : `$${n.toFixed(1)}B`;
  const delta = (n: number, suffix = "%") => (
    <span className={`text-xs font-mono ${n > 0 ? 'text-green-400' : n < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
      {n > 0 ? '+' : ''}{n.toFixed(2)}{suffix}
    </span>
  );

  const stats = [
    { label: "GDP (Nominal)", value: fmtB(state.gdpNominal), sub: delta(state.gdpGrowth), icon: <TrendingUp className="w-4 h-4 text-primary" /> },
    { label: "GDP per Capita", value: `$${state.gdpPerCapita.toFixed(0)}`, sub: <span className="text-xs text-muted-foreground">USD</span>, icon: <DollarSign className="w-4 h-4 text-primary" /> },
    { label: "Treasury", value: fmtB(state.treasuryBalance), sub: <span className="text-xs text-muted-foreground">balance</span>, icon: <DollarSign className="w-4 h-4 text-yellow-400" /> },
    { label: "National Debt", value: fmtB(state.nationalDebt), sub: <span className="text-xs text-muted-foreground">total</span>, icon: <TrendingDown className="w-4 h-4 text-red-400" /> },
    { label: "Inflation", value: `${fmt(state.inflation)}%`, sub: <span className="text-xs text-muted-foreground">y/y</span>, icon: <BarChart3 className="w-4 h-4 text-orange-400" /> },
    { label: "Unemployment", value: `${fmt(state.unemployment)}%`, sub: <span className="text-xs text-muted-foreground">rate</span>, icon: <Users className="w-4 h-4 text-blue-400" /> },
    { label: "Population", value: `${fmt(state.population, 2)}M`, sub: <span className="text-xs text-muted-foreground">people</span>, icon: <Users className="w-4 h-4 text-primary" /> },
    { label: "Avg Salary", value: `$${state.avgSalaryUsd.toFixed(0)}`, sub: <span className="text-xs text-muted-foreground">/month</span>, icon: <DollarSign className="w-4 h-4 text-green-400" /> },
    { label: "CB Rate", value: `${fmt(state.centralBankRate)}%`, sub: <span className="text-xs text-muted-foreground">interest</span>, icon: <Activity className="w-4 h-4 text-cyan-400" /> },
    { label: "Trade Balance", value: fmtB(state.tradeBalance), sub: <span className="text-xs text-muted-foreground">net</span>, icon: <Globe className="w-4 h-4 text-primary" /> },
    { label: "FX Reserves", value: fmtB(state.foreignReserves), sub: <span className="text-xs text-muted-foreground">reserves</span>, icon: <Shield className="w-4 h-4 text-cyan-400" /> },
    { label: "Stock Index", value: state.stockIndex.toFixed(0), sub: delta(state.stockIndexChange), icon: <TrendingUp className="w-4 h-4 text-green-400" /> },
  ];

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Approval bar */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popular Approval</span>
          <span className={`text-lg font-bold font-mono ${state.approvalRating >= 50 ? 'text-green-400' : state.approvalRating >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {state.approvalRating.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${state.approvalRating >= 50 ? 'bg-green-400' : state.approvalRating >= 30 ? 'bg-yellow-400' : 'bg-red-400'}`}
            style={{ width: `${state.approvalRating}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map(({ label, value, sub, icon }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-2 mb-1">
              {icon}
              <span className="text-xs text-muted-foreground truncate">{label}</span>
            </div>
            <div className="font-bold text-base text-foreground font-mono">{value}</div>
            <div className="mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Factions */}
      {state.factions.length > 0 && (
        <div className="stat-card space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Power Factions</h3>
          {state.factions.map((f: FactionState) => (
            <div key={f.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{f.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Influence: {f.influence}/10</span>
                  <span className={`text-xs font-bold font-mono ${f.loyalty >= 3 ? 'text-green-400' : f.loyalty <= -3 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {f.loyalty > 0 ? '+' : ''}{f.loyalty}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${f.loyalty >= 3 ? 'bg-green-400' : f.loyalty <= -3 ? 'bg-red-400' : 'bg-yellow-400'}`}
                  style={{ width: `${((f.loyalty + 10) / 20) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Military strength */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Military Strength</span>
          </div>
          <span className="text-lg font-bold font-mono text-primary">{state.militaryStrength.toFixed(1)}/100</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${state.militaryStrength}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Budget: {state.militaryBudgetPct.toFixed(1)}% GDP</span>
          <span>{state.militaryPersonnel.toLocaleString()} personnel</span>
        </div>
      </div>
    </div>
  );
}

// ─── Report Tab ───────────────────────────────────────────────────────────────

function ReportTab({ report }: { report: any }) {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Headline */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {MONTH_NAMES[(report.month || 1) - 1]} {report.year} — Turn {report.turnNumber}
          </span>
        </div>
        <h2 className="text-lg font-bold text-primary leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {report.headline}
        </h2>
      </div>

      {/* World Events */}
      {report.worldEvents?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">World Events</h3>
          {report.worldEvents.map((event: any) => (
            <div key={event.id} className="stat-card border-l-2 border-accent/50">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  event.type === 'military' ? 'bg-red-500/20 text-red-400' :
                  event.type === 'economic' ? 'bg-green-500/20 text-green-400' :
                  event.type === 'political' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-primary/20 text-primary'
                }`}>
                  {event.type}
                </span>
                <span className="text-xs font-semibold text-foreground">{event.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{event.description}</p>
              <p className="text-xs text-accent mt-1">{event.impact}</p>
            </div>
          ))}
        </div>
      )}

      {/* Full Report */}
      <div className="stat-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Intelligence Briefing</h3>
        <div className="report-prose">
          <Streamdown>{report.reportMarkdown}</Streamdown>
        </div>
      </div>
    </div>
  );
}

// ─── Decisions Tab ────────────────────────────────────────────────────────────

function DecisionsTab({ decisions, selected, onSelect }: {
  decisions: Decision[];
  selected: Record<string, string>;
  onSelect: (decisionId: string, choiceId: string, choiceLabel: string) => void;
}) {
  if (decisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <CheckCircle className="w-8 h-8 text-primary mb-3" />
        <p className="text-sm text-muted-foreground">No decisions pending this turn.</p>
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    economic: "text-green-400 bg-green-500/10",
    social: "text-blue-400 bg-blue-500/10",
    military: "text-red-400 bg-red-500/10",
    diplomatic: "text-cyan-400 bg-cyan-500/10",
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Policy Decisions
        </h2>
        <span className="text-xs text-muted-foreground">
          {Object.keys(selected).length}/{decisions.length} decided
        </span>
      </div>

      {decisions.map((decision: Decision) => (
        <div key={decision.id} className="stat-card space-y-3">
          <div className="flex items-start gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${categoryColors[decision.category] ?? 'text-primary bg-primary/10'}`}>
              {decision.category}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {decision.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{decision.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            {decision.choices.map((choice) => (
              <button
                key={choice.id}
                onClick={() => onSelect(decision.id, choice.id, choice.label)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                  selected[decision.id] === choice.id
                    ? "border-primary bg-primary/10 glow-gold"
                    : "border-border/40 bg-background/50 hover:border-border hover:bg-card"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">{choice.label}</span>
                  {selected[decision.id] === choice.id && (
                    <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{choice.description}</p>
                <p className="text-xs text-accent mt-1 font-medium">{choice.shortEffects}</p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Legislation Tab ──────────────────────────────────────────────────────────

function LegislationTab({ bills, votes, onVote }: {
  bills: Bill[];
  votes: Record<string, "sign" | "veto" | "revise">;
  onVote: (billId: string, vote: "sign" | "veto" | "revise") => void;
}) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <ScrollText className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No legislation pending.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Legislative Agenda
      </h2>

      {bills.map((bill: Bill) => (
        <div key={bill.id} className="stat-card space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {bill.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">{bill.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-500/10 rounded px-2 py-1.5">
              <span className="text-green-400 font-medium">For: </span>
              <span className="text-muted-foreground">{bill.lobbyFor}</span>
            </div>
            <div className="bg-red-500/10 rounded px-2 py-1.5">
              <span className="text-red-400 font-medium">Against: </span>
              <span className="text-muted-foreground">{bill.lobbyAgainst}</span>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded px-3 py-2">
            <p className="text-xs text-foreground/80">{bill.consequences}</p>
          </div>

          {/* Effects */}
          <div className="flex flex-wrap gap-1.5">
            {bill.effects.approvalDelta !== undefined && bill.effects.approvalDelta !== 0 && (
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${bill.effects.approvalDelta > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                Approval {bill.effects.approvalDelta > 0 ? '+' : ''}{bill.effects.approvalDelta}%
              </span>
            )}
            {bill.effects.gdpDelta !== undefined && bill.effects.gdpDelta !== 0 && (
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${bill.effects.gdpDelta > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                GDP {bill.effects.gdpDelta > 0 ? '+' : ''}${bill.effects.gdpDelta.toFixed(1)}B
              </span>
            )}
            {bill.effects.inflationDelta !== undefined && bill.effects.inflationDelta !== 0 && (
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${bill.effects.inflationDelta < 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                Inflation {bill.effects.inflationDelta > 0 ? '+' : ''}{bill.effects.inflationDelta}%
              </span>
            )}
            {bill.effects.budgetDelta !== undefined && bill.effects.budgetDelta !== 0 && (
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${bill.effects.budgetDelta > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                Budget {bill.effects.budgetDelta > 0 ? '+' : ''}${bill.effects.budgetDelta.toFixed(1)}B
              </span>
            )}
          </div>

          {bill.revisedOnce && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Already revised once — veto will be overridden if re-voted.</span>
            </div>
          )}

          {/* Vote buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(["sign", "revise", "veto"] as const).map(v => (
              <button
                key={v}
                onClick={() => onVote(bill.id, v)}
                className={`py-2 rounded-lg text-xs font-semibold transition-all border ${
                  votes[bill.id] === v
                    ? v === "sign" ? "bg-green-500/20 border-green-500/60 text-green-400"
                      : v === "veto" ? "bg-red-500/20 border-red-500/60 text-red-400"
                      : "bg-yellow-500/20 border-yellow-500/60 text-yellow-400"
                    : "bg-background border-border/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "sign" ? "✓ Sign" : v === "revise" ? "↩ Revise" : "✗ Veto"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Diplomacy Tab ────────────────────────────────────────────────────────────

function DiplomacyTab({ relations, sessionId, onAction }: {
  relations: DiplomaticRelation[];
  sessionId: number;
  onAction: (countryCode: string, action: any) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const statusColor = (status: string) => {
    switch (status) {
      case "ally": return "text-green-400 bg-green-500/10";
      case "friendly": return "text-cyan-400 bg-cyan-500/10";
      case "neutral": return "text-muted-foreground bg-muted";
      case "tense": return "text-yellow-400 bg-yellow-500/10";
      case "hostile": return "text-orange-400 bg-orange-500/10";
      case "war": return "text-red-400 bg-red-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  if (relations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <Globe className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No diplomatic relations established.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-2">
      <h2 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Diplomatic Relations
      </h2>
      {relations.map((r: DiplomaticRelation) => (
        <div key={r.countryCode} className="stat-card">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setExpanded(expanded === r.countryCode ? null : r.countryCode)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                {r.countryCode}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-foreground">{r.countryName}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">{r.relationScore > 0 ? '+' : ''}{r.relationScore}</span>
                </div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded === r.countryCode ? 'rotate-90' : ''}`} />
          </button>

          {expanded === r.countryCode && (
            <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Trade: </span><span className="text-foreground font-mono">${r.tradeVolume.toFixed(1)}B</span></div>
                <div><span className="text-muted-foreground">Sanctions: </span><span className={r.hasSanctions ? 'text-red-400' : 'text-green-400'}>{r.hasSanctions ? 'Yes' : 'No'}</span></div>
                <div><span className="text-muted-foreground">Alliance: </span><span className={r.hasAlliance ? 'text-green-400' : 'text-muted-foreground'}>{r.hasAlliance ? 'Yes' : 'No'}</span></div>
              </div>
              {r.notes && <p className="text-xs text-muted-foreground italic">{r.notes}</p>}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { action: "improve", label: "Improve", color: "text-green-400 hover:bg-green-500/10" },
                  { action: "trade_deal", label: "Trade Deal", color: "text-cyan-400 hover:bg-cyan-500/10" },
                  { action: "alliance", label: "Alliance", color: "text-blue-400 hover:bg-blue-500/10" },
                  { action: "sanction", label: "Sanction", color: "text-orange-400 hover:bg-orange-500/10" },
                  { action: "peace", label: "Peace", color: "text-yellow-400 hover:bg-yellow-500/10" },
                  { action: "declare_war", label: "War", color: "text-red-400 hover:bg-red-500/10" },
                ].map(({ action, label, color }) => (
                  <button
                    key={action}
                    onClick={() => onAction(r.countryCode, action)}
                    className={`py-1.5 rounded border border-border/40 text-xs font-medium transition-colors ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Military Tab ─────────────────────────────────────────────────────────────

function MilitaryTab({ state, sessionId, onAdjust }: {
  state: GameStateData;
  sessionId: number;
  onAdjust: (pct: number) => void;
}) {
  const [budgetPct, setBudgetPct] = useState(state.militaryBudgetPct);

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Military Command
      </h2>

      {/* Strength */}
      <div className="stat-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Combat Readiness</span>
          </div>
          <span className="text-xl font-bold font-mono text-primary">{state.militaryStrength.toFixed(1)}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${state.militaryStrength}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>0 — Collapsed</span>
          <span>100 — Superpower</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: "Active Personnel", value: state.militaryPersonnel.toLocaleString(), icon: <Users className="w-4 h-4 text-primary" /> },
          { label: "Military Budget", value: `${state.militaryBudgetPct.toFixed(1)}% GDP`, icon: <DollarSign className="w-4 h-4 text-yellow-400" /> },
          { label: "Budget (USD)", value: `$${(state.gdpNominal * state.militaryBudgetPct / 100).toFixed(1)}B`, icon: <BarChart3 className="w-4 h-4 text-green-400" /> },
          { label: "Strength Index", value: `${state.militaryStrength.toFixed(1)}/100`, icon: <Shield className="w-4 h-4 text-cyan-400" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
            <div className="font-bold text-sm text-foreground font-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* Budget adjuster */}
      <div className="stat-card space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adjust Military Budget</h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.5}
            max={15}
            step={0.1}
            value={budgetPct}
            onChange={e => setBudgetPct(parseFloat(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-bold font-mono text-primary w-14 text-right">{budgetPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>0.5% — Minimal</span>
          <span>15% — War footing</span>
        </div>
        <Button
          size="sm"
          onClick={() => onAdjust(budgetPct)}
          disabled={Math.abs(budgetPct - state.militaryBudgetPct) < 0.05}
          className="w-full"
        >
          Apply Budget Change
        </Button>
      </div>

      {/* Active conflicts */}
      {state.activeConflicts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Conflicts</h3>
          {state.activeConflicts.map((c: any) => (
            <div key={c.id} className="stat-card border-l-2 border-red-500/50">
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-3.5 h-3.5 text-red-400" />
                <span className="text-sm font-semibold text-foreground">{c.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${c.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{c.description}</p>
              <p className="text-xs text-red-400 mt-1">Monthly attrition: -{c.monthlyAttrition}% GDP</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ history, sessionId }: {
  history: { id: number; turnNumber: number; year: number; month: number; headline: string; createdAt: Date }[];
  sessionId: number;
}) {
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null);
  const { data: turnReport } = trpc.game.getTurnReport.useQuery(
    { sessionId, turnNumber: selectedTurn ?? 0 },
    { enabled: selectedTurn !== null }
  );

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <History className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">No history yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {selectedTurn !== null && turnReport ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedTurn(null)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back to Timeline
          </button>
          <ReportTab report={{
            ...turnReport,
            worldEvents: typeof turnReport.worldEvents === 'string' ? JSON.parse(turnReport.worldEvents) : turnReport.worldEvents,
            availableDecisions: typeof turnReport.availableDecisions === 'string' ? JSON.parse(turnReport.availableDecisions) : turnReport.availableDecisions,
            pendingLegislation: typeof turnReport.pendingLegislation === 'string' ? JSON.parse(turnReport.pendingLegislation) : turnReport.pendingLegislation,
          }} />
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Turn History
          </h2>
          {history.map((turn) => (
            <button
              key={turn.id}
              onClick={() => setSelectedTurn(turn.turnNumber)}
              className="w-full stat-card flex items-center gap-3 text-left hover:border-primary/40 transition-colors group"
            >
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {turn.turnNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">
                  {MONTH_NAMES[(turn.month || 1) - 1]} {turn.year}
                </div>
                <div className="text-sm font-medium text-foreground truncate mt-0.5">{turn.headline}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
