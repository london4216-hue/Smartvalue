// Grade weight multipliers — how much each grade amplifies or discounts value
// Scale: 1.0 = neutral baseline. Higher = premium. Lower = discount.
export const GRADE_WEIGHTS = {
  // PSA
  "PSA 10":  { multiplier: 2.20, label: "PSA 10 — Gem Mint",        tier: "gem",      registry_premium: 0.25, centering_tolerance: "55/45", surface_standard: "pristine", pop_scarcity_factor: 0.9 },
  "PSA 9":   { multiplier: 1.25, label: "PSA 9 — Mint",             tier: "mint",     registry_premium: 0.05, centering_tolerance: "60/40", surface_standard: "minor wear allowed", pop_scarcity_factor: 0.5 },
  "PSA 8":   { multiplier: 0.70, label: "PSA 8 — Near Mint-Mint",   tier: "nm",       registry_premium: 0,    centering_tolerance: "65/35", surface_standard: "light wear", pop_scarcity_factor: 0.2 },
  "PSA 7":   { multiplier: 0.45, label: "PSA 7 — Near Mint",        tier: "low",      registry_premium: 0,    centering_tolerance: "70/30", surface_standard: "moderate wear", pop_scarcity_factor: 0.1 },
  // BGS / Beckett
  "BGS 10":  { multiplier: 2.80, label: "BGS 10 — Pristine",        tier: "pristine", registry_premium: 0.35, centering_tolerance: "50/50", surface_standard: "flawless", pop_scarcity_factor: 1.0 },
  "BGS 9.5": { multiplier: 1.90, label: "BGS 9.5 — Gem Mint",       tier: "gem",      registry_premium: 0.20, centering_tolerance: "55/45", surface_standard: "near flawless", pop_scarcity_factor: 0.85 },
  "BGS 9":   { multiplier: 1.10, label: "BGS 9 — Mint",             tier: "mint",     registry_premium: 0.05, centering_tolerance: "60/40", surface_standard: "minor wear", pop_scarcity_factor: 0.4 },
  "BGS 8.5": { multiplier: 0.65, label: "BGS 8.5 — Near Mint-Mint", tier: "nm",       registry_premium: 0,    centering_tolerance: "65/35", surface_standard: "light wear", pop_scarcity_factor: 0.15 },
  // SGC
  "SGC 10":  { multiplier: 1.80, label: "SGC 10 — Gem Mint",        tier: "gem",      registry_premium: 0.15, centering_tolerance: "55/45", surface_standard: "gem quality", pop_scarcity_factor: 0.75 },
  "SGC 9.5": { multiplier: 1.40, label: "SGC 9.5 — Mint+",          tier: "gem",      registry_premium: 0.10, centering_tolerance: "58/42", surface_standard: "near gem", pop_scarcity_factor: 0.6 },
  "SGC 9":   { multiplier: 1.05, label: "SGC 9 — Mint",             tier: "mint",     registry_premium: 0,    centering_tolerance: "60/40", surface_standard: "minor wear", pop_scarcity_factor: 0.35 },
  // CGC
  "CGC 10":  { multiplier: 1.70, label: "CGC 10 — Pristine",        tier: "gem",      registry_premium: 0.12, centering_tolerance: "55/45", surface_standard: "pristine", pop_scarcity_factor: 0.7 },
  "CGC 9.5": { multiplier: 1.30, label: "CGC 9.5 — Gem Mint",       tier: "gem",      registry_premium: 0.08, centering_tolerance: "58/42", surface_standard: "near pristine", pop_scarcity_factor: 0.55 },
  // Raw
  "Raw (Ungraded)": { multiplier: 0.40, label: "Raw — Ungraded",    tier: "raw",      registry_premium: 0,    centering_tolerance: "unknown", surface_standard: "unknown", pop_scarcity_factor: 0 },
};

export const GRADE_TIER_LABELS = {
  pristine: { label: "Pristine", color: "text-violet-400" },
  gem:      { label: "Gem Mint", color: "text-emerald-400" },
  mint:     { label: "Mint",     color: "text-blue-400" },
  nm:       { label: "NM-MT",    color: "text-amber-400" },
  low:      { label: "Low",      color: "text-orange-400" },
  raw:      { label: "Raw",      color: "text-muted-foreground" },
};

// All 40+ attributes organized by category
export const ATTRIBUTE_CATEGORIES = {
  player_performance: {
    label: "Player Performance",
    icon: "Flame",
    attributes: [
      { key: "ppg", label: "Points Per Game", weight: 3 },
      { key: "career_trajectory", label: "Career Trajectory", weight: 4 },
      { key: "injury_risk", label: "Injury Risk (lower = better)", weight: 3 },
      { key: "playoff_performer", label: "Playoff Performer", weight: 3 },
      { key: "all_star_selections", label: "All-Star Selections", weight: 3 },
      { key: "mvp_potential", label: "MVP Potential", weight: 4 },
      { key: "championships", label: "Championships Won", weight: 3 },
      { key: "all_nba_teams", label: "All-NBA Selections", weight: 2 },
      { key: "current_season_performance", label: "Current Season Performance", weight: 4 },
    ]
  },
  market_dynamics: {
    label: "Market Dynamics",
    icon: "TrendingUp",
    attributes: [
      { key: "trade_volume_30d", label: "30-Day Trade Volume", weight: 4 },
      { key: "trade_volume_90d", label: "90-Day Trade Volume", weight: 3 },
      { key: "price_trend_30d", label: "30-Day Price Trend", weight: 4 },
      { key: "price_trend_90d", label: "90-Day Price Trend", weight: 3 },
      { key: "volatility", label: "Price Volatility", weight: 2 },
      { key: "liquidity_score", label: "Liquidity Score", weight: 3 },
      { key: "buy_sell_ratio", label: "Buy/Sell Pressure Ratio", weight: 3 },
    ]
  },
  grade_quality: {
    label: "Grade & Condition Quality",
    icon: "Shield",
    attributes: [
      { key: "grade_multiplier_value",   label: "Grade Tier Multiplier Impact",    weight: 5 },
      { key: "registry_premium",         label: "Registry / Set Premium",          weight: 4 },
      { key: "grading_company_trust",    label: "Grading Company Market Trust",    weight: 4 },
      { key: "centering_quality",        label: "Centering Quality",               weight: 3 },
      { key: "surface_condition",        label: "Surface Condition Score",         weight: 3 },
      { key: "pop_scarcity_at_grade",    label: "Population Scarcity at This Grade", weight: 4 },
      { key: "upgrade_potential",        label: "Upgrade Potential (raw/low grade)", weight: 2 },
      { key: "crossover_appeal",         label: "Cross-Grade / Cross-Company Appeal", weight: 2 },
    ]
  },
  scarcity_supply: {
    label: "Scarcity & Supply",
    icon: "Diamond",
    attributes: [
      { key: "pop_report", label: "Population Report (# graded)", weight: 4 },
      { key: "print_run", label: "Print Run / Numbered", weight: 4 },
      { key: "grade_rarity", label: "Grade Rarity (gem rate)", weight: 3 },
      { key: "set_prestige", label: "Set Prestige Level", weight: 3 },
      { key: "variation_desirability", label: "Variation Desirability", weight: 3 },
      { key: "rookie_card", label: "Rookie Card Status", weight: 4 },
    ]
  },
  cultural_brand: {
    label: "Cultural & Brand Power",
    icon: "Star",
    attributes: [
      { key: "social_media_following", label: "Social Media Following", weight: 3 },
      { key: "social_media_engagement", label: "Social Media Engagement Rate", weight: 3 },
      { key: "highlight_virality", label: "Highlight Reel Virality", weight: 2 },
      { key: "endorsement_deals", label: "Endorsement Deals", weight: 3 },
      { key: "jersey_sales_rank", label: "Jersey Sales Rank", weight: 2 },
      { key: "media_mentions", label: "Media Mentions (Monthly)", weight: 2 },
      { key: "cultural_icon_status", label: "Cultural Icon Status", weight: 3 },
      { key: "off_court_brand", label: "Off-Court Brand Strength", weight: 2 },
    ]
  },
  investment_fundamentals: {
    label: "Investment Fundamentals",
    icon: "LineChart",
    attributes: [
      { key: "historical_appreciation", label: "Historical Appreciation Rate", weight: 4 },
      { key: "hold_period_returns", label: "Avg Hold Period Returns", weight: 3 },
      { key: "downside_protection", label: "Downside Protection", weight: 3 },
      { key: "comparable_player_premium", label: "Comparable Player Premium", weight: 3 },
      { key: "era_value_multiplier", label: "Era Value Multiplier", weight: 2 },
      { key: "cross_sport_demand", label: "Cross-Sport Collector Demand", weight: 1 },
    ]
  },
  external_factors: {
    label: "External Factors",
    icon: "Globe",
    attributes: [
      { key: "player_age", label: "Player Age (prime window)", weight: 4 },
      { key: "contract_status", label: "Contract Status", weight: 3 },
      { key: "team_market_size", label: "Team Market Size", weight: 2 },
      { key: "national_tv_appearances", label: "National TV Appearances", weight: 2 },
      { key: "playoff_team", label: "Playoff Team Status", weight: 3 },
      { key: "hall_of_fame_trajectory", label: "Hall of Fame Trajectory", weight: 4 },
      { key: "international_appeal", label: "International Appeal", weight: 2 },
      { key: "draft_class_strength", label: "Draft Class Strength", weight: 1 },
    ]
  }
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