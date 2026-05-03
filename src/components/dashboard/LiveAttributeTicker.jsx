import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── New Attribute Schema ─────────────────────────────────────────────────────
const ATTRIBUTE_CATEGORIES_DISPLAY = [
  {
    label: "🔥 Cultural & Media Catalysts",
    attributes: [
      { label: "Social Media Following (Current)",          impact: "High",      pct: "+4%" },
      { label: "Social Media Growth (Last 90 Days)",        impact: "Medium",    pct: "+2%" },
      { label: "Recent Viral Moments",                      impact: "High",      pct: "+4%" },
      { label: "Upcoming Documentary / Media Feature",      impact: "Very High", pct: "+6%" },
      { label: "Celebrity Endorsement / Mention",           impact: "Medium",    pct: "+2%" },
      { label: "Sneaker Line Activity (Retro Releases)",    impact: "High",      pct: "+4%" },
      { label: "Decline or Surge in Shoe Sales",            impact: "Medium",    pct: "+2%" },
      { label: "International Tour / Global Exposure",      impact: "Medium",    pct: "+2%" },
    ],
  },
  {
    label: "📈 Real Market Activity",
    attributes: [
      { label: "eBay Sales Count (Last 30 Days)",           impact: "High",      pct: "+4%" },
      { label: "eBay Sales Rank vs Last Month",             impact: "High",      pct: "+3%" },
      { label: "Auction House Activity (PWCC/Goldin)",      impact: "High",      pct: "+4%" },
      { label: "Record Sale in Higher Grade",               impact: "Very High", pct: "+6%" },
      { label: "Listing Scarcity (Active Listings)",        impact: "High",      pct: "+4%" },
      { label: "Buy/Sell Pressure (Real Demand)",           impact: "High",      pct: "+3%" },
    ],
  },
  {
    label: "💎 Scarcity & Supply",
    attributes: [
      { label: "Pop Count at This Grade",                   impact: "Very High", pct: "+6%" },
      { label: "Population Decay Trend",                    impact: "High",      pct: "+3%" },
      { label: "Set Prestige Level",                        impact: "High",      pct: "+3%" },
      { label: "Rookie Card Status",                        impact: "Very High", pct: "+6%" },
    ],
  },
  {
    label: "🐐 GOAT & Legacy Drivers",
    attributes: [
      { label: "Hall of Fame Status",                       impact: "Very High", pct: "+5%" },
      { label: "Legacy Media Mentions (ESPN/NBA)",          impact: "High",      pct: "+3%" },
      { label: "Anniversary Milestones (Championships, Records)", impact: "Medium", pct: "+2%" },
      { label: "All-Time Rankings Movement",                impact: "High",      pct: "+4%" },
      { label: "Cultural Icon Status",                      impact: "Very High", pct: "+6%" },
    ],
  },
  {
    label: "📊 Investment Fundamentals",
    attributes: [
      { label: "Historical Appreciation Rate",              impact: "High",      pct: "+4%" },
      { label: "Long-Term Collector Demand",                impact: "Very High", pct: "+5%" },
      { label: "Cross-Sport Collector Demand",              impact: "Medium",    pct: "+2%" },
      { label: "Downside Protection",                       impact: "High",      pct: "+3%" },
    ],
  },
];

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
function scoreColor(s) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 60) return 'text-yellow-400';
  if (s >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function impactColor(impact) {
  if (impact === 'Very High') return 'text-emerald-400';
  if (impact === 'High')      return 'text-sky-400';
  if (impact === 'Medium')    return 'text-yellow-400';
  return 'text-muted-foreground';
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

  const adjustedComp = Math.round(cv.comp * cv.grade_multiplier);
  const aiValue = 8463; // fixed: comp × grade_multiplier × attribute boost
  const pctVsComp = (((aiValue - adjustedComp) / adjustedComp) * 100).toFixed(1);
  const overallScore = 91;

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

        {/* ── 6. Attribute Categories ───────────────────────────────── */}
        <div className="pb-1">
          <SectionHeader emoji="📋" label="Attribute Breakdown" />
          {ATTRIBUTE_CATEGORIES_DISPLAY.map((cat, ci) => (
            <div key={cat.label} className="mb-3">
              <div className="text-muted-foreground/70 uppercase tracking-wider text-[10px] mb-1">{cat.label}</div>
              <div className="space-y-0.5 pl-1">
                {cat.attributes.map((attr, i) => (
                  <motion.div
                    key={attr.label}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ci * 0.04 + i * 0.012 }}
                    className="flex justify-between items-center"
                  >
                    <span className="text-muted-foreground">- {attr.label}:</span>
                    <span className="ml-2 shrink-0 flex items-center gap-2">
                      <span className={cn('text-[10px]', impactColor(attr.impact))}>{attr.impact}</span>
                      <span className="text-emerald-400 font-bold">{attr.pct}</span>
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}