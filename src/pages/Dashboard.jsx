import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, TrendingUp, BarChart3, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';

function StatCard({ label, value, sub, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card border border-border/50 rounded-2xl p-5"
    >
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

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

export default function Dashboard() {
  const { data: cards = [] } = useQuery({
    queryKey: ['card-valuations'],
    queryFn: () => base44.entities.CardValuation.list('-created_date', 50),
    initialData: [],
  });

  const portfolioCards = cards.filter(c => c.in_portfolio);
  const totalValue = portfolioCards.reduce((s, c) => s + (c.ai_investment_value || 0), 0);
  const avgScore = portfolioCards.length > 0
    ? Math.round(portfolioCards.reduce((s, c) => s + (c.overall_score || 0), 0) / portfolioCards.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Hero */}
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
          Comps are for flippers.
          <br />
          <span className="text-primary">This is for investors.</span>
        </h1>
        <p className="text-base text-muted-foreground mt-4 max-w-2xl">
          42 AI-analyzed attributes. Player trajectory, social media presence, market dynamics,
          cultural impact, and more — weighted against comp baselines to find true investment value.
        </p>
        <Link to="/valuate">
          <Button className="mt-6 h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-semibold">
            <Sparkles className="w-5 h-5 mr-2" />
            Valuate a Card
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      {portfolioCards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Portfolio Cards" value={portfolioCards.length} delay={0.1} />
          <StatCard label="Total AI Value" value={`$${totalValue.toLocaleString()}`} delay={0.15} />
          <StatCard label="Avg Investment Score" value={avgScore} sub="out of 100" delay={0.2} />
          <StatCard
            label="Total Valuations"
            value={cards.length}
            sub="all time"
            delay={0.25}
          />
        </div>
      )}

      {/* Feature Cards + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Features */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">How It Works</h2>
          {[
            { icon: Search, title: "Enter Card Details", desc: "Player, year, set, grade, and last comp sale." },
            { icon: BarChart3, title: "42 Factors Analyzed", desc: "AI scores performance, scarcity, culture, market dynamics & more." },
            { icon: TrendingUp, title: "Investment Value", desc: "50% comp baseline + 50% AI attribute score = true investment value." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex gap-4 bg-card border border-border/50 rounded-xl p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Valuations */}
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
              <p className="text-xs text-muted-foreground mt-1">
                Run your first AI valuation to see it here
              </p>
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
    </div>
  );
}