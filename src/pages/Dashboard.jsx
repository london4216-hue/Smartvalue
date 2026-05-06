import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Zap, CheckCircle2, Target, TrendingUp, Clock, Shield, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';
import TopTrending from '@/components/dashboard/TopTrending';



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
        <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">Your edge starts here</p>
        <h2 className="text-xl font-bold text-foreground">Paste a link. Get the real number in seconds.</h2>
        <p className="text-sm text-muted-foreground mt-1.5">44 data signals. One AI verdict. Flip it or hold it — you decide.</p>
      </div>
      <Link to="/valuate" className="shrink-0">
        <Button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold whitespace-nowrap">
          <Sparkles className="w-4 h-4 mr-2" />
          Get My AI Value
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
            <p className="text-xs text-muted-foreground mt-1">Paste a card link — let AI run the 44-signal verdict</p>
            <Link to="/valuate">
              <Button variant="outline" className="mt-4 rounded-xl border-border/50">
                Run Your First Valuation <ArrowRight className="w-4 h-4 ml-2" />
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

      {/* HERO — The value promise */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-primary">AI Card Intelligence · 44 Data Signals</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
          The last sold comp isn't the whole story.
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed mb-8">
          Last sale is just the starting point. Our AI runs 44 data signals — scarcity, grade, player trajectory, market momentum & more — to raise or lower that comp and reveal what the card is <em>actually</em> worth today. Then you decide: flip it short or hold it long. That's the power only AI can bring.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <Link to="/valuate" className="shrink-0">
            <Button className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold">
              <Target className="w-5 h-5 mr-2" />
              Get My True AI Value
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/portfolio" className="shrink-0">
            <Button variant="outline" className="h-12 px-8 rounded-xl border-border/50 text-base font-semibold">
              <TrendingUp className="w-5 h-5 mr-2" />
              View My Portfolio
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Target, label: 'True AI Value', desc: '44 signals adjust the comp up or down — revealing what the card is really worth' },
            { icon: TrendingUp, label: 'Flip Short or Hold Long', desc: 'AI tells you exactly which move the data supports' },
            { icon: Search, label: 'Live Deal Hunter', desc: 'Searches eBay, PWCC, Goldin & COMC for the best price right now' },
            { icon: Shield, label: '44-Signal Algorithm', desc: 'Grade, scarcity, player trajectory, momentum & 40 more factors' },
            { icon: AlertCircle, label: 'Price Alerts', desc: 'Get notified the moment a card hits your target price' },
            { icon: Clock, label: '30-Second Verdict', desc: 'Paste any listing URL — AI does the rest' },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05 }}
                className="bg-card border border-border/50 rounded-xl p-4 flex gap-3"
              >
                <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <ValuationSummary cards={cards} />
      <CTABanner />
      <RecentAndTrending cards={cards} />
    </div>
  );
}