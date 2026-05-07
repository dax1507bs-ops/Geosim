import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Globe, Zap, Shield, TrendingUp, ChevronRight, Play } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate("/sessions");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.72 0.16 65 / 0.08), transparent)"
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm tracking-widest uppercase text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            GeoSim
          </span>
        </div>
        <div>
          {isAuthenticated ? (
            <Button size="sm" onClick={() => navigate("/sessions")} className="gap-1.5">
              <Play className="w-3.5 h-3.5" />
              My Games
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => window.location.href = getLoginUrl()}
              className="border-border/60 text-foreground/80 hover:text-foreground">
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-65px)] px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium tracking-wider uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-glow" />
          AI-Powered Geopolitical Simulation
        </div>

        {/* Title */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4 leading-tight"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          You Are the
          <br />
          <span className="text-primary">Head of State.</span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-md mb-10 leading-relaxed">
          Lead a real country through history. Every decision shapes your nation's fate.
          The world doesn't forgive mistakes — and neither does the simulation.
        </p>

        {/* CTA */}
        <Button
          size="lg"
          onClick={handleStart}
          disabled={loading}
          className="gap-2 px-8 py-6 text-base font-semibold glow-gold"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {loading ? "Loading..." : isAuthenticated ? "Continue to Command Center" : "Begin Simulation"}
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Features grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-16 w-full max-w-2xl">
          {[
            { icon: Globe, label: "60+ Real Countries", sub: "Historically grounded" },
            { icon: Zap, label: "AI Turn Engine", sub: "LLM-generated events" },
            { icon: TrendingUp, label: "Real Economics", sub: "No arcade mechanics" },
            { icon: Shield, label: "Military Sim", sub: "Logistics matter" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="stat-card flex flex-col items-center gap-2 py-4 text-center">
              <Icon className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs font-semibold text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground/50 mt-10 max-w-sm">
          This is a simulation. All outcomes are AI-generated. Real history begins at your chosen year — then diverges.
        </p>
      </main>
    </div>
  );
}
