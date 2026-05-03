import { cn } from '@/lib/utils';
import ScoreGauge from '@/components/valuation/ScoreGauge';

// ── All 44 factors for this specific card (BGS 8.5 1986 Fleer Jordan #57) ────
// score: 0–10 for the factor, weight: importance multiplier
// pct_impact = (score / 10) * weight * category_scale — nets out to a % adj on comp × grade
const ALL_FACTORS = [
  // Card DNA
  { label: "Rookie Card Status",            score: 10, weight: 5  },
  { label: "Card Brand Tier (Fleer)",       score: 7,  weight: 4  },
  { label: "Set Prestige (1986 Fleer)",     score: 10, weight: 3  },
  { label: "Variation Desirability",        score: 5,  weight: 3  },
  { label: "Card Number (#57)",             score: 6,  weight: 3  },
  { label: "Jersey Number Match",           score: 1,  weight: 5  },
  // Serial & Print Run
  { label: "Is Serialized",                score: 0,  weight: 5  },
  { label: "Print Run Size",               score: 0,  weight: 5  },
  { label: "Bookend Serial #",             score: 0,  weight: 4  },
  { label: "Low Serial Number",            score: 0,  weight: 4  },
  { label: "Is 1-of-1",                    score: 0,  weight: 5  },
  // Autograph Signal
  { label: "Has Autograph",               score: 0,  weight: 5  },
  { label: "Auto Type (On-Card vs Sticker)", score: 0, weight: 5 },
  { label: "Auto Quality",                score: 0,  weight: 3  },
  { label: "Auto Grade",                  score: 0,  weight: 3  },
  { label: "Inscriptions",               score: 0,  weight: 2  },
  { label: "Multi-Player Auto",           score: 0,  weight: 3  },
  // Patch & Memorabilia
  { label: "Has Patch / Memorabilia",     score: 0,  weight: 4  },
  { label: "Patch Quality",              score: 0,  weight: 5  },
  { label: "Patch Matches Jersey",       score: 0,  weight: 3  },
  { label: "RPA Designation",            score: 0,  weight: 5  },
  // Scarcity & Population
  { label: "Total Pop Report",           score: 3,  weight: 4  },
  { label: "Pop at BGS 8.5 (3,299)",     score: 2,  weight: 5  },
  { label: "Population Decay Trend",     score: 3,  weight: 3  },
  { label: "Gem Rate % (< 0.3%)",        score: 9,  weight: 3  },
  { label: "Crossover Upgrade Potential", score: 6, weight: 2  },
  // Market Momentum
  { label: "30-Day Price Trend",         score: 8,  weight: 4  },
  { label: "90-Day Price Trend",         score: 7,  weight: 3  },
  { label: "Auction Velocity",           score: 8,  weight: 3  },
  { label: "Liquidity Score",            score: 9,  weight: 3  },
  { label: "Buy / Sell Pressure",        score: 8,  weight: 3  },
  { label: "Market Heat Score",          score: 9,  weight: 4  },
  // Player Thesis
  { label: "GOAT / Legacy Score",        score: 10, weight: 5  },
  { label: "Hall of Fame (2009)",        score: 10, weight: 4  },
  { label: "Career Trajectory",         score: 8,  weight: 4  },
  { label: "Championships (6)",         score: 10, weight: 3  },
  { label: "MVP / Award Trajectory",    score: 10, weight: 4  },
  { label: "Cultural Icon Status",      score: 10, weight: 3  },
  { label: "International Appeal",      score: 9,  weight: 2  },
  { label: "Injury Risk",               score: 10, weight: 3  },
  { label: "Team Market Size (Chicago)", score: 8, weight: 2  },
  { label: "Historical Appreciation",   score: 10, weight: 4  },
  { label: "eBay Sales Spike (30d)",    score: 9,  weight: 4  },
  { label: "Downside Protection",       score: 9,  weight: 3  },
];

const FLIPPERS_COMP = 10500;  // Last sold (current comp)
const HOLDERS_COMP  = 9850;   // 90-day avg baseline
const GRADE         = 0.65;
const BASE          = FLIPPERS_COMP * GRADE; // 6825

// Compute raw impact per factor: (score/10 - 0.5) * weight * scale_factor
// Factors above 5 = positive contribution, below 5 = negative, 0 = neutral drag
const SCALE = 0.008; // calibrated so all factors together net ~37% total

function computeFactors() {
  return ALL_FACTORS.map(f => ({
    ...f,
    impact: (f.score / 10 - 0.5) * f.weight * SCALE,
  })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export default function DemoScoreCard() {
  const sorted  = computeFactors();
  const top5    = sorted.slice(0, 5);
  const rest    = sorted.slice(5);

  const top5Adj    = top5.reduce((s, f) => s + f.impact, 0);
  const rollupAdj  = rest.reduce((s, f) => s + f.impact, 0);
  const totalAdj   = top5Adj + rollupAdj;
  const aiValue    = Math.round(BASE * (1 + totalAdj));
  const vsFlippersPct = ((aiValue - FLIPPERS_COMP) / FLIPPERS_COMP * 100).toFixed(1);
  const vsHoldersPct  = ((aiValue - HOLDERS_COMP) / HOLDERS_COMP * 100).toFixed(1);

  const fmt = (v) => (v >= 0 ? `+${(v * 100).toFixed(1)}%` : `${(v * 100).toFixed(1)}%`);

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-5">

      {/* Card image + headline */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <img
            src="https://d1htnxwo4o0jhw.cloudfront.net/cert/134044389/iiXp9pAT6EGgwPCfGBf1yA.jpg"
            alt="1986 Fleer Michael Jordan #57 BGS 8.5"
            className="w-24 h-32 object-cover rounded-lg border border-border/40 shadow-lg"
            onError={(e) => {
              e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Michael_Jordan_in_2014.jpg/220px-Michael_Jordan_in_2014.jpg';
            }}
          />
          <span className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">BGS 8.5</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">AI Investment Value</p>
          <p className="text-3xl font-mono font-bold text-primary">${aiValue.toLocaleString()}</p>
          <div className="mt-1 text-[11px]">
            vs holders{' '}
            <span className={cn("font-semibold", parseFloat(vsHoldersPct) >= 0 ? "text-emerald-400" : "text-red-400")}>
              {parseFloat(vsHoldersPct) >= 0 ? '+' : ''}{vsHoldersPct}%
            </span>
          </div>
          <div className="mt-2">
            <ScoreGauge score={91} label="Score" size="sm" />
          </div>
        </div>
      </div>

      {/* Formula breakdown */}
      <div className="border-t border-border/30 pt-4 space-y-1.5">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">AI Value Formula</p>

        {/* Step 1: comps */}
        <div className="space-y-1 mb-2">
          <div className="flex justify-between text-xs items-center">
            <span className="text-muted-foreground">Flippers Comp (last sold)</span>
            <span className="font-mono font-semibold text-foreground">${FLIPPERS_COMP.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs items-center">
            <span className="text-muted-foreground">Holders Comp (90-day avg)</span>
            <span className="font-mono font-semibold text-muted-foreground/70">${HOLDERS_COMP.toLocaleString()}</span>
          </div>
        </div>

        {/* Step 2: grade */}
        <div className="flex justify-between text-xs items-center">
          <span className="text-muted-foreground">× Grade multiplier ({GRADE})</span>
          <span className="font-mono font-semibold text-foreground">${BASE.toLocaleString()}</span>
        </div>

        {/* Step 3: top 5 drivers */}
        <div className="pt-1 pb-0.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/60 mb-1">Top 5 Value Drivers</p>
          {top5.map(d => (
            <div key={d.label} className="flex justify-between text-[11px] items-center pl-2 border-l-2 border-emerald-400/40 mb-1">
              <span className="text-muted-foreground truncate pr-2">{d.label}</span>
              <span className={cn("font-mono font-semibold shrink-0", d.impact >= 0 ? "text-emerald-400" : "text-red-400")}>
                {fmt(d.impact)}
              </span>
            </div>
          ))}
        </div>

        {/* Step 4: rollup */}
        <div className="flex justify-between text-[11px] items-center pl-2 border-l-2 border-muted-foreground/20">
          <span className="text-muted-foreground">{rest.length} supporting factors</span>
          <span className={cn("font-mono font-semibold", rollupAdj >= 0 ? "text-muted-foreground" : "text-red-400/70")}>
            {fmt(rollupAdj)}
          </span>
        </div>

        <div className="h-px bg-border/40 my-1" />

        {/* Total adjustment */}
        <div className="flex justify-between text-xs items-center">
          <span className="text-muted-foreground">Total adjustment</span>
          <span className={cn("font-mono font-semibold", totalAdj >= 0 ? "text-emerald-400" : "text-red-400")}>
            {fmt(totalAdj)}
          </span>
        </div>

        {/* Final = */}
        <div className="flex justify-between text-xs items-center bg-primary/5 border border-primary/15 rounded-lg px-2 py-1.5">
          <span className="font-semibold text-foreground">= AI Investment Value</span>
          <span className="font-mono font-bold text-primary">${aiValue.toLocaleString()}</span>
        </div>

        <div className="h-px bg-border/40 my-1" />
        {[
          { label: "Spread (flip ↔ hold)", value: `$${(FLIPPERS_COMP - HOLDERS_COMP).toLocaleString()}`, cls: "text-muted-foreground" },
          { label: "Market Heat",  value: "91/100",     cls: "text-emerald-400" },
          { label: "Signal",       value: "STRONG BUY", cls: "text-emerald-400 font-bold" },
        ].map(row => (
          <div key={row.label} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={cn("font-mono font-semibold", row.cls)}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Key signals */}
      <div className="border-t border-border/30 pt-4 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Key Signals</p>
        {[
          { label: "Pop 3,299 at BGS 8.5",          color: "text-amber-400" },
          { label: "True Rookie Card (1986 Fleer)",  color: "text-emerald-400" },
          { label: "Jordan Brand: $6.6B/yr",         color: "text-emerald-400" },
          { label: "GOAT score: 99/100",             color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 bg-current", s.color)} />
            <span className={cn(s.color)}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}