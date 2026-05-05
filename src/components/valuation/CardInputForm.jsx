import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import CardImageScanner from './CardImageScanner';
import GradeWeightDisplay from './GradeWeightDisplay';
import { GRADE_WEIGHTS } from './AttributeCategories';
import SearchableSelect from './SearchableSelect';

const POPULAR_SETS = [
  // Ultra-Premium
  "National Treasures", "Flawless", "Exquisite", "Immaculate", "Noir",
  "Iridescence", "Obsidian", "One and One",
  // Premium
  "Prizm", "Select", "Optic", "Spectra", "Crown Royale",
  "Revolution", "Court Kings", "Contenders",
  // Mid-tier
  "Mosaic", "Hoops Premium Stock", "Certified", "Absolute",
  // Base / Budget
  "Hoops", "Donruss", "Topps", "Topps Chrome", "Fleer", "Upper Deck",
  "Other"
];

const SET_TIERS = {
  "Ultra-Premium": ["National Treasures", "Flawless", "Exquisite", "Immaculate", "Noir", "Iridescence", "Obsidian", "One and One"],
  "Premium": ["Prizm", "Select", "Optic", "Spectra", "Crown Royale", "Revolution", "Court Kings", "Contenders"],
  "Mid-Tier": ["Mosaic", "Hoops Premium Stock", "Certified", "Absolute"],
  "Base": ["Hoops", "Donruss", "Topps", "Topps Chrome", "Fleer", "Upper Deck"],
};

const ALL_GRADES = Object.keys(GRADE_WEIGHTS);

const TV_SHOWS = [
  "The Last Dance (Netflix)",
  "Winning Time (HBO)",
  "Untold (Netflix)",
  "Shut Up and Dribble (Showtime)",
  "Shaq (HBO)",
  "I Am Athlete (podcast/YouTube)",
  "Pat McAfee Show (ESPN)",
  "The Shop (HBO)",
  "Man in the Arena (ESPN+)",
  "Iverson (30 for 30)",
  "Magic & Bird (HBO)",
  "Other documentary",
  "None",
];

function ToggleChip({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
        selected
          ? 'bg-primary/20 border-primary/50 text-primary'
          : 'bg-secondary/50 border-border/30 text-muted-foreground hover:border-border'
      }`}
    >
      {label}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-mono uppercase tracking-wider text-primary/60 border-b border-border/20 pb-1 mb-3">
      {children}
    </p>
  );
}

export default function CardInputForm({ onSubmit, isLoading }) {
  const [form, setForm] = useState({
    player_name: '',
    card_year: '',
    card_set: '',
    card_number: '',
    variation: '',
    serial_number: '',
    grade: '',
    comp_value: '',
    cheapest_available: '',
    image_url: '',
    // New signals
    is_rookie_year: false,
    color_matches_team: false,
    has_tv_show: false,
    tv_show_name: '',
    player_popularity: '',   // "rising" | "peak" | "legend" | "declining"
    has_sneaker_deal: false,
    sneaker_brand: '',
    recent_viral_moment: false,
    viral_description: '',
    has_autograph: false,
    is_sticker_auto: false,
    ai_scan_quality: '',      // "flawless" | "excellent" | "good" | "fair" | "poor"
    psa_alignment: false,     // Whether AI scan indicates PSA 10 potential
  });
  const [showScanner, setShowScanner] = useState(true);
  const [showSignals, setShowSignals] = useState(true);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleScanned = (extracted) => {
    setForm(prev => ({
      ...prev,
      player_name:   extracted.player_name   || prev.player_name,
      card_year:     extracted.card_year     || prev.card_year,
      card_set:      extracted.card_set      || prev.card_set,
      card_number:   extracted.card_number   || prev.card_number,
      variation:     extracted.variation     || prev.variation,
      serial_number: extracted.serial_number || prev.serial_number || '',
      grade:         extracted.grade         || prev.grade,
      comp_value:    extracted.comp_value    ? String(extracted.comp_value)    : prev.comp_value,
      cheapest_available: extracted.cheapest_available ? String(extracted.cheapest_available) : prev.cheapest_available,
      image_url:     extracted.image_url     || prev.image_url,
      scan_notes:    extracted.scan_notes    || '',
      is_rookie_year:    extracted.is_rookie_year    ?? prev.is_rookie_year,
      color_matches_team: extracted.color_matches_team ?? prev.color_matches_team,
      has_autograph:     extracted.has_autograph     ?? prev.has_autograph,
      player_popularity: extracted.player_popularity || prev.player_popularity,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      comp_value: form.comp_value ? parseFloat(form.comp_value) : null,
      cheapest_available: form.cheapest_available ? parseFloat(form.cheapest_available) : null,
    });
  };

  // Determine set tier for badge
  const setTier = Object.entries(SET_TIERS).find(([, sets]) => sets.includes(form.card_set))?.[0] || null;
  const tierColors = {
    "Ultra-Premium": "text-violet-400 border-violet-400/30 bg-violet-400/10",
    "Premium":       "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    "Mid-Tier":      "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    "Base":          "text-muted-foreground border-border/30 bg-secondary/50",
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
        {showScanner && <CardImageScanner onExtracted={handleScanned} />}
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
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Set
            {setTier && (
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] border ${tierColors[setTier]}`}>
                {setTier}
              </span>
            )}
          </Label>
          <SearchableSelect
            options={POPULAR_SETS}
            value={form.card_set}
            onChange={(v) => handleChange('card_set', v)}
            placeholder="Search set..."
          />
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

        <div className="space-y-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Serial / Print Run <span className="text-primary/60 normal-case">— e.g. 75 for /75</span>
          </Label>
          <Input
            placeholder="e.g. 75, 10, 25, 1"
            value={form.serial_number}
            onChange={(e) => handleChange('serial_number', e.target.value)}
            className="bg-secondary/50 border-border/50 rounded-xl"
          />
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Grade</Label>
          <SearchableSelect
            options={ALL_GRADES}
            value={form.grade}
            onChange={(v) => handleChange('grade', v)}
            placeholder="Search grade..."
          />
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-1">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Last Sold Price ($)
          </Label>
          <Input
            type="number"
            placeholder="150.00"
            value={form.comp_value}
            onChange={(e) => handleChange('comp_value', e.target.value)}
            className="bg-secondary/50 border-border/50 rounded-xl"
          />
        </div>

        <div className="space-y-2 col-span-2 sm:col-span-2">
          <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Cheapest Available Now ($) <span className="text-primary/70 normal-case">— lowest current ask online</span>
          </Label>
          <Input
            type="number"
            placeholder="e.g. 120.00 (eBay BIN / COMC / 130pt)"
            value={form.cheapest_available}
            onChange={(e) => handleChange('cheapest_available', e.target.value)}
            className="bg-secondary/50 border-border/50 rounded-xl"
          />
        </div>
      </div>

      {/* Grade Weight Panel */}
      {form.grade && <GradeWeightDisplay grade={form.grade} />}

      <div className="border-t border-border/30" />

      {/* ── DEEP SIGNALS ─────────────────────────────────────── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowSignals(s => !s)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="font-mono uppercase tracking-wider">
            Deep Signals <span className="text-primary/60">(boosts AI accuracy significantly)</span>
          </span>
          {showSignals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showSignals && (
          <div className="space-y-5 bg-secondary/20 border border-border/20 rounded-xl p-4">

            {/* Rookie Year */}
            <div>
              <SectionLabel>🏆 Rookie Year & Card Identity</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  label="✅ This IS a Rookie Year card"
                  selected={form.is_rookie_year}
                  onClick={() => handleChange('is_rookie_year', !form.is_rookie_year)}
                />
                <ToggleChip
                  label="🎨 Parallel color matches team colors"
                  selected={form.color_matches_team}
                  onClick={() => handleChange('color_matches_team', !form.color_matches_team)}
                />
              </div>
            </div>

            {/* Player Popularity */}
            <div>
              <SectionLabel>📈 Player Popularity Status</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'rising',    label: '🚀 Rising Star' },
                  { value: 'peak',      label: '🔥 Peak Popularity' },
                  { value: 'legend',    label: '🐐 All-Time Legend' },
                  { value: 'declining', label: '📉 Declining / Retiring' },
                ].map(opt => (
                  <ToggleChip
                    key={opt.value}
                    label={opt.label}
                    selected={form.player_popularity === opt.value}
                    onClick={() => handleChange('player_popularity', form.player_popularity === opt.value ? '' : opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* TV Shows & Media */}
            <div>
              <SectionLabel>📺 TV Show / Documentary / Media Feature</SectionLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    label="📺 Featured in a TV show / doc"
                    selected={form.has_tv_show}
                    onClick={() => handleChange('has_tv_show', !form.has_tv_show)}
                  />
                </div>
                {form.has_tv_show && (
                  <SearchableSelect
                    options={TV_SHOWS}
                    value={form.tv_show_name}
                    onChange={(v) => handleChange('tv_show_name', v)}
                    placeholder="Which show / doc?"
                  />
                )}
              </div>
            </div>

            {/* Sneaker Deal */}
            <div>
              <SectionLabel>👟 Sneaker Deal & Brand Power</SectionLabel>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <ToggleChip
                    label="👟 Has active sneaker deal"
                    selected={form.has_sneaker_deal}
                    onClick={() => handleChange('has_sneaker_deal', !form.has_sneaker_deal)}
                  />
                </div>
                {form.has_sneaker_deal && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['Nike / Jordan Brand', 'Adidas', 'Under Armour', 'Puma', 'New Balance', 'Reebok', 'Li-Ning', 'Anta', 'Other'].map(brand => (
                      <ToggleChip
                        key={brand}
                        label={brand}
                        selected={form.sneaker_brand === brand}
                        onClick={() => handleChange('sneaker_brand', form.sneaker_brand === brand ? '' : brand)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Autograph */}
            <div>
              <SectionLabel>✍️ Autograph Details</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  label="✍️ Card has autograph"
                  selected={form.has_autograph}
                  onClick={() => handleChange('has_autograph', !form.has_autograph)}
                />
                {form.has_autograph && (
                  <ToggleChip
                    label="🏷️ Sticker auto (not on-card)"
                    selected={form.is_sticker_auto}
                    onClick={() => handleChange('is_sticker_auto', !form.is_sticker_auto)}
                  />
                )}
              </div>
            </div>

            {/* Viral Moment */}
             <div>
               <SectionLabel>🔥 Recent Viral Moment</SectionLabel>
               <div className="space-y-2">
                 <div className="flex flex-wrap gap-2">
                   <ToggleChip
                     label="🔥 Player had a recent viral moment"
                     selected={form.recent_viral_moment}
                     onClick={() => handleChange('recent_viral_moment', !form.recent_viral_moment)}
                   />
                 </div>
                 {form.recent_viral_moment && (
                   <Input
                     placeholder="Describe it (e.g. 50-pt game, record-breaking play, meme, interview clip...)"
                     value={form.viral_description}
                     onChange={(e) => handleChange('viral_description', e.target.value)}
                     className="bg-secondary/50 border-border/50 rounded-xl text-sm"
                   />
                 )}
               </div>
             </div>

            {/* AI Scan Quality & PSA Alignment */}
            <div>
              <SectionLabel>🤖 AI Scanner Detection — PSA Grading Alignment</SectionLabel>
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground/70">
                  How does the AI scan compare to PSA grading standards? This is a MASSIVE value driver.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'flawless', label: '💎 Flawless — PSA 10 potential' },
                    { value: 'excellent', label: '⭐ Excellent — PSA 9-9.5 potential' },
                    { value: 'good', label: '✓ Good — PSA 8-8.5 potential' },
                    { value: 'fair', label: '~ Fair — PSA 7-7.5 potential' },
                    { value: 'poor', label: '⚠️ Poor — Below PSA 7' },
                  ].map(opt => (
                    <ToggleChip
                      key={opt.value}
                      label={opt.label}
                      selected={form.ai_scan_quality === opt.value}
                      onClick={() => handleChange('ai_scan_quality', form.ai_scan_quality === opt.value ? '' : opt.value)}
                    />
                  ))}
                </div>
                {form.ai_scan_quality && (
                  <ToggleChip
                    label="✓ AI confirms PSA 10 grading potential (rare)"
                    selected={form.psa_alignment}
                    onClick={() => handleChange('psa_alignment', !form.psa_alignment)}
                  />
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || !form.player_name}
        className="w-full h-14 rounded-xl text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Analyzing Signals...
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