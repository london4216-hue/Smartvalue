import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';
import LiveAttributeTicker from '@/components/dashboard/LiveAttributeTicker';
import TopTrending from '@/components/dashboard/TopTrending';
import DemoScoreCard from '@/components/dashboard/DemoScoreCard';



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
        <div className="lg:col-span-2">
          <DemoScoreCard />
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
        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Comp value doesn't define a card's worth.
              <br />
              <span className="text-primary">44 data points do.</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-4 max-w-2xl leading-relaxed">
              Collectors always knew the real drivers of value — but couldn't prove them. Serial number scarcity, auto type, PSA readiness, cultural momentum, set prestige, player trajectory, market velocity. We scored 44 factors to expose what a last sale never shows.
            </p>
            
            {/* Data Points Examples */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              {[
                'Serial scarcity',
                'Auto type & grade',
                'Set prestige tier',
                'PSA gem potential',
                'Pop report trends',
                'Player momentum',
                'Cultural catalyst',
                'Sneaker deal power',
                'Market velocity',
                'Auction activity',
                'Rookie status',
                'Viral moments'
              ].map((point, i) => (
                <motion.div
                  key={point}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.02 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                  <span>{point}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="relative shrink-0">
            <img
              src="https://d1htnxwo4o0jhw.cloudfront.net/cert/134044389/iiXp9pAT6EGgwPCfGBf1yA.jpg"
              alt="1986 Fleer Michael Jordan #57 BGS 8.5"
              className="w-28 h-36 object-cover rounded-xl border border-border/40 shadow-2xl"
              onError={(e) => {
                e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Michael_Jordan_in_2014.jpg/220px-Michael_Jordan_in_2014.jpg';
              }}
            />
            <span className="absolute -bottom-2 -right-2 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow">BGS 8.5</span>
            <span className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full shadow">LIVE DEMO</span>
          </div>
        </div>
      </motion.div>

      <ValuationSummary cards={cards} />
      <CTABanner />
      <RecentAndTrending cards={cards} />
    </div>
  );
}