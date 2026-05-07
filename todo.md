# GeoSim — World Leader Simulator TODO

## Phase 1: Database & Foundation
- [x] Database schema: game_sessions, turn_reports, player_decisions, game_state tables
- [x] tRPC routers: game session CRUD, turn engine, decisions, legislation, diplomacy, military
- [x] Countries data: real-world country list with starting stats

## Phase 2: Core UI
- [x] Landing page: immersive dark hero with CTA
- [x] Country & year selection screen (searchable, year picker 1900–2024)
- [x] Main game dashboard with national indicators (GDP, approval, military, population, treasury, diplomacy)
- [x] Navigation: bottom tab bar for mobile, sidebar for desktop
- [x] App routing: /game/:id for active game, /select for setup

## Phase 3: AI Turn Engine
- [x] LLM turn generation: monthly report with macro stats, world events, faction news
- [x] Decision system: 3–4 policy choices per turn (economic, social, military, diplomatic)
- [x] Legislation screen: bill proposals with faction support/opposition and consequences
- [x] Turn processing: apply decisions, update game state, persist report

## Phase 4: Screens
- [x] Diplomacy panel: relations list, alliance/trade/sanctions/war actions
- [x] Military operations screen: force deployment, budget, AI-simulated outcomes
- [x] Turn history log: scrollable timeline of events and decisions
- [x] Legislation voting screen with faction bars

## Phase 5: Polish
- [x] Mobile-first responsive layout across all screens
- [x] Dark theme with geopolitical aesthetic (deep navy/slate palette)
- [x] Smooth turn transitions and loading states
- [x] Streamdown markdown rendering for AI reports
- [x] Error handling and loading skeletons

## Phase 6: Delivery
- [x] Vitest unit tests for routers (8 tests passing)
- [x] Final checkpoint and publish instructions

## Gap Fixes (Post-Review)
- [x] Faction bar visualizations in legislation screen (implemented inline in LegislationTab)
- [x] Faction loyalty bars in overview tab (implemented in OverviewTab)
- [x] Turn history shows headlines and links to full reports (implemented)
- [x] LLM generates initial state per country/year (runtime generation via AI)
- [x] Loading states and spinners on all major screens
- [x] Animated end-turn transition (framer-motion fade)
- [x] Loading skeleton for dashboard stats (spinner fallback)
