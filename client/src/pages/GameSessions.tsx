import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Globe, Plus, Clock, ChevronRight, Loader2, Flag } from "lucide-react";
import { MONTH_NAMES } from "../../../shared/gameTypes";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";

export default function GameSessions() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  const { data: sessions, isLoading } = trpc.game.listSessions.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const activeSessions = sessions?.filter(s => s.status === "active") ?? [];
  const endedSessions = sessions?.filter(s => s.status === "ended") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border/50">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-primary">
          <Globe className="w-4 h-4" />
          <span className="font-bold text-sm tracking-widest uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            GeoSim
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{user?.name}</span>
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Select a nation to govern or start a new simulation.</p>
        </div>

        {/* New Game Button */}
        <Button
          onClick={() => navigate("/select")}
          className="w-full gap-2 mb-6 py-5 text-sm font-semibold glow-gold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <Plus className="w-4 h-4" />
          New Simulation
        </Button>

        {/* Active Sessions */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : activeSessions.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Simulations</h2>
            {activeSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => navigate(`/game/${session.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-lg">
            <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active simulations.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start one above to take command.</p>
          </div>
        )}

        {/* Ended Sessions */}
        {endedSessions.length > 0 && (
          <div className="space-y-3 mt-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ended Simulations</h2>
            {endedSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => navigate(`/game/${session.id}`)}
                ended
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, onClick, ended }: {
  session: { id: number; countryName: string; countryCode: string; startYear: number; currentYear: number; currentMonth: number; currentTurn: number; updatedAt: Date };
  onClick: () => void;
  ended?: boolean;
}) {
  const monthName = MONTH_NAMES[(session.currentMonth || 1) - 1];

  return (
    <button
      onClick={onClick}
      className="w-full stat-card flex items-center gap-4 text-left hover:border-primary/40 transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-lg flex-shrink-0">
        <Flag className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {session.countryName}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {monthName} {session.currentYear}
          </span>
          <span className="text-xs text-muted-foreground/40">·</span>
          <span className="text-xs text-muted-foreground">Turn {session.currentTurn}</span>
          {ended && (
            <>
              <span className="text-xs text-muted-foreground/40">·</span>
              <span className="text-xs text-destructive">Ended</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
    </button>
  );
}
