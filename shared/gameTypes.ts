// Shared game types used across client and server

export interface FactionState {
  id: string;
  name: string; // e.g. "Силовики", "Законотворцы", "Крупный бизнес", "Регионалы"
  loyalty: number; // -10 to +10
  influence: number; // 1 to 10
  description: string;
}

export interface DiplomaticRelation {
  countryCode: string;
  countryName: string;
  relationScore: number; // -100 to +100
  status: "ally" | "friendly" | "neutral" | "tense" | "hostile" | "war";
  tradeVolume: number; // billions USD
  hasSanctions: boolean;
  hasAlliance: boolean;
  notes: string;
}

export interface Bill {
  id: string;
  title: string;
  description: string;
  lobbyFor: string; // faction name pushing it
  lobbyAgainst: string; // faction name opposing
  consequences: string; // human-readable summary
  effects: {
    approvalDelta?: number;
    gdpDelta?: number;
    inflationDelta?: number;
    militaryDelta?: number;
    factionLoyaltyDeltas?: { factionId: string; delta: number }[];
    budgetDelta?: number; // billions USD
    debtDelta?: number;
  };
  status: "pending" | "signed" | "vetoed" | "revised" | "forced"; // forced = re-voted after veto
  revisedOnce: boolean;
}

export interface Conflict {
  id: string;
  name: string;
  parties: string[]; // country codes
  startTurn: number;
  status: "active" | "ceasefire" | "ended";
  description: string;
  monthlyAttrition: number; // GDP % lost per month
}

export interface WorldEvent {
  id: string;
  type: "economic" | "political" | "military" | "social" | "diplomatic" | "natural";
  title: string;
  description: string;
  affectedCountries: string[];
  impact: string;
}

export interface Decision {
  id: string;
  category: "economic" | "social" | "military" | "diplomatic";
  title: string;
  description: string;
  choices: DecisionChoice[];
}

export interface DecisionChoice {
  id: string;
  label: string;
  description: string;
  shortEffects: string; // one-liner shown in UI
}

export interface GameStateData {
  // Economic
  gdpNominal: number;
  gdpGrowth: number;
  gdpPerCapita: number;
  inflation: number;
  unemployment: number;
  treasuryBalance: number;
  nationalDebt: number;
  centralBankRate: number;
  tradeBalance: number;
  foreignReserves: number;
  currencyRate: number;
  stockIndex: number;
  stockIndexChange: number;
  // Social
  population: number;
  approvalRating: number;
  avgSalaryUsd: number;
  // Military
  militaryBudgetPct: number;
  militaryPersonnel: number;
  militaryStrength: number;
  // Relations
  factions: FactionState[];
  diplomaticRelations: DiplomaticRelation[];
  pendingLegislation: Bill[];
  activeConflicts: Conflict[];
}

export interface TurnReportData {
  id: number;
  sessionId: number;
  turnNumber: number;
  year: number;
  month: number;
  headline: string;
  reportMarkdown: string;
  worldEvents: WorldEvent[];
  availableDecisions: Decision[];
  pendingLegislation: Bill[];
  stateSnapshot: GameStateData;
  createdAt: Date;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const COUNTRIES: { code: string; name: string; flag: string; region: string }[] = [
  { code: "US", name: "United States", flag: "🇺🇸", region: "North America" },
  { code: "CN", name: "China", flag: "🇨🇳", region: "Asia" },
  { code: "RU", name: "Russia", flag: "🇷🇺", region: "Europe/Asia" },
  { code: "DE", name: "Germany", flag: "🇩🇪", region: "Europe" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", region: "Europe" },
  { code: "FR", name: "France", flag: "🇫🇷", region: "Europe" },
  { code: "JP", name: "Japan", flag: "🇯🇵", region: "Asia" },
  { code: "IN", name: "India", flag: "🇮🇳", region: "Asia" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", region: "South America" },
  { code: "CA", name: "Canada", flag: "🇨🇦", region: "North America" },
  { code: "AU", name: "Australia", flag: "🇦🇺", region: "Oceania" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", region: "Asia" },
  { code: "IT", name: "Italy", flag: "🇮🇹", region: "Europe" },
  { code: "ES", name: "Spain", flag: "🇪🇸", region: "Europe" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", region: "North America" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩", region: "Asia" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", region: "Europe/Asia" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", region: "Europe" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", region: "Europe" },
  { code: "PL", name: "Poland", flag: "🇵🇱", region: "Europe" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", region: "Europe" },
  { code: "AR", name: "Argentina", flag: "🇦🇷", region: "South America" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", region: "Africa" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", region: "Africa" },
  { code: "EG", name: "Egypt", flag: "🇪🇬", region: "Africa" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦", region: "Europe" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", region: "Asia" },
  { code: "IR", name: "Iran", flag: "🇮🇷", region: "Middle East" },
  { code: "IL", name: "Israel", flag: "🇮🇱", region: "Middle East" },
  { code: "TH", name: "Thailand", flag: "🇹🇭", region: "Asia" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", region: "Asia" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾", region: "Asia" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", region: "Asia" },
  { code: "CL", name: "Chile", flag: "🇨🇱", region: "South America" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", region: "South America" },
  { code: "NO", name: "Norway", flag: "🇳🇴", region: "Europe" },
  { code: "FI", name: "Finland", flag: "🇫🇮", region: "Europe" },
  { code: "DK", name: "Denmark", flag: "🇩🇰", region: "Europe" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", region: "Europe" },
  { code: "GR", name: "Greece", flag: "🇬🇷", region: "Europe" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿", region: "Europe" },
  { code: "HU", name: "Hungary", flag: "🇭🇺", region: "Europe" },
  { code: "RO", name: "Romania", flag: "🇷🇴", region: "Europe" },
  { code: "KZ", name: "Kazakhstan", flag: "🇰🇿", region: "Asia" },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", region: "Asia" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹", region: "Africa" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", region: "Africa" },
  { code: "MA", name: "Morocco", flag: "🇲🇦", region: "Africa" },
  { code: "AE", name: "UAE", flag: "🇦🇪", region: "Middle East" },
  { code: "QA", name: "Qatar", flag: "🇶🇦", region: "Middle East" },
  { code: "IQ", name: "Iraq", flag: "🇮🇶", region: "Middle East" },
  { code: "SY", name: "Syria", flag: "🇸🇾", region: "Middle East" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", region: "South America" },
  { code: "CU", name: "Cuba", flag: "🇨🇺", region: "Caribbean" },
  { code: "KP", name: "North Korea", flag: "🇰🇵", region: "Asia" },
  { code: "BY", name: "Belarus", flag: "🇧🇾", region: "Europe" },
  { code: "RS", name: "Serbia", flag: "🇷🇸", region: "Europe" },
  { code: "AT", name: "Austria", flag: "🇦🇹", region: "Europe" },
  { code: "BE", name: "Belgium", flag: "🇧🇪", region: "Europe" },
];
