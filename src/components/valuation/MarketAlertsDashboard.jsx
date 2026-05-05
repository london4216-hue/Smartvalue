import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Zap, Flame, AlertCircle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockAlerts = [
  {
    id: 1,
    type: 'price_spike',
    player: 'Luka Doncic',
    card: '2018 Prizm Silver /10',
    change: '+24%',
    price: '$3,200',
    heat: 'hot',
    icon: Flame,
  },
  {
    id: 2,
    type: 'pop_low',
    player: 'Michael Jordan',
    card: '1986 Fleer PSA 10',
    change: 'Pop 2',
    price: '$8,500',
    heat: 'mega',
    icon: Zap,
  },
  {
    id: 3,
    type: 'volume_surge',
    player: 'Jayson Tatum',
    card: '2017 Prizm RC PSA 9',
    change: '12 sales',
    price: '$2,100',
    heat: 'warm',
    icon: TrendingUp,
  },
  {
    id: 4,
    type: 'dip',
    player: 'Kevin Durant',
    card: '2007 SPA Exquisite /25',
    change: '-8%',
    price: '$1,800',
    heat: 'cool',
    icon: TrendingDown,
  },
];

const HeatBadge = ({ heat }) => {
  const config = {
    hot: { bg: 'bg-red-500/20 border-red-500/40 text-red-500', label: '🔥 HOT' },
    mega: { bg: 'bg-red-600/30 border-red-600/50 text-red-600', label: '🚀 MEGA' },
    warm: { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-500', label: '⚡ WARM' },
    cool: { bg: 'bg-blue-500/20 border-blue-500/40 text-blue-500', label: '❄️ COOL' },
  };
  const c = config[heat] || config.cool;
  return (
    <span className={cn('text-xs font-bold px-2 py-1 rounded-full border', c.bg)}>
      {c.label}
    </span>
  );
};

export default function MarketAlertsDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-12 pt-8 border-t border-border/30"
    >
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">📊 Market Heat Right Now</h2>
        <p className="text-sm text-muted-foreground">
          Real-time signals from the trading floor. Watch where the money is moving.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mockAlerts.map((alert, idx) => {
          const Icon = alert.icon;
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className={cn(
                'rounded-xl p-4 border transition-all hover:shadow-lg cursor-pointer',
                alert.heat === 'mega'
                  ? 'bg-red-600/10 border-red-600/30 hover:bg-red-600/15'
                  : alert.heat === 'hot'
                  ? 'bg-red-500/8 border-red-500/20 hover:bg-red-500/12'
                  : alert.heat === 'warm'
                  ? 'bg-amber-500/8 border-amber-500/20 hover:bg-amber-500/12'
                  : 'bg-secondary/40 border-border/30 hover:bg-secondary/60'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2">
                  <Icon className={cn(
                    'w-4 h-4 mt-0.5 flex-shrink-0',
                    alert.heat === 'mega' ? 'text-red-600' :
                    alert.heat === 'hot' ? 'text-red-500' :
                    alert.heat === 'warm' ? 'text-amber-500' :
                    'text-blue-500'
                  )} />
                  <div>
                    <p className="text-sm font-bold text-foreground">{alert.player}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                      {alert.card}
                    </p>
                  </div>
                </div>
                <HeatBadge heat={alert.heat} />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <span className={cn(
                  'text-lg font-mono font-bold',
                  alert.type === 'dip' ? 'text-blue-500' : 'text-emerald-500'
                )}>
                  {alert.change}
                </span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {alert.price}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3"
        >
          <TrendingUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-mono">TODAY'S WINNERS</p>
            <p className="text-sm font-bold text-emerald-500">+47 cards</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3"
        >
          <Zap className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-mono">MARKET MOMENTUM</p>
            <p className="text-sm font-bold text-primary">Bullish +8%</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-mono">HOT ALERTS</p>
            <p className="text-sm font-bold text-amber-500">3 triggered</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}