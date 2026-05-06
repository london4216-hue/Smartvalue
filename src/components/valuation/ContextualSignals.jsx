import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TREND_CONFIG = {
  up:      { icon: TrendingUp,   color: "text-emerald-400" },
  down:    { icon: TrendingDown, color: "text-red-400" },
  neutral: { icon: Minus,        color: "text-muted-foreground" },
};

function SectionCard({ section, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-secondary/30 border border-border/40 rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
        <span className="text-base">{section.emoji}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">{section.label}</span>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">
          {section.as_of ? `as of ${section.as_of}` : ''}
        </span>
      </div>

      <div className="px-4 pb-4 pt-3 space-y-3">
        {section.items.map((item, i) => {
          const T = TREND_CONFIG[item.trend] || TREND_CONFIG.neutral;
          const TIcon = T.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07 + i * 0.04 }}
              className="flex items-start gap-3"
            >
              <TIcon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", T.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold text-foreground">{item.stat}</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{item.note}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function ContextualSignals({ playerName, cardYear, cardSet }) {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerName) { setLoading(false); return; }

    const fetch = async () => {
      try {
        const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Today is ${today}. You are a sports card market analyst. Return REAL, CURRENT, VERIFIED data about this player's card market.

Player: ${playerName}
Card Year: ${cardYear || 'unknown'}
Card Set: ${cardSet || 'unknown'}

Return 2-3 sections of market signals. Each section must have real data with specific numbers and dates.
IMPORTANT: Only include data you are confident is accurate. If unsure about a specific stat, omit it. Do NOT fabricate numbers.
Every "note" field MUST include a date or time reference (e.g. "eBay sold data, Apr 2025" or "as of May 2026").

Return JSON array of sections:
[
  {
    "emoji": "📈",
    "label": "Live Market Activity",
    "as_of": "May 2026",
    "items": [
      { "label": "...", "stat": "...", "note": "... (source + date)", "trend": "up|down|neutral" }
    ]
  }
]

Focus on: recent eBay sold volume, price range last 90 days, player career status, set prestige, population data if known.
Return only verified facts. Mark anything estimated with "(est.)" in the note.`,
          response_json_schema: {
            type: "object",
            properties: {
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    emoji: { type: "string" },
                    label: { type: "string" },
                    as_of: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          stat:  { type: "string" },
                          note:  { type: "string" },
                          trend: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });
        if (result?.sections?.length > 0) setSections(result.sections);
      } catch (_) {
        // silently hide on error
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [playerName, cardYear, cardSet]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Fetching contextual market signals...
      </div>
    );
  }

  if (!sections || sections.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
        💡 Contextual Market Signals
      </h3>
      {sections.map((section, i) => (
        <SectionCard key={section.label} section={section} index={i} />
      ))}
    </div>
  );
}