import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import AlertForm from '@/components/alerts/AlertForm';
import AlertCard from '@/components/alerts/AlertCard';

export default function Alerts() {
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.CardAlert.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CardAlert.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast({ title: 'Alert deleted' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.CardAlert.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CardAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setShowForm(false);
      toast({ title: 'Alert created', description: "You'll be notified when a match is found during valuation." });
    },
  });

  const activeAlerts = alerts.filter(a => a.is_active);
  const inactiveAlerts = alerts.filter(a => !a.is_active);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Bell className="w-7 h-7 text-primary" />
              Price Alerts
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Set price & grade criteria. When you run a valuation that matches, you'll get an instant notification.
            </p>
          </div>
          <Button onClick={() => setShowForm(s => !s)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            New Alert
          </Button>
        </div>
      </motion.div>

      {/* Stats Bar */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Alerts', value: alerts.length, color: 'text-foreground' },
            { label: 'Active', value: activeAlerts.length, color: 'text-emerald-500' },
            { label: 'Triggered', value: alerts.reduce((s, a) => s + (a.trigger_count || 0), 0), color: 'text-primary' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border/50 rounded-xl p-4 text-center">
              <p className={cn('text-2xl font-bold font-mono', stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* New Alert Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <AlertForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowForm(false)}
              isLoading={createMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!isLoading && alerts.length === 0 && !showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-card border border-border/50 rounded-2xl p-12 text-center"
        >
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No alerts yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Create an alert and get notified instantly when a valuation matches your price and grade criteria.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Create Your First Alert
          </Button>
        </motion.div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3 mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Active Alerts</p>
          <AnimatePresence>
            {activeAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDelete={() => deleteMutation.mutate(alert.id)}
                onToggle={() => toggleMutation.mutate({ id: alert.id, is_active: false })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Inactive Alerts */}
      {inactiveAlerts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Paused Alerts</p>
          <AnimatePresence>
            {inactiveAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDelete={() => deleteMutation.mutate(alert.id)}
                onToggle={() => toggleMutation.mutate({ id: alert.id, is_active: true })}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 bg-primary/5 border border-primary/20 rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">How alerts work</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every time you run a card valuation, the system checks your active alerts. If the player name, grade, set, and price match your criteria, you'll see an instant toast notification on-screen. Alerts track how many times they've been triggered and when they last fired.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}