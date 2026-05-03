import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ScoreGauge({ score, label, size = 'lg' }) {
  const radius = size === 'lg' ? 70 : 32;
  const stroke = size === 'lg' ? 8 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const viewBox = size === 'lg' ? 160 : 76;
  const center = viewBox / 2;

  const getColor = (s) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-primary';
    if (s >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getStrokeColor = (s) => {
    if (s >= 80) return '#34d399';
    if (s >= 60) return 'hsl(43, 96%, 56%)';
    if (s >= 40) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={viewBox} height={viewBox} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(222, 30%, 14%)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getStrokeColor(score)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn("font-bold font-mono", getColor(score), size === 'lg' ? 'text-3xl' : 'text-sm')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          {size === 'lg' && (
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              / 100
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground font-medium text-center">{label}</span>
      )}
    </div>
  );
}