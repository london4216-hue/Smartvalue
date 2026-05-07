import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import ScoreGauge from '@/components/valuation/ScoreGauge';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const recColors = {
  strong_buy: 'text-emerald-400 bg-emerald-400/10',
  buy: 'text-emerald-300 bg-emerald-300/10',
  hold: 'text-primary bg-primary/10',
  sell: 'text-amber-400 bg-amber-400/10',
  strong_sell: 'text-red-400 bg-red-400/10',
};

function PortfolioCard({ card, onDelete, onUpdatePurchasePrice }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(card.purchase_price || '');
  const rec = card.flip_vs_hold || 'hold';
  const roi = card.purchase_price && card.ai_investment_value
    ? (((card.ai_investment_value - card.purchase_price) / card.purchase_price) * 100).toFixed(1)
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/20 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground truncate">{card.player_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[card.card_year, card.card_set, card.variation, card.grade].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button
          onClick={() => onDelete(card.id)}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <ScoreGauge score={card.overall_score || 0} size="sm" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Comp Value</span>
            <span className="font-mono text-muted-foreground">
              {card.comp_value ? `$${card.comp_value.toLocaleString()}` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-primary">AI Value</span>
            <span className="font-mono font-bold text-primary">
              ${(card.ai_investment_value || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Purchase Price</span>
            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdatePurchasePrice(card.id, parseFloat(price) || 0);
                  setEditing(false);
                }}
                className="flex gap-1"
              >
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-5 w-20 text-xs px-1 bg-secondary"
                  autoFocus
                />
              </form>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                {card.purchase_price ? `$${card.purchase_price.toLocaleString()}` : 'Set price'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
        <span className={cn(
          "text-xs font-mono font-semibold px-2.5 py-1 rounded-full capitalize",
          recColors[rec] || 'text-muted-foreground bg-muted'
        )}>
          {rec.replace('_', ' ')}
        </span>
        {roi !== null && (
          <div className="flex items-center gap-1">
            {parseFloat(roi) >= 0 ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className={cn(
              "text-xs font-mono font-semibold",
              parseFloat(roi) >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {parseFloat(roi) >= 0 ? '+' : ''}{roi}% ROI
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Portfolio() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cards = [] } = useQuery({
    queryKey: ['portfolio-cards'],
    queryFn: () => base44.entities.CardValuation.filter({ in_portfolio: true }, '-created_date', 100),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CardValuation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-cards'] });
      toast({ title: "Card removed from portfolio" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, price }) => base44.entities.CardValuation.update(id, { purchase_price: price }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio-cards'] }),
  });

  const totalInvested = cards.reduce((s, c) => s + (c.purchase_price || 0), 0);
  const totalAiValue = cards.reduce((s, c) => s + (c.ai_investment_value || 0), 0);
  const portfolioROI = totalInvested > 0 ? (((totalAiValue - totalInvested) / totalInvested) * 100).toFixed(1) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Portfolio</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your cards and see AI-powered investment insights.
        </p>
      </motion.div>

      {/* Portfolio Stats */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 mb-8">
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Cards</p>
            <p className="text-xl font-bold text-foreground mt-1">{cards.length}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Invested</p>
            <p className="text-xl font-bold text-foreground mt-1">${totalInvested.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-primary/20 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-primary">AI Portfolio Value</p>
            <p className="text-xl font-bold text-primary mt-1">${totalAiValue.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Portfolio ROI</p>
            <p className={cn(
              "text-xl font-bold mt-1",
              portfolioROI && parseFloat(portfolioROI) >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {portfolioROI ? `${parseFloat(portfolioROI) >= 0 ? '+' : ''}${portfolioROI}%` : 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-12 text-center mt-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Your portfolio is empty</p>
          <p className="text-xs text-muted-foreground mt-1">
            Valuate cards and save them to your portfolio
          </p>
          <Link to="/valuate">
            <Button variant="outline" className="mt-4 rounded-xl border-border/50">
              Valuate a Card
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {cards.map(card => (
              <PortfolioCard
                key={card.id}
                card={card}
                onDelete={(id) => deleteMutation.mutate(id)}
                onUpdatePurchasePrice={(id, price) => updateMutation.mutate({ id, price })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}