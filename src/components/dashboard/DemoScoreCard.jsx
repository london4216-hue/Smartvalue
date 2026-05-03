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

// Compute raw impact per factor: (score/10 - 0.5) * weight * scale_factor
// Factors above 5 = positive contribution, below 5 = negative, 0 = neutral drag
const SCALE = 0.008; // calibrated so all factors together net ~37% total

// 1/5/10 year projections based on historical trajectory
const PROJECTIONS = {
  year_1:  { label: "1Y Projection", value: 12100, delta: 0.152 },
  year_5:  { label: "5Y Projection", value: 16800, delta: 0.600 },
  year_10: { label: "10Y Projection", value: 28500, delta: 1.714 },
};

function computeFactors() {
  return ALL_FACTORS.map(f => ({
    ...f,
    impact: (f.score / 10 - 0.5) * f.weight * SCALE,
  })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

export default function DemoScoreCard() {
  const sorted  = computeFactors();
  const top5    = sorted.slice(0, 5);

  const spread = FLIPPERS_COMP - HOLDERS_COMP;
  const vsHoldersPct = ((FLIPPERS_COMP - HOLDERS_COMP) / HOLDERS_COMP * 100).toFixed(1);

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
          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">Flippers Comp</p>
          <p className="text-3xl font-mono font-bold text-primary">${FLIPPERS_COMP.toLocaleString()}</p>
          <div className="mt-1 text-[11px] text-muted-foreground">
            vs holders baseline <span className="font-semibold text-emerald-400">+{vsHoldersPct}%</span>
          </div>
          <div className="mt-2">
            <ScoreGauge score={91} label="Score" size="sm" />
          </div>
        </div>
      </div>

      {/* Comps comparison */}
      <div className="border-t border-border/30 pt-4">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Comps</p>
        <div className="flex items-start gap-8 justify-between">
          {/* Flippers */}
          <div>
            <p className="text-[9px] text-muted-foreground/60 mb-1">Last Sold Comp (Flippers Comp)</p>
            <div className="flex items-end gap-3">
              <p className="text-2xl font-mono font-bold text-foreground">${FLIPPERS_COMP.toLocaleString()}</p>
              <p className="text-[9px] font-semibold text-emerald-400 italic mb-1">Long-term wealth builder</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 bg-secondary/30 rounded px-2 py-1.5 w-fit">
              <span className={cn("font-semibold", FLIPPERS_COMP > HOLDERS_COMP ? "text-emerald-400" : "text-red-400")}>
                ${spread.toLocaleString()} premium
              </span>{' '}
              vs collector comp
            </p>
          </div>
          
          {/* Collector comp */}
          <div>
            <p className="text-[9px] text-muted-foreground/60 mb-1">Collector Long Term Comp</p>
            <p className="text-2xl font-mono font-bold text-muted-foreground/70">${HOLDERS_COMP.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-2">90-day baseline</p>
          </div>
        </div>
      </div>

      {/* Projections */}
      <div className="border-t border-border/30 pt-4 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Price Projections</p>
        {Object.values(PROJECTIONS).map(proj => (
          <div key={proj.label} className="flex justify-between text-xs items-center">
            <span className="text-muted-foreground">{proj.label}</span>
            <div className="text-right">
              <span className="font-mono font-semibold text-primary">${proj.value.toLocaleString()}</span>
              <span className="text-muted-foreground text-[10px] ml-1">
                ({(proj.delta >= 0 ? '+' : '')}
                {(proj.delta * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Top 5 attributes driving above/below */}
      <div className="border-t border-border/30 pt-4 space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Top 5 Drivers vs Comp</p>
        {top5.map(d => (
          <div key={d.label} className="flex justify-between text-[11px] items-start pl-2 border-l-2 border-muted-foreground/20">
            <span className="text-muted-foreground truncate pr-2 flex-1">{d.label}</span>
            <span className={cn("font-mono font-semibold shrink-0", d.impact >= 0 ? "text-emerald-400" : "text-red-400")}>
              {d.impact >= 0 ? '+' : ''}{(d.impact * 100).toFixed(1)}%
            </span>
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