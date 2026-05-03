import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';
import LiveAttributeTicker from '@/components/dashboard/LiveAttributeTicker';
import TopTrending from '@/components/dashboard/TopTrending';

// ── hero_bar ──────────────────────────────────────────────────────────────────
function HeroBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-primary" />
        <span className="text-xs font-mono uppercase tracking-wider text-primary">Investment-Grade Intelligence</span>
      </div>
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
        Today's comp is just a snapshot.
        <br />
        <span className="text-primary">We find tomorrow's value.</span>
      </h1>
      <p className="text-base text-muted-foreground mt-4 max-w-2xl">
        A comp tells you what someone paid <em>yesterday</em>. It doesn't know the player just got traded to a bigger market, is trending toward an MVP season, or that the pop report at this grade is drying up. Our 42-attribute model captures what the comp can't — and prices accordingly.
      </p>
    </motion.div>
  );
}

// ── valuation_summary (portfolio stats) ───────────────────────────────────────
function ValuationSummary({ cards }) {
  const portfolioCards = cards.filter(c => c.in_portfolio);
  const totalValue = portfolioCards.reduce((s, c) => s + (c.ai_investment_value || 0), 0);
  const avgScore = portfolioCards.length > 0
    ? Math.round(portfolioCards.reduce((s, c) => s + (c.overall_score || 0), 0) / portfolioCards.length)
    : 0;

  if (portfolioCards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      {[
        { label: "Portfolio Cards", value: portfolioCards.length },
        { label: "Total AI Value", value: `$${totalValue.toLocaleString()}` },
        { label: "Avg Investment Score", value: avgScore, sub: "out of 100" },
        { label: "Total Valuations", value: cards.length, sub: "all time" },
      ].map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          className="bg-card border border-border/50 rounded-2xl p-5"
        >
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{item.label}</p>
          <p className="text-2xl font-bold text-foreground mt-2">{item.value}</p>
          {item.sub && <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>}
        </motion.div>
      ))}
    </div>
  );
}

// ── attribute_grid_and_charts (live demo ticker) ───────────────────────────────
function AttributeGridAndCharts() {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          See It In Action — Jordan 1986 Fleer Rookie BGS 8.5
        </span>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <div className="overflow-y-auto max-h-[85vh] pr-1">
        <LiveAttributeTicker />
      </div>
    </div>
  );
}

// ── why_this_matters ──────────────────────────────────────────────────────────
function WhyThisMatters() {
  const steps = [
    { step: "1", title: "Comp = Today's Market Price", desc: "The last sold price is your anchor — it's real, it's what the market paid. We never ignore it.", color: "bg-muted-foreground/20 text-muted-foreground" },
    { step: "2", title: "Grade Multiplier Adjusts Reality", desc: "BGS 8.5 ≠ PSA 10. A 0.65× vs 2.2× grade multiplier can mean 3× the investment value on the same card.", color: "bg-blue-400/10 text-blue-400" },
    { step: "3", title: "42 Attributes Capture What Comps Miss", desc: "MVP trajectory, market-size trade, pop report shrinkage, cultural heat — none of this is in the comp. We score all of it.", color: "bg-primary/10 text-primary" },
    { step: "4", title: "Attributes Adjust Comp ±30%", desc: "Strong fundamentals push value above market. Weak outlook discounts it. The comp stays the anchor — attributes sharpen the aim.", color: "bg-emerald-400/10 text-emerald-400" },
  ];

  return (
    <div className="mb-10 grid lg:grid-cols-2 gap-6">
      <div className="bg-card border border-border/50 rounded-2xl p-6">
        <h3 className="text-base font-bold text-foreground mb-4">How The Model Works</h3>
        <div className="space-y-4">
          {steps.map(({ step, title, desc, color }) => (
            <div key={step} className="flex gap-3">
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5", color)}>
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-primary/20 rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-2">Why This Matters</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Comps are backwards-looking. A card can sell low in a slow week, then spike after a big playoff run, a trade to a major market, or a social media moment. Our model looks <strong className="text-foreground">forward</strong> — factoring in trajectory, scarcity trends, and cultural momentum to tell you if today's comp is a deal or a trap.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Flippers watch comps. <strong className="text-foreground">Investors watch signals.</strong> CardIQ PRO gives you the signals.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── run_valuation (CTA) ───────────────────────────────────────────────────────
function RunValuation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-12 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">Ready to invest smarter?</p>
        <h2 className="text-xl font-bold text-foreground">Run your own AI valuation — free.</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter any card. Get 42-attribute investment intelligence in seconds.</p>
      </div>
      <Link to="/valuate" className="shrink-0">
        <Button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold whitespace-nowrap">
          <Sparkles className="w-5 h-5 mr-2" />
          Valuate a Card
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </motion.div>
  );
}

// ── recent_and_trending ───────────────────────────────────────────────────────
function RecentCard({ card, delay }) {
  const rec = card.flip_vs_hold || 'hold';
  const recColors = {
    strong_buy: 'text-emerald-400',
    buy: 'text-emerald-300',
    hold: 'text-primary',
    sell: 'text-amber-400',
    strong_sell: 'text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
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
      <div className="text-right">
        <p className="text-sm font-mono font-bold text-primary">
          ${(card.ai_investment_value || 0).toLocaleString()}
        </p>
        <p className={cn("text-xs font-mono font-semibold capitalize", recColors[rec] || 'text-muted-foreground')}>
          {rec.replace('_', ' ')}
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
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
          Recent Valuations
        </h2>
        {cards.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-muted-foreground" />
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
              <RecentCard key={card.id} card={card} delay={0.1 + i * 0.05} />
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
      <HeroBar />
      <ValuationSummary cards={cards} />
      <AttributeGridAndCharts />
      <WhyThisMatters />
      <RunValuation />
      <RecentAndTrending cards={cards} />
    </div>
  );
}