import { motion } from 'framer-motion';
import { Trash2, Bell, BellOff, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const ALERT_TYPE_LABELS = {
  any_sale:    '🔔 Any Sale',
  below_price: '⬇️ Below',
  above_price: '⬆️ Above',
  in_range:    '↔️ In Range',
};

function formatPrice(n) {
  if (!n) return null;
  return `$${Number(n).toLocaleString()}`;
}

function getPriceDisplay(alert) {
  if (alert.alert_type === 'any_sale') return 'Any price';
  if (alert.alert_type === 'below_price') return `Under ${formatPrice(alert.price_max)}`;
  if (alert.alert_type === 'above_price') return `Over ${formatPrice(alert.price_min)}`;
  if (alert.alert_type === 'in_range') return `${formatPrice(alert.price_min)} – ${formatPrice(alert.price_max)}`;
  return '—';
}

export default function AlertCard({ alert, onDelete, onToggle }) {
  const isActive = alert.is_active;
  const lastTriggered = alert.last_triggered_at
    ? new Date(alert.last_triggered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'bg-card border rounded-xl p-4 flex items-start gap-4 transition-all',
        isActive ? 'border-border/50' : 'border-border/20 opacity-60'
      )}
    >
      {/* Status Icon */}
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
        isActive ? 'bg-primary/10' : 'bg-muted'
      )}>
        {isActive
          ? <Bell className="w-4 h-4 text-primary" />
          : <BellOff className="w-4 h-4 text-muted-foreground" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-foreground truncate">{alert.player_name}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {alert.grade && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {alert.grade}
                </span>
              )}
              {alert.card_set && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/30">
                  {alert.card_set}
                </span>
              )}
              {alert.variation && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/30">
                  {alert.variation}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={isActive ? 'Pause alert' : 'Enable alert'}
            >
              {isActive ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title="Delete alert"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Price + Type row */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground">{ALERT_TYPE_LABELS[alert.alert_type]}</span>
          <span className="text-xs font-mono font-semibold text-foreground">{getPriceDisplay(alert)}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/20">
          {alert.trigger_count > 0 ? (
            <div className="flex items-center gap-1 text-[10px] text-emerald-500">
              <Zap className="w-3 h-3" />
              Triggered {alert.trigger_count}× {lastTriggered && `· Last: ${lastTriggered}`}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
              <Clock className="w-3 h-3" />
              Never triggered
            </div>
          )}
          {alert.notes && (
            <span className="text-[10px] text-muted-foreground/60 truncate">· {alert.notes}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}