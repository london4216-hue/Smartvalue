// ─── Grade Weight Multipliers ─────────────────────────────────────────────────
export const GRADE_WEIGHTS = {
  "PSA 10":         { multiplier: 2.20, label: "PSA 10 — Gem Mint",        tier: "gem",      registry_premium: 0.25, centering_tolerance: "55/45", surface_standard: "pristine",      pop_scarcity_factor: 0.90 },
  "PSA 9":          { multiplier: 1.25, label: "PSA 9 — Mint",             tier: "mint",     registry_premium: 0.05, centering_tolerance: "60/40", surface_standard: "minor wear",    pop_scarcity_factor: 0.50 },
  "PSA 8":          { multiplier: 0.70, label: "PSA 8 — NM-MT",            tier: "nm",       registry_premium: 0,    centering_tolerance: "65/35", surface_standard: "light wear",    pop_scarcity_factor: 0.20 },
  "PSA 7":          { multiplier: 0.45, label: "PSA 7 — Near Mint",        tier: "low",      registry_premium: 0,    centering_tolerance: "70/30", surface_standard: "moderate wear", pop_scarcity_factor: 0.10 },
  "BGS 10":         { multiplier: 2.80, label: "BGS 10 — Pristine",        tier: "pristine", registry_premium: 0.35, centering_tolerance: "50/50", surface_standard: "flawless",      pop_scarcity_factor: 1.00 },
  "BGS 9.5":        { multiplier: 1.90, label: "BGS 9.5 — Gem Mint",       tier: "gem",      registry_premium: 0.20, centering_tolerance: "55/45", surface_standard: "near flawless", pop_scarcity_factor: 0.85 },
  "BGS 9":          { multiplier: 1.10, label: "BGS 9 — Mint",             tier: "mint",     registry_premium: 0.05, centering_tolerance: "60/40", surface_standard: "minor wear",    pop_scarcity_factor: 0.40 },
  "BGS 8.5":        { multiplier: 0.65, label: "BGS 8.5 — NM-MT",          tier: "nm",       registry_premium: 0,    centering_tolerance: "65/35", surface_standard: "light wear",    pop_scarcity_factor: 0.15 },
  "SGC 10":         { multiplier: 1.80, label: "SGC 10 — Gem Mint",        tier: "gem",      registry_premium: 0.15, centering_tolerance: "55/45", surface_standard: "gem quality",   pop_scarcity_factor: 0.75 },
  "SGC 9.5":        { multiplier: 1.40, label: "SGC 9.5 — Mint+",          tier: "gem",      registry_premium: 0.10, centering_tolerance: "58/42", surface_standard: "near gem",      pop_scarcity_factor: 0.60 },
  "SGC 9":          { multiplier: 1.05, label: "SGC 9 — Mint",             tier: "mint",     registry_premium: 0,    centering_tolerance: "60/40", surface_standard: "minor wear",    pop_scarcity_factor: 0.35 },
  "SGC 8.5":        { multiplier: 0.72, label: "SGC 8.5 — NM-MT+",         tier: "nm",       registry_premium: 0,    centering_tolerance: "63/37", surface_standard: "light wear",    pop_scarcity_factor: 0.18 },
  "SGC 8":          { multiplier: 0.60, label: "SGC 8 — NM-MT",            tier: "nm",       registry_premium: 0,    centering_tolerance: "65/35", surface_standard: "light wear",    pop_scarcity_factor: 0.15 },
  "SGC 7.5":        { multiplier: 0.48, label: "SGC 7.5 — Near Mint+",     tier: "low",      registry_premium: 0,    centering_tolerance: "68/32", surface_standard: "moderate wear", pop_scarcity_factor: 0.10 },
  "SGC 7":          { multiplier: 0.40, label: "SGC 7 — Near Mint",        tier: "low",      registry_premium: 0,    centering_tolerance: "70/30", surface_standard: "moderate wear", pop_scarcity_factor: 0.08 },
  "CGC 10":         { multiplier: 1.70, label: "CGC 10 — Pristine",        tier: "gem",      registry_premium: 0.12, centering_tolerance: "55/45", surface_standard: "pristine",      pop_scarcity_factor: 0.70 },
  "CGC 9.5":        { multiplier: 1.30, label: "CGC 9.5 — Gem Mint",       tier: "gem",      registry_premium: 0.08, centering_tolerance: "58/42", surface_standard: "near pristine", pop_scarcity_factor: 0.55 },
  "Raw (Ungraded)": { multiplier: 0.40, label: "Raw — Ungraded",           tier: "raw",      registry_premium: 0,    centering_tolerance: "unknown", surface_standard: "unknown",     pop_scarcity_factor: 0.00 },
};

export const GRADE_TIER_LABELS = {
  pristine: { label: "Pristine",  color: "text-violet-400" },
  gem:      { label: "Gem Mint",  color: "text-emerald-400" },
  mint:     { label: "Mint",      color: "text-blue-400" },
  nm:       { label: "NM-MT",     color: "text-amber-400" },
  low:      { label: "Low",       color: "text-orange-400" },
  raw:      { label: "Raw",       color: "text-muted-foreground" },
};

// ─── Predictive Investment Index — 7 Signal Categories ───────────────────────
//
// Philosophy: this is NOT a grading report. Every attribute here answers one
// question: "Does this signal make the card worth MORE in the future?"
// Weights reflect forward-looking investment conviction, not surface quality.
//
export const ATTRIBUTE_CATEGORIES = {

  // ── 1. CARD DNA ─────────────────────────────────────────────────────────────
  // The fundamental identity of what the card IS. These never change.
  card_dna: {
    label: "Card DNA",
    icon: "Fingerprint",
    description: "Immutable card characteristics that define its ceiling forever.",
    attributes: [
      { key: "rookie_card",             label: "Rookie Card Status",                        weight: 5,
        note: "RC designation is the single most powerful long-term demand driver." },
      { key: "card_brand_tier",         label: "Card Brand Tier",                           weight: 4,
        note: "National Treasures/Flawless/1-of-1 > Prizm/Select > base Optic/Donruss." },
      { key: "set_prestige",            label: "Set Prestige Level",                        weight: 3,
        note: "Iconic sets (1986 Fleer, 1996 Topps Chrome) carry generational premiums." },
      { key: "variation_desirability",  label: "Variation / Parallel Desirability",         weight: 3,
        note: "Prizm Silver, Luka Gold /10, Pulsar — not all parallels are equal." },
      { key: "card_number_significance", label: "Card Number Significance",                   weight: 3,
        note: "Card #23 for Jordan, #35 for KD. Matching jersey numbers = massive premium." },
      { key: "jersey_number_match",     label: "Jersey Number Match (card# = jersey#)",     weight: 5,
        note: "The most sought-after coincidence in the hobby. /23 AND card #23 = 100." },
    ]
  },

  // ── 2. SERIAL NUMBER & PRINT RUN ────────────────────────────────────────────
  // Numbered cards are a different asset class. Scarcity is absolute, not relative.
  serial_print: {
    label: "Serial # & Print Run",
    icon: "Hash",
    description: "Absolute print scarcity — the hardest ceiling in the hobby.",
    attributes: [
      { key: "is_serialized",           label: "Is Card Serialized (numbered)?",            weight: 5,
        note: "Unnumbered ≠ scarce. Serialized = finite, provable, irreplaceable." },
      { key: "print_run_size",          label: "Print Run Size (/10 vs /99 vs /249)",        weight: 5,
        note: "/10 or less = elite. /25 = strong. /99 = solid. /249+ = lower premium." },
      { key: "bookend_number",          label: "Bookend Serial # (01 or /max)",              weight: 4,
        note: "#1/25 and 25/25 are 'bookends' — command 2–5× premium over mid-run copies." },
      { key: "low_serial_number",       label: "Low Serial # (≤ 5 of run)",                 weight: 4,
        note: "The lower the serial, the more collectors compete for it. #1/99 > #50/99." },
      { key: "is_one_of_one",           label: "1-of-1 / True One-of-One",                  weight: 5,
        note: "Printing plates, superfractors, logoman patches. Only one exists. Ever." },
    ]
  },

  // ── 3. AUTOGRAPH SIGNAL ─────────────────────────────────────────────────────
  // Autos carry player-specific demand that base cards never will.
  autograph_signal: {
    label: "Autograph Signal",
    icon: "PenLine",
    description: "Is there a signature, and how authentic/premium is it?",
    attributes: [
      { key: "has_autograph",           label: "Has Autograph",                             weight: 5,
        note: "Signed cards command a permanent premium over unsigned versions." },
      { key: "auto_type",               label: "Auto Type: On-Card vs Sticker",             weight: 5,
        note: "On-card autos (signed directly) are far more desirable than sticker autos." },
      { key: "auto_quality",            label: "Auto Quality / Signature Boldness",         weight: 3,
        note: "Bold, clean full-name autos > quick scribbles. Collectors can see the diff." },
      { key: "auto_graded",             label: "Auto Grade (if graded by BGS/JSA)",         weight: 3,
        note: "A '10 Auto' sub-grade from BGS adds measurable resale premium." },
      { key: "inscriptions",            label: "Inscriptions / Personalization",            weight: 2,
        note: "HOF, MVP, championship inscriptions add collector value. Personalized hurts." },
      { key: "dual_triple_auto",        label: "Multi-Player Auto (Dual / Triple)",         weight: 3,
        note: "Two legends on one card = rare. Three = extremely rare. Demand compounds." },
    ]
  },

  // ── 4. PATCH & MEMORABILIA ──────────────────────────────────────────────────
  // Not all swatches are equal. This measures what's actually embedded in the card.
  patch_memorabilia: {
    label: "Patch & Memorabilia",
    icon: "Layers",
    description: "What's in the window, and how premium is the swatch?",
    attributes: [
      { key: "has_patch",               label: "Has Patch / Memorabilia",                   weight: 4,
        note: "Embedded material adds tactile rarity that pure parallels can't replicate." },
      { key: "patch_quality",           label: "Patch Quality (logoman vs white swatch)",   weight: 5,
        note: "Logoman > Nike Swoosh > number patch > multi-color > single-color white." },
      { key: "patch_match_jersey",      label: "Patch Matches Known Game Jersey",           weight: 3,
        note: "If provably matched to a documented game jersey, premium is substantial." },
      { key: "rpa_designation",         label: "RPA (Rookie Patch Auto) Designation",       weight: 5,
        note: "The holy grail card type. RC + Auto + Patch in one. Strongest demand tier." },
    ]
  },

  // ── 5. SCARCITY & POPULATION ────────────────────────────────────────────────
  // Relative scarcity — how rare is THIS copy vs all graded copies.
  scarcity_supply: {
    label: "Scarcity & Population",
    icon: "Diamond",
    description: "Supply-side signals that drive future price floors.",
    attributes: [
      { key: "pop_report",              label: "Population Report (total graded)",          weight: 4,
        note: "Lower total pop = more pressure on each copy. Vintage cards especially." },
      { key: "pop_count_at_grade",      label: "Pop Count at This Exact Grade",             weight: 5,
        note: "Pop 1–5 at grade = elite. Pop 50–100 = common. Score inversely to pop." },
      { key: "population_decay_trend",  label: "Population Decay Trend",                   weight: 3,
        note: "Is the pop growing (more submissions) or stable? Stable/shrinking = bullish." },
      { key: "grade_rarity_pct",        label: "Gem Rate % (what % hit gem?)",              weight: 3,
        note: "If only 2% of submissions hit PSA 10, each copy is exponentially rarer." },
      { key: "crossover_upgrade_potential", label: "Crossover / Upgrade Potential",        weight: 2,
        note: "BGS 9.5 holders crossing to PSA 10 can revalue an entire comp tier." },
    ]
  },

  // ── 6. MARKET MOMENTUM ──────────────────────────────────────────────────────
  // Real-time demand signals that predict near-term price trajectory.
  market_momentum: {
    label: "Market Momentum",
    icon: "TrendingUp",
    description: "Forward-looking demand signals from the live market.",
    attributes: [
      { key: "price_trend_30d",         label: "30-Day Price Trend",                       weight: 4,
        note: "Recent sales velocity tells you where money is moving right now." },
      { key: "price_trend_90d",         label: "90-Day Price Trend",                       weight: 3,
        note: "Sustained momentum over 90 days confirms a trend vs a spike." },
      { key: "auction_velocity",        label: "Auction Velocity (sales per month)",       weight: 3,
        note: "More sales = more price discovery = more liquidity. Illiquid = risky." },
      { key: "liquidity_score",         label: "Liquidity Score",                          weight: 3,
        note: "Can you sell this in 48 hours? High-demand cards always have buyers." },
      { key: "buy_sell_pressure",       label: "Buy / Sell Pressure Ratio",                weight: 3,
        note: "More buyers than sellers = upward price pressure. Key leading indicator." },
      { key: "market_heat_score",       label: "Market Heat Score",                        weight: 4,
        note: "Composite signal: search volume + watchlist count + recent sale pace." },
    ]
  },

  // ── 7. PLAYER INVESTMENT THESIS ─────────────────────────────────────────────
  // Everything about the player that drives long-term card demand.
  player_thesis: {
    label: "Player Investment Thesis",
    icon: "Trophy",
    description: "Long-term demand drivers tied to the player's legacy and trajectory.",
    attributes: [
      { key: "goat_legacy_score",       label: "GOAT / Legacy Score",                      weight: 5,
        note: "All-time greats (Jordan, LeBron, Kobe) carry demand that never expires." },
      { key: "hall_of_fame_trajectory", label: "Hall of Fame Trajectory",                  weight: 4,
        note: "Lock HOF = permanent demand floor. Borderline = valuation risk." },
      { key: "career_trajectory",       label: "Career Trajectory (active players)",       weight: 4,
        note: "Rising star adds upside. Declining player = sell signal." },
      { key: "championships",           label: "Championships Won",                        weight: 3,
        note: "Each ring materially lifts card value. Finals MVP = extra tier." },
      { key: "mvp_potential",           label: "MVP / Award Trajectory",                   weight: 4,
        note: "MVP seasons historically spike cards 40–200%. Future potential matters." },
      { key: "cultural_icon_status",    label: "Cultural Icon Status",                     weight: 3,
        note: "Jordan, Kobe transcend basketball. Cultural reach = non-collector buyers." },
      { key: "international_appeal",    label: "International Appeal",                     weight: 2,
        note: "Global stars (Giannis, Luka, Yao) tap overseas collector markets." },
      { key: "injury_risk",             label: "Injury Risk (lower = better)",             weight: 3,
        note: "Injury-prone players = demand volatility. Clean bill of health = stable." },
      { key: "team_market_size",        label: "Team / Market Size",                       weight: 2,
        note: "LA, NY, Chicago markets amplify media exposure and collector demand." },
      { key: "historical_appreciation", label: "Historical Appreciation Rate (card tier)", weight: 4,
        note: "Has this player/set historically beaten the market? Track record matters." },
      { key: "downside_protection",     label: "Downside Protection",                      weight: 3,
        note: "Vintage legends have a floor. Prospect cards can go to zero." },
    ]
  },
};

export const getTotalAttributes = () => {
  return Object.values(ATTRIBUTE_CATEGORIES).reduce(
    (sum, cat) => sum + cat.attributes.length, 0
  );
};

export const getMaxTotalWeight = () => {
  return Object.values(ATTRIBUTE_CATEGORIES).reduce(
    (sum, cat) => sum + cat.attributes.reduce((s, a) => s + a.weight, 0), 0
  );
};