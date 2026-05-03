import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Flame, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';

const REC_COLORS = {
  strong_buy: 'text-emerald-400',
  buy: 'text-emerald-300',
  hold: 'text-primary',
  sell: 'text-amber-400',
  strong_sell: 'text-red-400',
};

const REC_ICONS = {
  strong_buy: TrendingUp,
  buy: TrendingUp,
  hold: Minus,
  sell: TrendingDown,
  strong_sell: TrendingDown,
};

function TrendingRow({ card, rank, delay }) {
  const rec = card.flip_vs_hold || 'hold';
  const RecIcon = REC_ICONS[rec] || Minus;
  const compValue = card.comp_value || 0;
  const aiValue = card.ai_investment_value || 0;
  const pctDiff = compValue > 0 ? ((aiValue - compValue) / compValue * 100).toFixed(1) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <Link to={`/card/${card.id}`}>
        <div className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3 hover:border-primary/40 hover:bg-card/80 transition-all cursor-pointer group">
          {/* Rank */}
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0",
            rank === 1 ? "bg-primary text-primary-foreground" :
            rank === 2 ? "bg-muted-foreground/20 text-foreground" :
            rank === 3 ? "bg-amber-400/20 text-amber-400" :
            "bg-secondary text-muted-foreground"
          )}>
            {rank}
          </div>

          {/* Score gauge small */}
          <ScoreGauge score={card.overall_score || 0} size="sm" />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {card.player_name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {[card.card_year, card.card_set, card.grade].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Value + rec */}
          <div className="text-right shrink-0">
            <p className="text-xs font-mono font-bold text-primary">${aiValue.toLocaleString()}</p>
            <div className="flex items-center justify-end gap-0.5">
              <RecIcon className={cn("w-2.5 h-2.5", REC_COLORS[rec])} />
              {pctDiff && (
                <span className={cn("text-[9px] font-mono", parseFloat(pctDiff) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {parseFloat(pctDiff) >= 0 ? '+' : ''}{pctDiff}%
                </span>
              )}
            </div>
          </div>

          <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function TopTrending({ cards }) {
  // Sort by overall_score descending, take top 10
  const top10 = [...cards]
    .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    .slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Flame className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Top 10 Trending</h2>
        <div className="flex-1 h-px bg-border/40" />
        <span className="text-[10px] font-mono text-muted-foreground">by score</span>
      </div>

      {top10.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
          <p className="text-xs text-muted-foreground">No valuations yet — run your first to see trending cards.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {top10.map((card, i) => (
            <TrendingRow key={card.id} card={card} rank={i + 1} delay={0.05 * i} />
          ))}
        </div>
      )}
    </div>
  );
}