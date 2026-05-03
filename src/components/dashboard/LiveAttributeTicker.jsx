import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ATTRIBUTE_CATEGORIES } from '@/components/valuation/AttributeCategories';

// ─── Demo Data ────────────────────────────────────────────────────────────────
// Jordan 1986 Fleer Rookie #57 · BGS 8.5 NM-MT
// Comp: $10,500 (90-day avg, 50 sales — sportscardspro/cardladder 2025-2026)
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

const DEMO_DATA = {
  current_value: {
    comp: 10500,
    grade_multiplier: 0.65,
    signal_variant: 'strong_buy',
    signal_label: 'STRONG BUY',
  },
  future_projections: {
    one_year:  { value: 13650,  growth: '+30%',  confidence: 'High'   },
    five_year: { value: 29400,  growth: '+180%', confidence: 'High'   },
    ten_year:  { value: 63000,  growth: '+500%', confidence: 'Medium' },
  },
  momentum: {
    recent_sales_velocity: 'Up',
    trend_30d: '+15.8%',
    trend_90d: '+9.2%',
    market_heat_score: 91,
  },
  scarcity: {
    pop_total: 3296,
    pop_at_grade: 74,
    pop_decay_rate: 'Stable',
    scarcity_score: 72,
  },
  goat_premium: {
    era_multiplier: 2.4,
    cultural_multiplier: 3.1,
    goat_score: 99,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  player_performance:      '🏀',
  market_dynamics:         '📈',
  grade_quality:           '🛡️',
  scarcity_supply:         '💎',
  cultural_brand:          '⭐',
  investment_fundamentals: '📊',
  external_factors:        '🌐',
};

function scoreColor(s) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 60) return 'text-yellow-400';
  if (s >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function signalColor(variant) {
  return {
    strong_buy:  'text-emerald-400',
    buy:         'text-emerald-300',
    hold:        'text-primary',
    sell:        'text-amber-400',
    strong_sell: 'text-red-400',
  }[variant] || 'text-muted-foreground';
}

function confidenceColor(c) {
  return c === 'High' ? 'text-emerald-400' : c === 'Medium' ? 'text-yellow-400' : 'text-amber-400';
}

function velColor(v) {
  return v === 'Up' ? 'text-emerald-400' : v === 'Down' ? 'text-red-400' : 'text-yellow-400';
}

function Row({ label, value, valueClass = 'text-foreground font-semibold', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex justify-between items-center"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('ml-2 shrink-0', valueClass)}>{value}</span>
    </motion.div>
  );
}

function SectionHeader({ emoji, label }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span>{emoji}</span>
      <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">{label}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-b border-border/20" />;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LiveAttributeTicker() {
  const { current_value: cv, future_projections: fp, momentum: mom, scarcity: sc, goat_premium: goat } = DEMO_DATA;
  const categories = Object.entries(ATTRIBUTE_CATEGORIES);

  const validAttrs = categories.flatMap(([, cat]) => cat.attributes).filter(
    a => DEMO_SCORES[a.key] !== undefined && DEMO_SCORES[a.key] !== -1
  );
  const overallScore = Math.round(
    validAttrs.reduce((s, a) => s + DEMO_SCORES[a.key] * a.weight, 0) /
    validAttrs.reduce((s, a) => s + a.weight, 0)
  );

  const adjustedComp = Math.round(cv.comp * cv.grade_multiplier);
  const attributeAdjustment = ((overallScore - 50) / 50) * 0.30;
  const aiValue = Math.round(adjustedComp * (1 + attributeAdjustment));
  const pctVsComp = (((aiValue - adjustedComp) / adjustedComp) * 100).toFixed(1);

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

      <div className="p-4 font-mono text-xs space-y-0">

        {/* ── 1. Current Value ───────────────────────────────────────── */}
        <div className="pb-3">
          <SectionHeader emoji="💰" label="Current Value" />
          <div className="space-y-0.5 pl-1">
            <Row label="Last Sale (Comp):" value={`$${cv.comp.toLocaleString()}`} />
            <Row label={`Grade-Adjusted (×${cv.grade_multiplier} BGS 8.5):`} value={`$${adjustedComp.toLocaleString()}`} />
            <Row label="AI Investment Value:" value={`$${aiValue.toLocaleString()}`} valueClass="text-primary font-bold" />
            <Row
              label="Difference vs Grade-Adj Comp:"
              value={`${parseFloat(pctVsComp) >= 0 ? '+' : ''}${pctVsComp}%`}
              valueClass={cn('font-bold', parseFloat(pctVsComp) >= 0 ? 'text-emerald-400' : 'text-red-400')}
            />
            <Row label="Investment Score:" value={`${overallScore}/100`} valueClass={cn('font-bold', signalColor(cv.signal_variant))} />
            <Row label="Signal:" value={cv.signal_label} valueClass={cn('font-bold', signalColor(cv.signal_variant))} />
          </div>
        </div>
        <Divider />

        {/* ── 2. Future Projections ──────────────────────────────────── */}
        <div className="pb-3">
          <SectionHeader emoji="🔭" label="Future Projections" />
          <div className="space-y-0.5 pl-1">
            {[
              { label: '1-Year Target:', proj: fp.one_year },
              { label: '5-Year Target:', proj: fp.five_year },
              { label: '10-Year Target:', proj: fp.ten_year },
            ].map(({ label, proj }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{label}</span>
                <span className="ml-2 shrink-0 text-right">
                  <span className="text-foreground font-semibold">${proj.value.toLocaleString()}</span>
                  <span className="text-emerald-400 ml-1.5">{proj.growth}</span>
                  <span className={cn('ml-1.5 text-[10px]', confidenceColor(proj.confidence))}>({proj.confidence})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <Divider />

        {/* ── 3. Momentum ───────────────────────────────────────────── */}
        <div className="pb-3">
          <SectionHeader emoji="⚡" label="Market Momentum" />
          <div className="space-y-0.5 pl-1">
            <Row label="Sales Velocity:" value={mom.recent_sales_velocity} valueClass={cn('font-bold', velColor(mom.recent_sales_velocity))} />
            <Row label="30-Day Price Trend:" value={mom.trend_30d} valueClass="text-emerald-400 font-bold" />
            <Row label="90-Day Price Trend:" value={mom.trend_90d} valueClass="text-emerald-400 font-bold" />
            <Row label="Market Heat Score:" value={`${mom.market_heat_score}/100`} valueClass={scoreColor(mom.market_heat_score) + ' font-bold'} />
          </div>
        </div>
        <Divider />

        {/* ── 4. Scarcity ───────────────────────────────────────────── */}
        <div className="pb-3">
          <SectionHeader emoji="💎" label="Scarcity & Supply" />
          <div className="space-y-0.5 pl-1">
            <Row label="Pop Report (total graded):" value={sc.pop_total.toLocaleString()} />
            <Row label="Pop at BGS 8.5:" value={sc.pop_at_grade} />
            <Row label="Pop Decay Rate:" value={sc.pop_decay_rate} valueClass="text-yellow-400 font-bold" />
            <Row label="Scarcity Score:" value={`${sc.scarcity_score}/100`} valueClass={scoreColor(sc.scarcity_score) + ' font-bold'} />
          </div>
        </div>
        <Divider />

        {/* ── 5. GOAT Premium ───────────────────────────────────────── */}
        <div className="pb-3">
          <SectionHeader emoji="🐐" label="GOAT Premium" />
          <div className="space-y-0.5 pl-1">
            <Row label="Era Multiplier:" value={`${goat.era_multiplier}×`} valueClass="text-primary font-bold" />
            <Row label="Cultural Multiplier:" value={`${goat.cultural_multiplier}×`} valueClass="text-primary font-bold" />
            <Row label="GOAT Score:" value={`${goat.goat_score}/100`} valueClass="text-emerald-400 font-bold" />
          </div>
        </div>
        <Divider />

        {/* ── 6. 42 Attributes ──────────────────────────────────────── */}
        <div className="pb-1">
          <SectionHeader emoji="📋" label="All 42 Attributes" />
          {categories.map(([catKey, cat], ci) => (
            <div key={catKey} className="mb-3">
              <div className="flex items-center gap-1 mb-1">
                <span>{CATEGORY_ICONS[catKey]}</span>
                <span className="text-muted-foreground/70 uppercase tracking-wider text-[10px]">{cat.label}</span>
              </div>
              <div className="space-y-0.5 pl-1">
                {cat.attributes.map((attr, i) => {
                  const score = DEMO_SCORES[attr.key];
                  const isNA = score === -1 || score === undefined || score === null;
                  return (
                    <motion.div
                      key={attr.key}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ci * 0.04 + i * 0.012 }}
                      className="flex justify-between items-center"
                    >
                      <span className="text-muted-foreground">
                        - {attr.label} <span className="text-muted-foreground/30">(w{attr.weight})</span>:
                      </span>
                      <span className={cn('font-bold ml-2 shrink-0', isNA ? 'text-muted-foreground/30' : scoreColor(score))}>
                        {isNA ? 'N/A' : score}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}