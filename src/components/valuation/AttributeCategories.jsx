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

// ───────────────────────────────────────────────────────────────────────────────
// SMART WEIGHTING SYSTEM: Yes/No Attributes with Strategic Impact
// ───────────────────────────────────────────────────────────────────────────────
// 
// WEIGHTING PHILOSOPHY:
// - Serious risks (injury, legal issues, bust risk): -20% to -35% (MASSIVE NEGATIVE)
// - Positive player thesis (HOF trajectory, GOAT status): +15% to +25% (MAJOR POSITIVE)
// - Scarcity (one-of-one, low serial, rare pop): +15% to +20% (MAJOR POSITIVE)
// - Market momentum (trending, viral): +10% to +15% (MODERATE POSITIVE)
// - Minor cosmetic/variation factors: ±2% to ±5% (SUBTLE)
//
// This is YOUR IP: simple yes/no, but intelligent weighting that separates signal from noise.
//
export const ATTRIBUTE_CATEGORIES = {

  // ── 1. CARD DNA ──────────────────────────────────────────────────────────────
  // What the card fundamentally is. Yes/No signals with cosmetic upside.
  card_dna: {
    label: "Card DNA",
    icon: "Fingerprint",
    description: "Immutable identity — is this a high-demand card type?",
    attributes: [
      { key: "rookie_card",             label: "Rookie Card",                          impact: 0.20, note: "Yes/No: RC designation" },
      { key: "jersey_number_match",     label: "Jersey # Matches Card #",              impact: 0.18, note: "Yes/No: #23 card for #23 player = collector trophy" },
      { key: "is_autograph",            label: "Has Autograph",                        impact: 0.12, note: "Yes/No: signed > unsigned" },
      { key: "has_patch",               label: "Has Patch",                            impact: 0.12, note: "Yes/No: embedded material" },
      { key: "rpa_card",                label: "Rookie Patch Auto (RPA)",              impact: 0.22, note: "Yes/No: the holy grail type" },
      { key: "premium_brand",           label: "Premium Brand (NT, Flawless)",         impact: 0.10, note: "Yes/No: elite print brand" },
    ]
  },

  // ── 2. SCARCITY & POPULATION ─────────────────────────────────────────────────
  // Absolute supply constraints. Major positive if yes.
  scarcity_population: {
    label: "Scarcity & Population",
    icon: "Diamond",
    description: "Is this copy truly rare?",
    attributes: [
      { key: "is_one_of_one",           label: "1-of-1 / True One-of-One",             impact: 0.25, note: "Yes/No: plate, superfractor, logoman" },
      { key: "is_serialized",           label: "Serialized (numbered)",                impact: 0.15, note: "Yes/No: /10, /25, /99, etc." },
      { key: "low_serial_number",       label: "Low Serial (≤5 of run)",               impact: 0.12, note: "Yes/No: bookend or super-low #" },
      { key: "rare_grade",              label: "Rare Grade (Pop ≤5)",                  impact: 0.10, note: "Yes/No: only a few graded at this level" },
    ]
  },

  // ── 3. MARKET MOMENTUM ───────────────────────────────────────────────────────
  // Forward-looking demand. Moderate positive if yes.
  market_momentum: {
    label: "Market Momentum",
    icon: "TrendingUp",
    description: "Is this card trending now?",
    attributes: [
      { key: "trending_up_30d",         label: "Price Trending Up (30-day)",           impact: 0.12, note: "Yes/No: recent sales up" },
      { key: "high_liquidity",          label: "High Liquidity",                       impact: 0.10, note: "Yes/No: sells in 48 hours" },
      { key: "viral_market_heat",       label: "Viral / High Market Heat",             impact: 0.08, note: "Yes/No: trending on social, high search" },
    ]
  },

  // ── 4. PLAYER INVESTMENT THESIS ──────────────────────────────────────────────
  // Player demand. Mix of major positive and major negative.
  player_thesis: {
    label: "Player Investment Thesis",
    icon: "Trophy",
    description: "Is the player a good long-term bet?",
    attributes: [
      { key: "goat_legacy",             label: "GOAT / All-Time Great",                impact: 0.20, note: "Yes/No: Jordan, LeBron, Kobe tier" },
      { key: "hof_lock",                label: "Hall of Fame Lock",                    impact: 0.18, note: "Yes/No: guaranteed enshrinement" },
      { key: "rising_star",             label: "Rising Star (peak 5+ years ahead)",    impact: 0.12, note: "Yes/No: career on upswing" },
      { key: "championship_winner",     label: "Championship Winner",                  impact: 0.10, note: "Yes/No: rings add demand" },
    ]
  },

  // ── 5. RISK ADJUSTMENTS ──────────────────────────────────────────────────────
  // Major negative signals. These are your IP killers.
  risk_adjustments: {
    label: "Risk Adjustments",
    icon: "AlertTriangle",
    description: "Are there material downside risks?",
    attributes: [
      { key: "serious_injury",          label: "Serious Injury / Career Threatening",  impact: -0.30, note: "Yes/No: career-ending or long-term damage" },
      { key: "legal_issue",             label: "Legal / Off-Court Issues",             impact: -0.25, note: "Yes/No: criminal charges, suspensions" },
      { key: "bust_risk",               label: "Bust Risk (prospect, underperforming)", impact: -0.22, note: "Yes/No: could become irrelevant" },
      { key: "aging_decline",           label: "Aging / Decline Phase",                impact: -0.12, note: "Yes/No: post-peak player" },
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
    (sum, cat) => sum + cat.attributes.reduce((s, a) => s + Math.abs(a.impact), 0), 0
  );
};