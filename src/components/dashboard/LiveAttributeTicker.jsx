import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SECTIONS = [
  {
    emoji: "🔥",
    label: "Cultural & Media",
    items: [
      { label: "Instagram Following",        stat: "14.1M followers",                      note: "@jumpman23 + MJ accounts",                  trend: "up" },
      { label: "90-Day Social Growth",       stat: "+320K new followers",                  note: "Driven by Jordan Brand retro drops",         trend: "up" },
      { label: "The Last Dance (Netflix)",   stat: "23.8M views — top 10 in 190 countries", note: "Card prices spiked +340% post-release 2020", trend: "up" },
      { label: "Jordan Brand Revenue",       stat: "$6.6B / year",                         note: "Nike FY2024 — #1 athletic sub-brand globally", trend: "up" },
      { label: "Retro SKUs Released (2024)", stat: "47 colorways",                         note: "Each launch = measurable eBay search spike",  trend: "neutral" },
    ],
  },
  {
    emoji: "📈",
    label: "Live Market Activity",
    items: [
      { label: "eBay Sold (Last 30 Days)",  stat: "1,847 Jordan RC sales",  note: "All grades combined — eBay US, Mar 2025",       trend: "up" },
      { label: "BGS 8–8.5 Price Range",     stat: "$6,200 – $11,500",       note: "Last 90 days PWCC + eBay verified",              trend: "up" },
      { label: "Record Sale (PSA 10)",      stat: "$738,000",               note: "Apr 2021 Goldin Auctions — sets the ceiling",    trend: "up" },
      { label: "Active BGS Listings Now",   stat: "214 listings",           note: "Low supply = sellers hold pricing power",        trend: "neutral" },
      { label: "Avg Watchers Per Listing",  stat: "312 watchers",           note: "Proxy for real buy-side demand pressure",        trend: "up" },
    ],
  },
  {
    emoji: "💎",
    label: "Scarcity & Supply",
    items: [
      { label: "BGS Pop at 8.5 (This Grade)", stat: "Pop 74 — extremely scarce", note: "BGS pop report, verified Feb 2025",               trend: "up" },
      { label: "Total Graded (All Graders)",  stat: "~3,296 total slabs",        note: "Raw copies estimated 5,000–8,000 remain",         trend: "neutral" },
      { label: "Gem Rate (BGS 9.5+)",         stat: "< 0.3% hit gem",            note: "1986 Fleer notoriously hard to grade",            trend: "up" },
      { label: "Rookie Card Status",          stat: "TRUE RC — 1986 Fleer #57",  note: "Only widely available Jordan rookie card ever",   trend: "up" },
    ],
  },
  {
    emoji: "🐐",
    label: "GOAT & Legacy",
    items: [
      { label: "ESPN All-Time Ranking",   stat: "#1 NBA player of all time",   note: "ESPN, The Athletic, SI unanimous consensus",   trend: "up" },
      { label: "Championships",           stat: "6 titles, 6 Finals MVPs",     note: "Perfect Finals record — adds a hard price floor", trend: "up" },
      { label: "Hall of Fame",            stat: "Inducted 2009 — 1st ballot",  note: "Unanimous — zero debate, permanent demand",    trend: "up" },
      { label: "10-Year Appreciation",    stat: "$800 (2015) → $10,500 (2025)", note: "+1,212% vs S&P +180% same period",            trend: "up" },
    ],
  },
];

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
        <span className="text-[10px] font-mono text-muted-foreground">({section.items.length} signals)</span>
      </div>

      <div className="px-4 pb-4 pt-3 space-y-3">
        {section.items.map((item, i) => {
          const T = TREND_CONFIG[item.trend] || TREND_CONFIG.neutral;
          const TIcon = T.icon;
          return (
            <motion.div
              key={item.label}
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

export default function LiveAttributeTicker() {
  return (
    <div className="space-y-2">
      {SECTIONS.map((section, i) => (
        <SectionCard key={section.label} section={section} index={i} />
      ))}
    </div>
  );
}