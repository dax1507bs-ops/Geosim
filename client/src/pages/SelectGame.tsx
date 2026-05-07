import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Globe, Search, ChevronLeft, Loader2, Calendar } from "lucide-react";
import { COUNTRIES } from "../../../shared/gameTypes";
import { toast } from "sonner";

const REGIONS = ["All", "North America", "South America", "Europe", "Europe/Asia", "Asia", "Middle East", "Africa", "Oceania", "Caribbean"];

const PRESET_YEARS = [
  { year: 1945, label: "Post-WWII", desc: "Rebuilding a shattered world" },
  { year: 1962, label: "Cold War Peak", desc: "Nuclear brinkmanship" },
  { year: 1991, label: "Soviet Collapse", desc: "New world order" },
  { year: 2001, label: "9/11 Era", desc: "War on terror begins" },
  { year: 2008, label: "Financial Crisis", desc: "Global recession" },
  { year: 2020, label: "COVID Pandemic", desc: "World in lockdown" },
  { year: 2024, label: "Present Day", desc: "AI age & multipolar world" },
];

export default function SelectGame() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; name: string; flag: string } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [customYear, setCustomYear] = useState("");
  const [step, setStep] = useState<"country" | "year">("country");

  const createSession = trpc.game.createSession.useMutation({
    onSuccess: (data) => {
      toast.success("Simulation initialized. Briefing incoming...");
      navigate(`/game/${data.sessionId}`);
    },
    onError: (err) => {
      toast.error("Failed to initialize: " + err.message);
    },
  });

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase());
      const matchesRegion = selectedRegion === "All" || c.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [search, selectedRegion]);

  const finalYear = selectedYear ?? (customYear ? parseInt(customYear) : null);

  const handleStart = () => {
    if (!selectedCountry || !finalYear) return;
    if (finalYear < 1900 || finalYear > 2024) {
      toast.error("Year must be between 1900 and 2024");
      return;
    }
    createSession.mutate({
      countryCode: selectedCountry.code,
      countryName: selectedCountry.name,
      startYear: finalYear,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <button onClick={() => step === "year" ? setStep("country") : navigate("/sessions")}
          className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Globe className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm tracking-widest uppercase text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {step === "country" ? "Select Nation" : "Choose Starting Year"}
        </span>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {step === "country" ? (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search countries..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-card border-border/60 text-sm"
              />
            </div>

            {/* Region filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {REGIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRegion(r)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedRegion === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Country list */}
            <div className="space-y-1.5 max-h-[calc(100vh-260px)] overflow-y-auto">
              {filteredCountries.map(country => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country);
                    setStep("year");
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left ${
                    selectedCountry?.code === country.code
                      ? "border-primary/60 bg-primary/10 glow-gold"
                      : "border-border/40 bg-card/50 hover:border-border hover:bg-card"
                  }`}
                >
                  <span className="text-2xl">{country.flag}</span>
                  <div>
                    <div className="font-medium text-sm text-foreground">{country.name}</div>
                    <div className="text-xs text-muted-foreground">{country.region}</div>
                  </div>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No countries found.</div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Selected country display */}
            <div className="stat-card flex items-center gap-3 mb-6">
              <span className="text-3xl">{selectedCountry?.flag}</span>
              <div>
                <div className="font-semibold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {selectedCountry?.name}
                </div>
                <div className="text-xs text-muted-foreground">Select a starting year below</div>
              </div>
            </div>

            {/* Preset years */}
            <div className="space-y-2 mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Historical Scenarios</h3>
              {PRESET_YEARS.map(({ year, label, desc }) => (
                <button
                  key={year}
                  onClick={() => { setSelectedYear(year); setCustomYear(""); }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                    selectedYear === year
                      ? "border-primary/60 bg-primary/10 glow-gold"
                      : "border-border/40 bg-card/50 hover:border-border hover:bg-card"
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                  <div className="text-lg font-bold text-primary font-mono">{year}</div>
                </button>
              ))}
            </div>

            {/* Custom year */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Custom Year (1900–2024)</h3>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={1900}
                  max={2024}
                  placeholder="Enter year..."
                  value={customYear}
                  onChange={e => { setCustomYear(e.target.value); setSelectedYear(null); }}
                  className="pl-9 bg-card border-border/60 text-sm font-mono"
                />
              </div>
            </div>

            {/* Start button */}
            <Button
              onClick={handleStart}
              disabled={!finalYear || createSession.isPending}
              className="w-full py-5 gap-2 font-semibold glow-gold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {createSession.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Initializing Simulation...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Begin as Leader of {selectedCountry?.name}
                </>
              )}
            </Button>

            {createSession.isPending && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                AI is generating your nation's historical starting conditions...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
