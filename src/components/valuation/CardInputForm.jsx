import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import CardImageScanner from './CardImageScanner';
import GradeWeightDisplay from './GradeWeightDisplay';
import { GRADE_WEIGHTS } from './AttributeCategories';

const POPULAR_SETS = [
  "Prizm", "Optic", "National Treasures", "Select", "Mosaic",
  "Fleer", "Topps Chrome", "Hoops", "Court Kings", "Immaculate",
  "Contenders", "Revolution", "Spectra", "Crown Royale", "Other"
];

const ALL_GRADES = Object.keys(GRADE_WEIGHTS);

export default function CardInputForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    player_name: '',
    card_year: '',
    card_set: '',
    card_number: '',
    variation: '',
    grade: '',
    comp_value: '',
    image_url: '',
  });
  const [showScanner, setShowScanner] = useState(true);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleScanned = (extracted) => {
    setForm(prev => ({
      ...prev,
      player_name: extracted.player_name || prev.player_name,
      card_year:   extracted.card_year   || prev.card_year,
      card_set:    extracted.card_set    || prev.card_set,
      card_number: extracted.card_number || prev.card_number,
      variation:   extracted.variation   || prev.variation,
      grade:       extracted.grade       || prev.grade,
      image_url:   extracted.image_url   || prev.image_url,
      scan_notes:  extracted.scan_notes  || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      comp_value: form.comp_value ? parseFloat(form.comp_value) : null,
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* AI Card Scanner Toggle */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowScanner(s => !s)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="font-mono uppercase tracking-wider">AI Card Scanner (optional)</span>
          {showScanner ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showScanner && (
          <CardImageScanner onExtracted={handleScanned} />
        )}
      </div>

      <div className="border-t border-border/30" />

      {/* Player Name */}
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Player Name *
        </Label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="e.g. Luka Doncic, Anthony Edwards..."
            value={form.player_name}
            onChange={(e) => handleChange('player_name', e.target.value)}
            className="pl-12 h-14 text-lg bg-secondary/50 border-border/50 focus:border-primary/50 rounded-xl"
            required
          />
        </div>
      </div>

      {/* Card Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Year</Label>
          <Input
            placeholder="2020"
            value={form.card_year}
            onChange={(e) => handleChange('card_year', e.target.value)}
            className="bg-secondary/50 border-border/50 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Set</Label>
          <Select value={form.card_set} onValueChange={(v) => handleChange('card_set', v)}>
            <SelectTrigger className="bg-secondary/50 border-border/50 rounded-xl">
              <SelectValue placeholder="Select set" />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_SETS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Card #</Label>
          <Input
            placeholder="#1"
            value={form.card_number}
            onChange={(e) => handleChange('card_number', e.target.value)}
            className="bg-secondary/50 border-border/50 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Variation</Label>
          <Input
            placeholder="Silver, Gold, Base..."
            value={form.variation}
            onChange={(e) => handleChange('variation', e.target.value)}
            className="bg-secondary/50 border-border/50 rounded-xl"
          />
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Grade</Label>
          <Select value={form.grade} onValueChange={(v) => handleChange('grade', v)}>
            <SelectTrigger className="bg-secondary/50 border-border/50 rounded-xl">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {ALL_GRADES.map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-3">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Last Comp Sale ($) — used as 50% baseline
          </Label>
          <Input
            type="number"
            placeholder="150.00"
            value={form.comp_value}
            onChange={(e) => handleChange('comp_value', e.target.value)}
            className="bg-secondary/50 border-border/50 rounded-xl"
          />
        </div>
      </div>

      {/* Grade Weight Panel */}
      {form.grade && <GradeWeightDisplay grade={form.grade} />}

      <Button
        type="submit"
        disabled={isLoading || !form.player_name}
        className="w-full h-14 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Analyzing 50 Attributes...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Run AI Valuation
          </>
        )}
      </Button>
    </motion.form>
  );
}