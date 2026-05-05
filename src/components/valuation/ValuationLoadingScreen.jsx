import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Search, TrendingUp, Shield, Zap, Activity, AlertTriangle, Trophy, Twitter, Scale, Heart, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_1_STEPS = [
  { icon: Search, label: 'Scanning eBay completed listings...', sub: 'Last 90 days · hammer prices only' },
  { icon: TrendingUp, label: 'Checking 130point & CardLadder...', sub: 'Cross-referencing sale history' },
  { icon: Shield, label: 'Verifying comp authenticity...', sub: 'Filtering shill bids & outliers' },
];

const PHASE_2_STEPS = [
  { icon: Activity, label: 'Checking injury report...', sub: 'ESPN · NBA injury tracker · beat reporters' },
  { icon: Twitter, label: 'Scanning social media sentiment...', sub: 'Twitter/X · Reddit · hobby forums' },
  { icon: Flame, label: 'Checking playoff / in-season status...', sub: 'Is the player hooping RIGHT NOW?' },
  { icon: Trophy, label: 'Verifying championship trajectory...', sub: 'Title odds · team context · minutes' },
  { icon: Scale, label: 'Legal & off-court risk scan...', sub: 'News alerts · contract status · agent drama' },
  { icon: Heart, label: 'Pop report & scarcity analysis...', sub: 'PSA · BGS · SGC population data' },
  { icon: AlertTriangle, label: 'Bust risk assessment...', sub: 'Supply flood · declining comps · hot-to-cold signals' },
  { icon: Zap, label: 'Running 44-attribute model...', sub: 'Serial number · auto type · patch · brand tier' },
  { icon: TrendingUp, label: 'Computing AI investment value...', sub: 'Anchored to last sold · ±attribute adjustments' },
];

function Step({ step, state, delay }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: state !== 'waiting' ? 1 : 0.35, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500',
        state === 'done' && 'bg-emerald-500/8 border-emerald-500/25',
        state === 'active' && 'bg-primary/8 border-primary/30',
        state === 'waiting' && 'bg-secondary/20 border-border/20',
      )}
    >
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center">
        {state === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {state === 'active' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
        {state === 'waiting' && <Icon className="w-4 h-4 text-muted-foreground/40" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold leading-tight',
          state === 'done' && 'text-emerald-400',
          state === 'active' && 'text-primary',
          state === 'waiting' && 'text-muted-foreground/40',
        )}>
          {step.label}
        </p>
        {state !== 'waiting' && (
          <p className={cn('text-[10px] mt-0.5', state === 'done' ? 'text-emerald-400/60' : 'text-muted-foreground/60')}>
            {step.sub}
          </p>
        )}
      </div>
      {state === 'done' && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-[10px] font-mono text-emerald-400/70 shrink-0"
        >
          ✓
        </motion.span>
      )}
    </motion.div>
  );
}

export default function ValuationLoadingScreen({ loadingPhase, compFetchResult, cardData }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = loadingPhase === 'fetching_comp' ? PHASE_1_STEPS : PHASE_2_STEPS;

  useEffect(() => {
    setActiveStep(0);
    const intervals = [];
    const baseDuration = loadingPhase === 'fetching_comp' ? 3200 : 2800;

    steps.forEach((_, i) => {
      if (i === 0) return;
      const t = setTimeout(() => setActiveStep(i), i * baseDuration / steps.length * 1000 / 10 * (loadingPhase === 'fetching_comp' ? 14 : 10));
      intervals.push(t);
    });

    return () => intervals.forEach(clearTimeout);
  }, [loadingPhase]);

  // Simpler: just tick every N seconds
  useEffect(() => {
    setActiveStep(0);
    const ms = loadingPhase === 'fetching_comp' ? 4500 : 3200;
    const interval = setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }, ms / steps.length);
    return () => clearInterval(interval);
  }, [loadingPhase, steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-card border border-border/50 rounded-2xl overflow-hidden"
    >
      {/* Card identity banner */}
      {cardData?.player_name && (
        <div className="px-6 py-4 border-b border-border/30 bg-secondary/40">
          <p className="text-base font-bold text-foreground">{cardData.player_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[cardData.card_year, cardData.card_set, cardData.variation, cardData.serial_number ? `/${cardData.serial_number}` : null, cardData.grade].filter(Boolean).join(' · ')}
          </p>
        </div>
      )}

      {/* Header bar */}
      <div className="px-6 py-5 border-b border-border/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0,1,2,3,4].map(i => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.6, 1.4, 0.6] }}
                transition={{ duration: 1.0, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <div>
            <p className="text-sm font-bold text-primary">
              {loadingPhase === 'fetching_comp' ? 'Phase 1 — Market Intel' : 'Phase 2 — AI Deep Analysis'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {loadingPhase === 'fetching_comp'
                ? 'Hunting real last-sold prices across eBay, 130pt, CardLadder...'
                : 'Running 44-attribute model · injury check · social scan · legal screen...'}
            </p>
          </div>
        </div>
      </div>

      {/* Phase 1 comp result badge */}
      <AnimatePresence>
        {compFetchResult?.comp_value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between"
          >
            <p className="text-xs text-emerald-400 font-semibold">✓ Last sold found · {compFetchResult.sale_date || 'recent'} · {compFetchResult.confidence || 'medium'} confidence</p>
            <p className="text-lg font-mono font-bold text-emerald-400">${compFetchResult.comp_value.toLocaleString()}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps list */}
      <div className="px-4 py-4 space-y-1.5">
        {steps.map((step, i) => (
          <Step
            key={step.label}
            step={step}
            state={i < activeStep ? 'done' : i === activeStep ? 'active' : 'waiting'}
            delay={i * 0.05}
          />
        ))}
      </div>

      {/* Bottom disclaimer */}
      <div className="px-6 py-3 border-t border-border/20 bg-secondary/20">
        <p className="text-[10px] text-muted-foreground/50 text-center">
          Scanning live market data · injury feeds · social sentiment · legal news · pop reports
        </p>
      </div>
    </motion.div>
  );
}