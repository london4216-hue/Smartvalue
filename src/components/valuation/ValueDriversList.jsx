import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ValueDriversList({ drivers = [], compValue }) {
  if (!drivers.length) return null;

  const top5 = drivers.slice(0, 5);

  return (
    <div className="space-y-2">
      {top5.map((d, i) => {
        const pct = d.percent_adjustment || '';
        const dollar = d.dollar_adjustment || '';
        const isUp = pct.startsWith('+') || (dollar && !dollar.startsWith('-'));
        const isDown = pct.startsWith('-') || (dollar && dollar.startsWith('-'));

        return (
          <div
            key={i}
            className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-secondary/40 border border-border/40"
          >
            <div className="flex items-center gap-2 min-w-0">
              {isUp ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : isDown ? (
                <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
              ) : (
                <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="text-sm text-foreground truncate">{d.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {dollar && (
                <span className={cn(
                  'text-sm font-mono font-bold',
                  isUp ? 'text-emerald-500' : isDown ? 'text-red-400' : 'text-muted-foreground'
                )}>
                  {dollar.startsWith('-') || dollar.startsWith('+') ? dollar : (isUp ? '+' : '') + dollar}
                </span>
              )}
              {pct && (
                <span className={cn(
                  'text-[10px] font-mono px-1.5 py-0.5 rounded border',
                  isUp ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' :
                  isDown ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                  'text-muted-foreground bg-secondary border-border'
                )}>
                  {pct}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}