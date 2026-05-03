import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ATTRIBUTE_CATEGORIES } from '@/components/valuation/AttributeCategories';

// Jordan Rookie Fleer BGS 8.5 — pre-baked demo scores
const DEMO_SCORES = {
  // Player Performance
  ppg: 87, career_trajectory: 99, injury_risk: 72, playoff_performer: 99,
  all_star_selections: 99, mvp_potential: 99, championships: 99, all_nba_teams: 99,
  current_season_performance: 40,
  // Market Dynamics
  trade_volume_30d: 88, trade_volume_90d: 85, price_trend_30d: 76, price_trend_90d: 80,
  volatility: 45, liquidity_score: 90, buy_sell_ratio: 82,
  // Grade & Condition
  grade_multiplier_value: 65, registry_premium: 55, grading_company_trust: 85,
  centering_quality: 68, surface_condition: 70, pop_scarcity_at_grade: 72,
  upgrade_potential: 60, crossover_appeal: 75,
  // Scarcity
  pop_report: 62, print_run: 70, grade_rarity: 65, set_prestige: 99,
  variation_desirability: 88, rookie_card: 99,
  // Cultural & Brand
  social_media_following: 95, social_media_engagement: 78, highlight_virality: 92,
  endorsement_deals: 99, jersey_sales_rank: 95, media_mentions: 90,
  cultural_icon_status: 99, off_court_brand: 98,
  // Investment Fundamentals
  historical_appreciation: 96, hold_period_returns: 91, downside_protection: 85,
  comparable_player_premium: 95, era_value_multiplier: 88, cross_sport_demand: 80,
  // External Factors
  player_age: 30, contract_status: 35, team_market_size: 99, national_tv_appearances: 96,
  playoff_team: 90, hall_of_fame_trajectory: 99, international_appeal: 98, draft_class_strength: 85,
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

function getColor(score) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function getBarColor(score) {
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-red-400';
}

function getTrend(score) {
  if (score >= 75) return 'up';
  if (score >= 45) return 'neutral';
  return 'down';
}

function AttributeRow({ attr, score, index }) {
  const trend = getTrend(score);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025 }}
      className="flex items-center gap-2 py-1.5 border-b border-border/20 last:border-0 group hover:bg-white/3 rounded px-1 transition-colors"
    >
      {/* Trend arrow */}
      <div className="w-5 shrink-0 flex justify-center">
        {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
        {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
        {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-yellow-400" />}
      </div>

      {/* Label */}
      <span className="flex-1 text-[11px] text-muted-foreground truncate">{attr.label}</span>

      {/* Weight badge */}
      <span className="text-[9px] font-mono text-muted-foreground/50 w-6 text-right">w{attr.weight}</span>

      {/* Mini bar */}
      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden shrink-0">
        <motion.div
          className={cn("h-full rounded-full", getBarColor(score))}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: index * 0.025 }}
        />
      </div>

      {/* Score */}
      <span className={cn("text-[11px] font-mono font-bold w-7 text-right shrink-0", getColor(score))}>
        {score}
      </span>
    </motion.div>
  );
}

function CategoryBlock({ catKey, cat, index }) {
  const attrs = cat.attributes;
  const avgScore = Math.round(attrs.reduce((s, a) => s + (DEMO_SCORES[a.key] || 0), 0) / attrs.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-card border border-border/40 rounded-xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{CATEGORY_ICONS[catKey]}</span>
          <span className="text-[11px] font-mono font-semibold text-foreground uppercase tracking-wider">
            {cat.label}
          </span>
        </div>
        <span className={cn("text-sm font-mono font-bold", getColor(avgScore))}>{avgScore}</span>
      </div>
      <div>
        {attrs.map((attr, i) => (
          <AttributeRow
            key={attr.key}
            attr={attr}
            score={DEMO_SCORES[attr.key] || 0}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function LiveAttributeTicker() {
  const categories = Object.entries(ATTRIBUTE_CATEGORIES);
  const allAttrs = categories.flatMap(([, cat]) => cat.attributes);
  const overallScore = Math.round(
    allAttrs.reduce((s, a) => s + (DEMO_SCORES[a.key] || 0) * a.weight, 0) /
    allAttrs.reduce((s, a) => s + a.weight, 0)
  );

  // Raw comp for BGS 8.5 Jordan Fleer rookie approx $3,200
  const rawComp = 3200;
  const gradeMultiplier = 0.65; // BGS 8.5
  const registryPremium = 0;
  const adjustedComp = rawComp * gradeMultiplier * (1 + registryPremium);
  // New model: comp is anchor, attributes apply ±24% modifier
  const attributeModifier = (overallScore - 50) / 50; // -1.0 to +1.0
  const aiValue = Math.round(adjustedComp * (1 + (attributeModifier * 0.40)));

  return (
    <div className="space-y-4">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Live Demo
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">42 attributes scored</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">Michael Jordan</h3>
            <p className="text-xs text-muted-foreground">1986 Fleer Rookie #57 · BGS 8.5 NM-MT</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-muted-foreground uppercase">AI Inv. Value</p>
            <p className="text-2xl font-mono font-bold text-primary">${aiValue.toLocaleString()}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              Comp: ${rawComp.toLocaleString()} · ×0.65 grade
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallScore}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <span className="text-sm font-mono font-bold text-primary shrink-0">
            {overallScore}/100
          </span>
        </div>
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground mt-1">
          <span>Overall Investment Score</span>
          <span className="text-emerald-400">STRONG BUY ↑</span>
        </div>
      </div>

      {/* All Categories */}
      <div className="grid grid-cols-1 gap-3">
        {categories.map(([catKey, cat], i) => (
          <CategoryBlock key={catKey} catKey={catKey} cat={cat} index={i} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1">
        {[
          { icon: TrendingUp, color: 'text-emerald-400', label: 'Strong (75+)' },
          { icon: Minus, color: 'text-yellow-400', label: 'Moderate (45-74)' },
          { icon: TrendingDown, color: 'text-red-400', label: 'Weak (<45)' },
        ].map(({ icon: Icon, color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <Icon className={cn("w-3 h-3", color)} />
            <span className="text-[10px] text-muted-foreground font-mono">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}