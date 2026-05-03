import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ATTRIBUTE_CATEGORIES } from '@/components/valuation/AttributeCategories';

// Jordan 1986 Fleer Rookie BGS 8.5 — demo scores
// Retired player: N/A fields use -1
const DEMO_SCORES = {
  ppg: 97, career_trajectory: 99, injury_risk: 88, playoff_performer: 99,
  all_star_selections: 99, mvp_potential: -1, championships: 99, all_nba_teams: 99,
  current_season_performance: -1,
  trade_volume_30d: 95, trade_volume_90d: 93, price_trend_30d: 91, price_trend_90d: 89,
  volatility: 55, liquidity_score: 97, buy_sell_ratio: 94,
  grade_multiplier_value: 65, registry_premium: 40, grading_company_trust: 92,
  centering_quality: 68, surface_condition: 70, pop_scarcity_at_grade: 72,
  upgrade_potential: 60, crossover_appeal: 88,
  pop_report: 62, pop_count_at_grade: 74, print_run: 70, grade_rarity: 65, set_prestige: 99,
  variation_desirability: 92, rookie_card: 99, jersey_number_match: 15,
  social_media_following: 97, social_media_engagement: 85, highlight_virality: 98,
  endorsement_deals: 99, jersey_sales_rank: 97, media_mentions: 95,
  cultural_icon_status: 99, off_court_brand: 99,
  historical_appreciation: 99, hold_period_returns: 96, downside_protection: 92,
  comparable_player_premium: 98, era_value_multiplier: 95, cross_sport_demand: 88,
  player_age: 80, contract_status: -1, team_market_size: 99, national_tv_appearances: 98,
  playoff_team: -1, hall_of_fame_trajectory: 99, international_appeal: 99, draft_class_strength: 92,
};

const CATEGORY_ICONS = {
  player_performance: '🏀',
  market_dynamics: '📈',
  grade_quality: '🛡️',
  scarcity_supply: '💎',
  cultural_brand: '⭐',
  investment_fundamentals: '📊',
  external_factors: '🌐',
};

function getScoreColor(s) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 60) return 'text-yellow-400';
  if (s >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getSignal(score) {
  if (score >= 85) return 'STRONG BUY';
  if (score >= 70) return 'BUY';
  if (score >= 50) return 'HOLD';
  if (score >= 35) return 'SELL';
  return 'STRONG SELL';
}

function getSignalColor(score) {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-emerald-300';
  if (score >= 50) return 'text-primary';
  if (score >= 35) return 'text-amber-400';
  return 'text-red-400';
}

export default function LiveAttributeTicker() {
  const categories = Object.entries(ATTRIBUTE_CATEGORIES);
  const validAttrs = categories.flatMap(([, cat]) => cat.attributes).filter(
    a => DEMO_SCORES[a.key] !== undefined && DEMO_SCORES[a.key] !== -1
  );
  const overallScore = Math.round(
    validAttrs.reduce((s, a) => s + DEMO_SCORES[a.key] * a.weight, 0) /
    validAttrs.reduce((s, a) => s + a.weight, 0)
  );

  const rawComp = 38000;
  const gradeMultiplier = 0.65;
  const adjustedComp = Math.round(rawComp * gradeMultiplier);
  const attributeModifier = (overallScore - 50) / 50;
  const aiValue = Math.round(adjustedComp * (1 + attributeModifier * 0.30));
  const pctVsComp = (((aiValue - rawComp) / rawComp) * 100).toFixed(1);
  const signal = getSignal(overallScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-primary/20 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/20 px-2 py-0.5 rounded-full">Live Demo</span>
        <span className="text-xs font-mono font-semibold text-foreground">Michael Jordan — 1986 Fleer Rookie #57 · BGS 8.5</span>
      </div>

      <div className="p-4 font-mono text-xs space-y-1">
        {/* Summary Block */}
        <div className="space-y-0.5 pb-3 border-b border-border/30 mb-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Sale (Comp):</span>
            <span className="text-foreground font-semibold">${rawComp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Grade Adjustment (×{gradeMultiplier} BGS 8.5):</span>
            <span className="text-foreground font-semibold">${adjustedComp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-primary">AI Investment Value:</span>
            <span className="text-primary font-bold">${aiValue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Difference vs Comp:</span>
            <span className={cn("font-bold", parseFloat(pctVsComp) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {parseFloat(pctVsComp) >= 0 ? '+' : ''}{pctVsComp}%
            </span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Investment Score:</span>
            <span className={cn("font-bold", getSignalColor(overallScore))}>
              {overallScore}/100 — {signal}
            </span>
          </div>
        </div>

        {/* Categories */}
        {categories.map(([catKey, cat], ci) => {
          const validCatScores = cat.attributes.map(a => DEMO_SCORES[a.key]).filter(s => s !== undefined && s !== -1);
          return (
            <div key={catKey} className="pb-3 mb-1">
              {/* Category header */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span>{CATEGORY_ICONS[catKey]}</span>
                <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">{cat.label}</span>
              </div>
              {/* Attribute rows */}
              <div className="space-y-0.5 pl-1">
                {cat.attributes.map((attr, i) => {
                  const score = DEMO_SCORES[attr.key];
                  const isNA = score === -1 || score === undefined || score === null;
                  return (
                    <motion.div
                      key={attr.key}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ci * 0.05 + i * 0.015 }}
                      className="flex justify-between items-center"
                    >
                      <span className="text-muted-foreground">
                        - {attr.label} <span className="text-muted-foreground/40">(w{attr.weight})</span>:
                      </span>
                      <span className={cn("font-bold ml-2 shrink-0", isNA ? 'text-muted-foreground/30' : getScoreColor(score))}>
                        {isNA ? 'N/A' : score}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
              {ci < categories.length - 1 && <div className="mt-2 border-b border-border/20" />}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}