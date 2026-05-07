import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Search, TrendingUp, Zap, Activity, AlertTriangle, Trophy, Twitter, Scale, Heart, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASE_1_STEPS = [
  { icon: Search, label: 'Scanning eBay completed listings...', sub: 'Last 90 days · hammer prices only' },
  { icon: TrendingUp, label: 'Checking 130point & CardLadder...', sub: 'Cross-referencing sale history' },
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

function Step({ step, state }) {
  const Icon = step.icon;
  return (
    <div
      style={{ willChange: 'opacity' }}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300',
        state === 'done' && 'bg-emerald-500/8 border-emerald-500/25',
        state === 'active' && 'bg-primary/8 border-primary/30',
        state === 'waiting' && 'bg-secondary/20 border-border/20 opacity-35',
      )}
    >
      <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center">
        {state === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        {state === 'active' && <Icon className="w-4 h-4 text-primary step-active-icon" />}
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
          {state === 'active' && <span className="step-dots ml-1" />}
        </p>
        {state !== 'waiting' && (
          <p className={cn('text-[10px] mt-0.5', state === 'done' ? 'text-emerald-400/60' : 'text-muted-foreground/60')}>
            {step.sub}
          </p>
        )}
      </div>
      {state === 'done' && (
        <span className="text-[10px] font-mono text-emerald-400/70 shrink-0">✓</span>
      )}
    </div>
  );
}

export default function ValuationLoadingScreen({ loadingPhase, cardData }) {
  const [activeStep, setActiveStep] = useState(0);

  const steps = loadingPhase === 'fetching_comp' ? PHASE_1_STEPS : PHASE_2_STEPS;

  // Memoize card header so it never re-renders during step ticks
  const cardHeader = useMemo(() => {
    if (!cardData?.player_name) return null;
    return (
      <div className="px-6 py-4 border-b border-border/30 bg-secondary/40">
        <p className="text-base font-bold text-foreground">{cardData.player_name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {[cardData.card_year, cardData.card_set, cardData.variation, cardData.serial_number ? `/${cardData.serial_number}` : null, cardData.grade].filter(Boolean).join(' · ')}
        </p>
      </div>
    );
  }, [cardData?.player_name]);

  useEffect(() => {
    setActiveStep(0);
    const interval = setInterval(() => {
      setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    }, 180);
    return () => clearInterval(interval);
  }, [loadingPhase, steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-card border border-border/50 rounded-2xl overflow-hidden"
    >
      {/* Card identity banner — memoized, never re-renders */}
      {cardHeader}

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


      {/* Steps list — all rows rendered immediately, state flips individually */}
      <div className="px-4 py-4 space-y-1.5">
        {steps.map((step, i) => (
          <Step
            key={step.label}
            step={step}
            state={i < activeStep ? 'done' : i === activeStep ? 'active' : 'waiting'}
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