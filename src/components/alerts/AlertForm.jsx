import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { GRADE_WEIGHTS } from '@/components/valuation/AttributeCategories';
import SearchableSelect from '@/components/valuation/SearchableSelect';

const ALERT_TYPES = [
  { value: 'any_sale',    label: '🔔 Any sale — notify on any match' },
  { value: 'below_price', label: '⬇️ Below price — card sells under my max' },
  { value: 'above_price', label: '⬆️ Above price — card sells over my min' },
  { value: 'in_range',    label: '↔️ In range — price falls within my range' },
];

const ALL_GRADES = Object.keys(GRADE_WEIGHTS);

export default function AlertForm({ onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState({
    player_name: '',
    card_set: '',
    grade: '',
    variation: '',
    alert_type: 'below_price',
    price_min: '',
    price_max: '',
    notes: '',
  });

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price_min: form.price_min ? parseFloat(form.price_min) : null,
      price_max: form.price_max ? parseFloat(form.price_max) : null,
      is_active: true,
      trigger_count: 0,
    });
  };

  const showMin = form.alert_type === 'above_price' || form.alert_type === 'in_range';
  const showMax = form.alert_type === 'below_price' || form.alert_type === 'in_range';

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-primary/20 rounded-2xl p-6 space-y-5">
      <h3 className="text-sm font-bold text-foreground">New Price Alert</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Player Name */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Player Name *
          </Label>
          <Input
            placeholder="e.g. LeBron James"
            value={form.player_name}
            onChange={e => set('player_name', e.target.value)}
            required
            className="bg-secondary/50"
          />
        </div>

        {/* Grade */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Grade <span className="normal-case text-muted-foreground/60">(optional)</span>
          </Label>
          <SearchableSelect
            options={ALL_GRADES}
            value={form.grade}
            onChange={v => set('grade', v)}
            placeholder="Any grade..."
          />
        </div>

        {/* Card Set */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Card Set <span className="normal-case text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. Prizm, National Treasures"
            value={form.card_set}
            onChange={e => set('card_set', e.target.value)}
            className="bg-secondary/50"
          />
        </div>

        {/* Variation */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Variation <span className="normal-case text-muted-foreground/60">(optional)</span>
          </Label>
          <Input
            placeholder="e.g. Silver, Gold /10"
            value={form.variation}
            onChange={e => set('variation', e.target.value)}
            className="bg-secondary/50"
          />
        </div>

        {/* Alert Type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Alert Type *</Label>
          <div className="space-y-1.5">
            {ALERT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('alert_type', t.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                  form.alert_type === t.value
                    ? 'bg-primary/15 border-primary/40 text-foreground font-semibold'
                    : 'bg-secondary/40 border-border/30 text-muted-foreground hover:border-border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Inputs */}
        <div className="space-y-3">
          {showMin && (
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Min Price ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={form.price_min}
                onChange={e => set('price_min', e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          )}
          {showMax && (
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Max Price ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 1500"
                value={form.price_max}
                onChange={e => set('price_max', e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Note <span className="normal-case text-muted-foreground/60">(optional)</span></Label>
            <Input
              placeholder="e.g. watching for dip"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="bg-secondary/50"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading || !form.player_name} className="flex-1">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Alert
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
      </div>
    </form>
  );
}