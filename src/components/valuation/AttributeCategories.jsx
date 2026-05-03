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