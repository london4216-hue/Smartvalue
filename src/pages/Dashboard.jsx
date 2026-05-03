import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, TrendingUp, BarChart2, Layers, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';
import LiveAttributeTicker from '@/components/dashboard/LiveAttributeTicker';
import TopTrending from '@/components/dashboard/TopTrending';

// ── How it works pills ────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { icon: Layers,     label: "42 Attributes",      sub: "Card DNA, scarcity, auto, patch, pop" },
  { icon: TrendingUp, label: "Market Momentum",     sub: "Real eBay data, auction velocity, heat" },
  { icon: BarChart2,  label: "Player Thesis",       sub: "Legacy, trajectory, cultural reach" },
  { icon: Zap,        label: "AI Investment Score", sub: "0–100 with flip vs hold signal" },
];

function HowItWorks() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
      {HOW_IT_WORKS.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-2"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground leading-snug">{item.sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Portfolio summary stats ───────────────────────────────────────────────────
function ValuationSummary({ cards }) {
  const portfolioCards = cards.filter(c => c.in_portfolio);
  const totalValue = portfolioCards.reduce((s, c) => s + (c.ai_investment_value || 0), 0);
  const avgScore = portfolioCards.length > 0
    ? Math.round(portfolioCards.reduce((s, c) => s + (c.overall_score || 0), 0) / portfolioCards.length)
    : 0;

  if (portfolioCards.length === 0) return null;

  const stats = [
    { label: "Portfolio Cards",       value: portfolioCards.length,              mono: false },
    { label: "Total AI Value",        value: `$${totalValue.toLocaleString()}`,  mono: true  },
    { label: "Avg Investment Score",  value: `${avgScore}/100`,                  mono: true  },
    { label: "Total Valuations",      value: cards.length,                       mono: false },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
      {stats.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.05 }}
          className="bg-card border border-border/50 rounded-xl p-4"
        >
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">{item.label}</p>
          <p className={cn("text-2xl font-bold text-foreground", item.mono && "font-mono")}>{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Live demo section ─────────────────────────────────────────────────────────
function LiveDemo() {
  return (
    <div className="mb-10">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Live Demo</span>
            <span className="text-sm font-semibold text-foreground">Michael Jordan — 1986 Fleer Rookie #57 · BGS 8.5</span>
          </div>
          <p className="text-xs text-muted-foreground">Every signal feeding the model — real sourced numbers</p>
        </div>
      </div>

      {/* Two-column: left = scores, right = signals */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Score card */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-5">

          {/* Card image + score row */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <img
                src="https://d1htnxwo4o0jhw.cloudfront.net/cert/134044389/iiXp9pAT6EGgwPCfGBf1yA.jpg"
                alt="1986 Fleer Michael Jordan #57 BGS 8.5"
                className="w-24 h-32 object-cover rounded-lg border border-border/40 shadow-lg"
                onError={(e) => {
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Michael_Jordan_in_2014.jpg/220px-Michael_Jordan_in_2014.jpg';
                }}
              />
              <span className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">BGS 8.5</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">AI Investment Value</p>
              <p className="text-3xl font-mono font-bold text-primary">$8,600</p>
              <p className="text-xs text-muted-foreground mt-1">vs last comp <span className="text-emerald-400 font-semibold">+26%</span></p>
              <div className="mt-2">
                <ScoreGauge score={91} label="Score" size="sm" />
              </div>
            </div>
          </div>

          {/* AI Value Formula */}
          <div className="border-t border-border/30 pt-4 space-y-1.5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">AI Value Formula</p>

            <div className="flex justify-between text-xs items-center">
              <span className="text-muted-foreground">Comp (last sale)</span>
              <span className="font-mono font-semibold text-foreground">$10,500</span>
            </div>
            <div className="flex justify-between text-xs items-center">
              <span className="text-muted-foreground">× Grade multiplier (0.65)</span>
              <span className="font-mono font-semibold text-foreground">$6,825</span>
            </div>
            {/* Top 5 drivers */}
            {[
              { label: "eBay Sales Spike (30d)",      pct: "+8%" },
              { label: "Record Sale (Higher Grade)",  pct: "+6%" },
              { label: "Cultural Icon Momentum",      pct: "+5%" },
              { label: "Sneaker Line Retro Release",  pct: "+4%" },
              { label: "Auction Velocity Surge",      pct: "+3%" },
            ].map(d => (
              <div key={d.label} className="flex justify-between text-[11px] items-center pl-2 border-l-2 border-emerald-400/30">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-mono font-semibold text-emerald-400">{d.pct}</span>
              </div>
            ))}
            <div className="flex justify-between text-[11px] items-center pl-2 border-l-2 border-muted-foreground/20">
              <span className="text-muted-foreground">39 supporting factors</span>
              <span className="font-mono font-semibold text-muted-foreground">+11%</span>
            </div>
            <div className="h-px bg-border/40 my-1" />
            <div className="flex justify-between text-xs items-center">
              <span className="font-semibold text-foreground">= AI Investment Value</span>
              <span className="font-mono font-bold text-primary text-sm">$8,600</span>
            </div>

            <div className="h-px bg-border/40 my-1" />
            {[
              { label: "Market Heat",  value: "91/100",    cls: "text-emerald-400" },
              { label: "Signal",       value: "STRONG BUY", cls: "text-emerald-400 font-bold" },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-mono font-semibold", row.cls)}>{row.value}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border/30 pt-4 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Key Signals</p>
            {[
              { label: "Pop 3,299 at BGS 8.5",         color: "text-amber-400" },
              { label: "True Rookie Card (1986 Fleer)", color: "text-emerald-400" },
              { label: "Jordan Brand: $6.6B/yr",      color: "text-emerald-400" },
              { label: "GOAT score: 99/100",           color: "text-primary" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 bg-current", s.color)} />
                <span className={cn(s.color)}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signal breakdown */}
        <div className="lg:col-span-3 space-y-2">
          <LiveAttributeTicker />
        </div>
      </div>
    </div>
  );
}

// ── CTA banner ────────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-10 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/25 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
    >
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">Ready to invest smarter?</p>
        <h2 className="text-xl font-bold text-foreground">Run your own AI valuation — free.</h2>
        <p className="text-sm text-muted-foreground mt-1.5">Enter any card. Get 42-attribute investment intelligence in seconds.</p>
      </div>
      <Link to="/valuate" className="shrink-0">
        <Button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold whitespace-nowrap">
          <Sparkles className="w-4 h-4 mr-2" />
          Valuate a Card
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </motion.div>
  );
}

// ── Recent card row ───────────────────────────────────────────────────────────
const REC_COLORS = {
  strong_buy:  'text-emerald-400',
  buy:         'text-emerald-300',
  hold:        'text-primary',
  sell:        'text-amber-400',
  strong_sell: 'text-red-400',
};

function RecentCard({ card, delay }) {
  const rec = card.flip_vs_hold || 'hold';
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 transition-colors"
    >
      <ScoreGauge score={card.overall_score || 0} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{card.player_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[card.card_year, card.card_set, card.grade].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-mono font-bold text-primary">
          ${(card.ai_investment_value || 0).toLocaleString()}
        </p>
        <p className={cn("text-xs font-mono font-semibold capitalize", REC_COLORS[rec] || 'text-muted-foreground')}>
          {rec.replace(/_/g, ' ')}
        </p>
      </div>
    </motion.div>
  );
}

function RecentAndTrending({ cards }) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <TopTrending cards={cards} />
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">Recent Valuations</h2>
        {cards.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No valuations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run your first AI valuation to see it here</p>
            <Link to="/valuate">
              <Button variant="outline" className="mt-4 rounded-xl border-border/50">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.slice(0, 8).map((card, i) => (
              <RecentCard key={card.id} card={card} delay={0.05 + i * 0.04} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data: cards = [] } = useQuery({
    queryKey: ['card-valuations'],
    queryFn: () => base44.entities.CardValuation.list('-created_date', 50),
    initialData: [],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Investment-Grade Intelligence</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          Today's comp is a snapshot.
          <br />
          <span className="text-primary">We find tomorrow's value.</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          A comp tells you what someone paid <em>yesterday</em>. Our 42-attribute model captures pop report trends, serial scarcity, auto type, cultural momentum, and player trajectory — everything the comp ignores.
        </p>
      </motion.div>

      <HowItWorks />
      <ValuationSummary cards={cards} />
      <LiveDemo />
      <CTABanner />
      <RecentAndTrending cards={cards} />
    </div>
  );
}