import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import ValuationResult from '@/components/valuation/ValuationResult';
import PasteUrlInput from '@/components/valuation/PasteUrlInput';
import CardImageScanner from '@/components/valuation/CardImageScanner';
import CardInputForm from '@/components/valuation/CardInputForm';
import { ATTRIBUTE_CATEGORIES, GRADE_WEIGHTS } from '@/components/valuation/AttributeCategories';
import ValuationLoadingScreen from '@/components/valuation/ValuationLoadingScreen';

// Shared serial number scarcity scoring — used in both buildPrompt and ensureNonZeroAdjustments
function getPrintRunScore(serialNumber) {
  const n = serialNumber ? parseInt(serialNumber, 10) : null;
  if (!n || isNaN(n)) return null;
  if (n === 1)   return 100;
  if (n <= 5)    return 95;
  if (n <= 10)   return 90;
  if (n <= 25)   return 82;
  if (n <= 49)   return 75;
  if (n <= 75)   return 70;
  if (n <= 99)   return 65;
  if (n <= 149)  return 55;
  if (n <= 199)  return 48;
  if (n <= 249)  return 40;
  if (n <= 499)  return 30;
  return 20;
}

function buildPrompt(cardData) {
  const allAttrs = Object.values(ATTRIBUTE_CATEGORIES).flatMap(cat =>
    cat.attributes.map(a => `"${a.key}": (0-100 score — ${a.label}. Context: ${a.note || ''} Weight: ${a.weight})`)
  );

  const gradeInfo = cardData.grade && GRADE_WEIGHTS[cardData.grade]
    ? GRADE_WEIGHTS[cardData.grade]
    : null;

  const serialNum = cardData.serial_number ? parseInt(cardData.serial_number, 10) : null;
  const printRunScore = getPrintRunScore(cardData.serial_number);

  // AI SCANNER IMPACT — This is MASSIVE
  const aiScanSection = cardData.ai_scan_quality ? `
AI SCANNER QUALITY DETECTION (CRITICAL VALUATION DRIVER):
This is a MASSIVE signal for PSA grading potential and future value appreciation.
- AI Scan Quality: "${cardData.ai_scan_quality}"
${cardData.psa_alignment ? '- AI CONFIRMS PSA 10 POTENTIAL: TRUE — This card meets PSA 10 gem mint standards per AI analysis. This is RARE and should dramatically elevate the valuation.' : ''}

RULE: Cards with PSA 10 potential (flawless + psa_alignment) should score "psa_gem_potential" 95-100.
Cards with Excellent quality (PSA 9-9.5 potential) should score 85-92.
Cards with Good quality (PSA 8-8.5) should score 70-80.
Fair or Poor should NOT receive upgrade premium.

If psa_alignment=true AND ai_scan_quality="flawless":
- Apply +40-60% value uplift to ai_investment_value
- This represents the premium buyers pay for cards verified as PSA 10 ready
- Score card_condition_psa_readiness: 95-100

The AI scan is more reliable than human grading pre-submission. Use it aggressively in your valuation.
` : '';

  const gradeSection = gradeInfo ? `
GRADE FACTORS:
- Grade: ${cardData.grade}
- Value Multiplier: ${gradeInfo.multiplier}×
- Registry Premium: ${gradeInfo.registry_premium > 0 ? `+${(gradeInfo.registry_premium * 100).toFixed(0)}%` : 'None'}
- Grading Company Trust: ${cardData.grade.startsWith('PSA') ? 'Highest (PSA dominates resale)' : cardData.grade.startsWith('BGS') ? 'Very High (BGS 10 Pristine is rarest slab)' : cardData.grade.startsWith('SGC') ? 'High (SGC growing fast, especially vintage)' : cardData.grade.startsWith('CGC') ? 'Moderate-High (CGC emerging)' : 'None — raw = illiquid, high risk'}
- Pop Scarcity at This Grade: ${(gradeInfo.pop_scarcity_factor * 100).toFixed(0)}/100
- Upgrade Potential: ${gradeInfo.tier === 'raw' ? 'High' : gradeInfo.tier === 'nm' || gradeInfo.tier === 'low' ? 'Moderate' : 'Low — already at top grade'}
` : '';

  const scanNotes = cardData.scan_notes ? `
CARD SCAN OBSERVATIONS:
${cardData.scan_notes}
` : '';

  return `NBA TRADING CARD AI VALUATION ENGINE v1.4 — TRADER-FIRST, COMP-ANCHORED

CORE PHILOSOPHY
You are the world's most advanced trader-first AI valuation engine for NBA basketball trading cards. Your mission is to destroy the "comps-only" mindset — conservatively. Comps are the single strongest anchor (90%+ weight). You only push back on comps when 44+ layered attributes create a clear, evidence-based edge or risk. The AI Value will rarely deviate more than ±10–15% from comps unless data is overwhelmingly strong. Deviations go down just as easily as up. Never hype.

⚠️ MANDATORY CALCULATION RULE — NEVER SKIP THIS

The AI Value MUST ALWAYS be a mathematically distinct number from the raw comp average. These are two separate outputs. Outputting the comp price as the AI Value is a critical failure.

Before writing any output, you MUST silently complete this 3-step internal calculation:
Step A — Comp Base: Calculate the weighted comp average (most recent comp weighted highest). This is your Base. Write it down internally.
Step B — Attribute Adjustment: Evaluate every relevant attribute from the 44+ list. For each, assign a small + or – dollar impact. Add them all up. This is your Net Adjustment. Even if net adjustment is small or near-zero, it is NEVER exactly $0 — at minimum, liquidity, market trend, and condition always produce some delta.
Step C — AI Value: AI Value = Base + Net Adjustment. This number MUST differ from the Base. If your net adjustment truly rounds to zero after all attributes, default to a ±3–5% uncertainty range around the comp and present the midpoint as the AI Value — never a flat echo.
Only after completing Steps A, B, and C do you write your output.

POSSIBLE TREASURE FOUND & BUST RISK SYSTEM:
- "Possible Treasure Found" triggers ONLY when net positive attribute drivers exceed +12% total push after all 44+ factors AND at least 3 high-impact attributes align powerfully (scarcity, on-card auto, player momentum, low pop, etc.).
  → Set possible_treasure: true and possible_treasure_text: "Our ultra-conservative model identifies X% net upside from these drivers — possible treasure found if the market catches up. Model accuracy improves with more data; treat as one high-signal tool, not gospel."
- "Bust Risk" triggers when net negative drivers exceed -12% AND multiple red flags align (injury, stale comps, supply flood, hot-to-cold player, etc.).
  → Set bust_risk: true and bust_risk_text: "Attributes suggest potential bust — consider staying away from last comps. Model accuracy improves with more data; treat as one high-signal tool, not gospel."
- If NEITHER threshold is met, set both to false and leave text fields empty. Do NOT invent alerts.

${aiScanSection}

CARD DETAILS:
- Player: ${cardData.player_name}
${cardData.card_year ? `- Year: ${cardData.card_year}` : ''}
${cardData.card_set ? `- Set: ${cardData.card_set}` : ''}
${cardData.card_number ? `- Card Number: ${cardData.card_number}` : ''}
${cardData.variation ? `- Variation: ${cardData.variation}` : ''}
${serialNum ? `- Serial Number / Print Run: /${serialNum} (this card is numbered out of ${serialNum} total copies)` : '- Serial Number: Not serialized or unknown'}
${cardData.grade ? `- Grade: ${cardData.grade}` : ''}
- ═══════════════════════════════════════════════════
- LAST SOLD PRICE (MANDATORY COMP ANCHOR): $${cardData.comp_value || 'NOT PROVIDED'}
- ═══════════════════════════════════════════════════
${cardData.comp_value ? `- THIS IS YOUR BASE. You MUST use $${cardData.comp_value} as Step A of your internal calculation. Do NOT ignore this number. Do NOT substitute your own estimate. Do NOT look up a different price. Your ai_investment_value MUST be derived mathematically from $${cardData.comp_value} ± attribute adjustments. Any output that does not start from $${cardData.comp_value} as the base is a critical failure.` : '- WARNING: No last sold price provided.'}
${cardData._comp_tier === 'similar_card_baseline' && cardData._similar_comps?.length > 0 ? `
⚠️ ULTRA-RARE / NO DIRECT COMP SCENARIO:
No direct sale of this exact card was found. A baseline was established from 3 similar (non-auto) cards:
${cardData._similar_comps.map((c, i) => `  ${i+1}. ${c.description}: $${c.sold_price?.toLocaleString()} (${c.sale_date})`).join('\n')}

Average baseline: $${Math.round(cardData._similar_comps.reduce((s,c) => s + (c.sold_price||0), 0) / cardData._similar_comps.length).toLocaleString()}

INSTRUCTION: Use this average baseline as your Step A comp anchor. Then apply a SUBSTANTIAL UPWARD scarcity premium for the card's rarity (${cardData.serial_number === '1' || cardData.serial_number === 1 ? '1/1 = unique in the world' : `/${cardData.serial_number} = extreme scarcity`}). A 1/1 of a superstar like Luka commands a massive premium over base similar cards. Your ai_investment_value should reflect this scarcity reality. Note in analysis_summary that no direct comp exists and the baseline methodology was used.
` : ''}
${cardData._comp_tier === 'no_comp_conservative_estimate' ? `
⚠️ NO COMP DATA AT ALL: No sales found anywhere. Use conservative market knowledge only. Be explicit about uncertainty in analysis_summary.
` : ''}
${cardData.cheapest_available ? `- Cheapest Available Now: $${cardData.cheapest_available} — HARD CEILING: if this is LOWER than comp, AI Value cannot exceed cheapest_available unless pop at grade is under 10. Mention explicitly.` : ''}
${gradeSection}

COMP HANDLING RULES:
- Ideal: Last 3 most recent, truly comparable sales (same player, same card/parallel/serial range, same grade). Average them, weighting the most recent highest.
- 1 comp only (most likely scenario): Use it as 90%+ anchor. Note thin data explicitly in analysis_summary.
- 2 comps: Average them (recent weighted higher).
- No recent comps or comps >12 months old: Treat as weak starting point only (max 60% weight). Increase weight of scarcity, liquidity, current player momentum. Flag "Stale Comps – Scarcity & Momentum Drive Value Here."
- No comps: Use market knowledge conservatively. Flag uncertainty. Still produce best-effort AI Value.

CARD IDENTITY SIGNALS (user-provided):
- Is Rookie Year Card: ${cardData.is_rookie_year ? 'YES — Rookie year. This is the single most important category signal in the hobby. Meaningful RC premium applies — but stay conservative unless the card is from an ultra-premium set.' : 'No / Unknown'}
- Parallel Color Matches Team Colors: ${cardData.color_matches_team ? 'YES — color-matched parallel. Small premium (+5-10%) for team/player collectors.' : 'No / Unknown'}

SET BRAND TIER:
Set: "${cardData.card_set || 'Unknown'}"
- Ultra-Premium (National Treasures, Flawless, Exquisite, Immaculate, Noir): Massive prestige premium. Score card_brand_tier: 90-100. Can justify up to +10-15% AI adjustment.
- Premium (Prizm, Select, Optic, Spectra, Crown Royale): High demand, liquid. Score: 65-85. Up to +5-8% adjustment.
- Mid-Tier (Mosaic, Certified, Hoops Premium): Solid, lower prestige. Score: 40-60. Neutral to small adjustment.
- Base/Budget (Hoops, Donruss, Topps, Fleer base): High print runs. Score: 10-35. Likely small negative adjustment.

PLAYER STATUS:
- ${cardData.player_popularity === 'rising' ? '🚀 RISING STAR — accelerating demand. Conservative +5-10% near-term premium. Watch for overcorrection.' : cardData.player_popularity === 'peak' ? '🔥 PEAK POPULARITY — maximum current demand. Premium NOW but watch for pullback. Neutral to small +adjustment.' : cardData.player_popularity === 'legend' ? '🐐 ALL-TIME LEGEND — permanent floor. Strong long-term hold signal. Neutral to small +adjustment for scarcity.' : cardData.player_popularity === 'declining' ? '📉 DECLINING — demand softening. Apply –5-15% conservative discount depending on severity.' : 'Unknown — use your knowledge. Be conservative.'}

TV / DOCUMENTARY CATALYST:
${cardData.has_tv_show && cardData.tv_show_name ? `ACTIVE MEDIA CATALYST: "${cardData.tv_show_name}" — genuine demand driver. Score recent_viral_moments: 75-90. Can justify +5-15% if currently airing or recently released. Cap at +15% even for major titles.` : 'No known active TV/documentary catalyst.'}

SNEAKER DEAL:
${cardData.has_sneaker_deal && cardData.sneaker_brand ? `ACTIVE SNEAKER DEAL: ${cardData.sneaker_brand}
- Nike/Jordan Brand: Score sneaker_line_activity: 85-100. Small premium +3-8%.
- Adidas/UA/Puma: Score: 60-80. Small premium +2-5%.
- Li-Ning/Anta: Score: 55-70. Signals China market demand. +2-4%.
${cardData.sneaker_brand.includes('Nike') || cardData.sneaker_brand.includes('Jordan') ? 'Jordan Brand note: Cyclical retro release spikes drive periodic demand bumps.' : ''}` : 'No sneaker deal specified — use your knowledge. Be conservative.'}

VIRAL MOMENT:
${cardData.recent_viral_moment && cardData.viral_description ? `RECENT VIRAL MOMENT: "${cardData.viral_description}" — short-term demand spike. Score recent_viral_moments: 80-95. Apply +5-12% near-term only. Note it fades within 30-90 days in analysis_summary.` : 'No recent viral moment reported.'}

${scanNotes}

CARD DNA SCORING:
- "card_brand_tier": NT/Flawless/Exquisite = 90-100. Prizm/Select/Optic = 60-80. Base = 20-40.
- "set_prestige": Iconic vintage (1986 Fleer, 96-97 Topps Chrome) = 95-100. Modern premium = 70-85. Base modern = 30-50.
- "variation_desirability": Silver/Base = 60-70. Gold/Color parallels = 75-85. /10 or less = 90-100. Superfractor = 100.
- "jersey_number_match": Card# = player jersey# = 90-100. No match = 0-10.

SERIAL NUMBER — PRE-CALCULATED (USE THESE EXACT VALUES, DO NOT OVERRIDE):
${serialNum ? `
⚠️ THIS CARD IS NUMBERED /${serialNum}. There are exactly ${serialNum} copies of this card in existence.
- "print_run_size" MUST be scored: ${printRunScore} (pre-calculated for /${serialNum})
- "is_serialized" MUST be scored: 100 (card is serialized)
- "is_one_of_one" MUST be scored: ${serialNum === 1 ? '100 — TRUE 1/1' : '0 — NOT a 1/1'}
- Do NOT score print_run_size as if this were a /10 or /1 card. It is /${serialNum}.
` : `
- Card is NOT serialized (or serial unknown). Score "is_serialized": 10, "print_run_size": 10, "is_one_of_one": 0.
`}
- "low_serial_number": #1=100. #2=95. #3-5=88. #6-10=78. #26+=20. (only applies if the individual copy number is known)

AUTOGRAPH:
- "auto_type": On-card = 85-100. Sticker = 30-55. No auto = 0.
- "auto_quality": Bold full-name = 80-100. Partial/rushed = 40-65. Sticker scribble = 20-40.

PATCH:
- "patch_quality": Logoman=100. Nike Swoosh=88. Number patch=82. Multi-color=70. Single white=40. No patch=0.
- "rpa_designation": True RPA (RC+Patch+Auto) = 95-100. Base card = 0.

POPULATION (INVERSE — lower pop = higher score):
${serialNum ? `⚠️ SERIAL NUMBER CONSTRAINT: This card is /${serialNum}. The MAXIMUM possible total population is ${serialNum} copies. There can NEVER be more than ${serialNum} of these in existence. Do NOT score pop_report as if thousands exist. Score pop_report based on this hard ceiling of ${serialNum} total copies.` : ''}
- "pop_count_at_grade": Pop 1=100. 2-5=92-96. 6-15=82-88. 16-30=72-78. 31-75=60-68. 76-150=45-55. 300+=18-28. 500+=5-15.
- "pop_report": Under 50 total=90-100. Under 500=60-70. 2000-10000=20-35. 10000+=5-15.
${serialNum ? `NOTE: For a /${serialNum} card, pop_report score MUST reflect that the total universe is max ${serialNum} copies. A /${serialNum} card cannot have a pop of 500+. Score accordingly (likely 90-100 for pop_report).` : ''}

RETIRED PLAYER: Score career_trajectory and injury_risk as -1. Score goat_legacy_score, hall_of_fame_trajectory, cultural_icon_status, historical_appreciation: 80-100 for legends.

LIQUIDITY SCORE (always calculate separately):
- High liquidity (<7 days avg sell for this card type/player): small premium +2-4%. Note: "Fast-moving card — strong flip potential."
- Medium liquidity (7-30 days): Neutral. No adjustment.
- Low liquidity (>30 days): small discount –2-5%. Note: "Slow mover — hold premium needed."
- Always show liquidity_score separately in the response and reference it in analysis_summary.

VALUATION MODEL (ultra-conservative):
  Base = comp_value (90% anchor) — THIS IS ALREADY A SALE AT THE STATED GRADE. DO NOT multiply by grade_multiplier again.
  attribute_adjustment = sum of all signal adjustments as % of comp (capped at ±15% standard, ±25% max for extraordinary evidence)
  ai_investment_value = comp_value + (comp_value × attribute_adjustment)

  GRADE MULTIPLIER RULE: The grade multiplier (${gradeInfo ? gradeInfo.multiplier : 1.0}×) is ONLY informational context. Since comp_value is already a sale at this grade, you MUST NOT multiply comp by the grade multiplier.

  CRITICAL OUTPUT RULE: The "ai_investment_value" field MUST show a different dollar figure from comp_value. If they would be identical, you have failed Step B — go back and re-examine liquidity, condition variance, market trend, and supply/demand. Something always moves the needle. If net adjustment truly rounds to $0, apply a minimum ±5% uncertainty adjustment in the direction of the dominant signals.
  Minimum enforced difference: ±8% from comp_value. Never return comp_value as ai_investment_value.
  If cheapest_available < comp: AI Value must not exceed cheapest_available (unless pop at grade < 10).

Score ALL ${allAttrs.length} attributes (0-100, or -1 for N/A):

${allAttrs.join('\n')}

Return:
- "overall_score": 0-100 weighted investment score
- "flip_vs_hold": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell"
  Map conservatively: strong_buy only for clear >15% AI premium with strong evidence. sell/strong_sell when attributes point meaningfully lower than comp.
- "ai_investment_value": USD — MUST differ from comp_value by at least 3%. Use the ultra-conservative model above. Ground in real market data.
- "liquidity_score": string — one of "high" | "medium" | "low" with a short note (e.g. "high — <7 days avg sell, strong flip potential")
- "trader_recommendation": string — one of "Good Buy" | "Grab" | "Hold" | "Sell Now" + 2-sentence explanation focused on 30-90 day flip window vs. long-term hold
- "possible_treasure": boolean — true ONLY if net positive drivers exceed +12% AND 3+ high-impact attributes align powerfully
- "possible_treasure_text": string — exact disclosure (empty string if possible_treasure is false)
- "bust_risk": boolean — true ONLY if net negative drivers exceed -12% AND multiple red flags align
- "bust_risk_text": string — exact disclosure (empty string if bust_risk is false)
- "projections": object with keys "one_year", "three_year", "five_year" — each a string range like "$800–$1,200" with 1-sentence reasoning
- "analysis_summary": 3-4 sentences. Lead with: (1) comp anchor quality (fresh/stale/single/none), (2) top 2 drivers moving AI value up or down, (3) liquidity context, (4) honest trader recommendation for 30-90 day vs. long-term.
- "key_signals": Array of 5-8 objects — the signals that most move value UP or DOWN. Mix bullish AND bearish honestly. For each:
  - "label": short punchy name
  - "direction": "bullish" | "bearish" | "neutral"
  - "impact_pct": realistic % impact (integer, 2-20 — stay conservative, rarely >15%)
  - "reason": 1 sentence with real market logic
  Order by impact_pct descending.

DOLLAR-BASED VALUE DRIVERS (REQUIRED — this is the math that makes valuation transparent):
⚠️ MANDATORY BASE: $${cardData.comp_value || 0} is your ONLY starting number. Every dollar adjustment below is calculated as a percentage of $${cardData.comp_value || 0}. Do not use any other base price.

For each top value driver, compute:
  dollar_adjustment = comp_value × percent_adjustment

Return "value_drivers" as an array of the top 6-8 drivers ranked by absolute dollar impact:
{
  "label": "...",
  "percent_adjustment": "+X%" or "-X%",
  "dollar_adjustment": "+$XXX" or "-$XXX",
  "reason": "One sentence of real market logic"
}

Also return "holders_comp_calculation" showing the full math:
{
  "last_sold_comp": "$${cardData.comp_value || 0}",
  "grade_multiplier_dollars": "-$XXX (grade_multiplier reduces base by (1 - ${gradeInfo ? gradeInfo.multiplier : 1.0}) × comp)",
  "top5_dollar_adjustments": ["+$XXX – Label", "-$XXX – Label", ...],
  "supporting_factors_dollars": "+$XXX (sum of remaining drivers)",
  "final_holders_comp": "$YYY"
}

CRITICAL: final_holders_comp MUST differ from last_sold_comp. Minimum ±8% difference always. If your adjustments net to less than ±8%, revisit liquidity score, condition delta, and market trend — they always produce some movement. Apply the minimum ±8% in the direction of dominant signals rather than echoing the comp.`;
}

function buildResponseSchema() {
  const attrProps = {};
  Object.values(ATTRIBUTE_CATEGORIES).forEach(cat => {
    cat.attributes.forEach(attr => {
      attrProps[attr.key] = { type: "number" };
    });
  });

  return {
    type: "object",
    properties: {
      overall_score: { type: "number" },
      flip_vs_hold: { type: "string" },
      ai_investment_value: { type: "number" },
      liquidity_score: { type: "string" },
      trader_recommendation: { type: "string" },
      possible_treasure: { type: "boolean" },
      possible_treasure_text: { type: "string" },
      bust_risk: { type: "boolean" },
      bust_risk_text: { type: "string" },
      projections: {
        type: "object",
        properties: {
          one_year:   { type: "string" },
          three_year: { type: "string" },
          five_year:  { type: "string" },
        }
      },
      analysis_summary: { type: "string" },
      key_signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label:      { type: "string" },
            direction:  { type: "string" },
            impact_pct: { type: "number" },
            reason:     { type: "string" },
          }
        }
      },
      value_drivers: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label:              { type: "string" },
            percent_adjustment: { type: "string" },
            dollar_adjustment:  { type: "string" },
            reason:             { type: "string" },
          }
        }
      },
      holders_comp_calculation: {
        type: "object",
        properties: {
          last_sold_comp:            { type: "string" },
          grade_multiplier_dollars:  { type: "string" },
          top5_dollar_adjustments:   { type: "array", items: { type: "string" } },
          supporting_factors_dollars:{ type: "string" },
          final_holders_comp:        { type: "string" },
        }
      },
      attribute_scores: {
        type: "object",
        properties: attrProps
      }
    }
  };
}

// Phase 1: Fetch real last-sold comp from the market before running valuation
// For ultra-rare / 1-of-1 cards with no direct comp, escalates to similar-card baseline approach
async function fetchRealComp(cardData) {
  const { player_name, card_year, card_set, variation, serial_number, grade, has_autograph } = cardData;
  const serialStr = serial_number ? `/${serial_number}` : '';
  const isUltraRare = serial_number && parseInt(serial_number, 10) <= 5;
  const isOneOfOne = serial_number === '1' || serial_number === 1;

  const primarySearch = `${player_name} ${card_year || ''} ${card_set || ''} ${variation || ''} ${serialStr} ${grade || ''}`.trim();
  const setSearch = `${player_name} ${card_set || ''} ${grade || ''}`.trim();
  const playerSearch = `${player_name} ${card_year || ''} ${card_set || ''}`.trim();

  const ultraRareNote = isUltraRare ? `
⚠️ ULTRA-RARE CARD — THIS IS A ${isOneOfOne ? '1/1 (ONE OF ONE)' : `/${serial_number}`} CARD.
There may be ZERO direct comps for this exact card. Follow the ESCALATING COMP STRATEGY below.
` : '';

  const autoFilter = has_autograph === false
    ? 'CRITICAL: This card has NO autograph. Only use comparable cards that also have NO autograph. Do NOT use RPAs, auto patches, or signed cards as comps — autographs add 30-200%+ premium and would distort the baseline.'
    : 'This card has an autograph. Prefer autograph comps when available.';

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Sports card comp researcher. Find REAL sold prices only — NO asking prices.

${ultraRareNote}
CARD: ${player_name} ${card_year || ''} ${card_set || ''} ${variation || ''} ${serialStr}${grade ? ' · ' + grade : ''}
${autoFilter}

SEARCH STRATEGY (stop at first success):
TIER 1 — Search eBay sold, PWCC, Goldin, 130point for: "${primarySearch} sold" → tier="exact_match"
TIER 2 — Same card, adj grade/serial → tier="adjusted_comp", explain in notes
TIER 3 — 3 similar sold cards as baseline (esp. for ultra-rare) → tier="similar_card_baseline", return similar_comps array
TIER 4 — No data: conservative estimate from market knowledge → tier="no_comp_conservative_estimate"

RETURN JSON:
- tier, comp_value (null only for T4), cheapest_available, sale_date, sales_found, confidence (high/medium/low)
- notes (what you found, adjustments, data quality)
- ebay_link (T1 only)
- similar_comps: [{description, sold_price, sale_date, source, ebay_link}] (T3 only)
- conservative_estimate_reasoning (T4 only)`,
    response_json_schema: {
      type: "object",
      properties: {
        tier: { type: "string" },
        comp_value: { type: ["number", "null"] },
        cheapest_available: { type: ["number", "null"] },
        sale_date: { type: "string" },
        sales_found: { type: "number" },
        confidence: { type: "string" },
        notes: { type: "string" },
        ebay_link: { type: ["string", "null"] },
        similar_comps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description:  { type: "string" },
              sold_price:   { type: "number" },
              sale_date:    { type: "string" },
              source:       { type: "string" },
              ebay_link:    { type: ["string", "null"] },
            }
          }
        },
        conservative_estimate_reasoning: { type: ["string", "null"] },
      }
    },
    add_context_from_internet: true,
    model: 'gemini_3_1_pro',
  });

  return result;
}

export default function ValuateCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(null); // 'fetching_comp' | 'valuing'
  const [compFetchResult, setCompFetchResult] = useState(null);
  const [result, setResult] = useState(null);
  const [cardInput, setCardInput] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const { toast } = useToast();

  const ensureNonZeroAdjustments = (aiResult, cardData) => {
    const compValue = cardData.comp_value || 0;
    let attributeScores = aiResult.attribute_scores || {};
    
    // Check if all adjustments are zero
    const allZero = Object.values(attributeScores).every(score => score === -1 || score === 0 || score === 50);
    
    if (allZero && compValue > 0) {
      // Auto-generate realistic scores based on card signals
      attributeScores = {
        // Cultural/Market Signals
        cultural_icon_status: cardData.player_popularity === 'legend' ? 85 : cardData.player_popularity === 'peak' ? 75 : 55,
        player_momentum: cardData.player_popularity === 'rising' ? 80 : cardData.player_popularity === 'declining' ? 25 : 60,
        recent_viral_moments: cardData.recent_viral_moment ? 82 : 45,
        
        // Set/Grade Signals
        card_brand_tier: cardData.card_set ? 68 : 50,
        set_prestige: cardData.card_set ? 65 : 45,
        
        // Scarcity Signals
        scarcity_at_grade: 62,
        print_run_size: 58,
        pop_count_at_grade: 60,
        
        // Media/Sneaker Signals
        sneaker_line_activity: cardData.has_sneaker_deal ? 72 : 40,
        upcoming_documentary: cardData.has_tv_show ? 78 : 35,
        
        // Investment Fundamentals
        goat_legacy_score: cardData.player_popularity === 'legend' ? 88 : 55,
        hall_of_fame_trajectory: cardData.player_popularity === 'legend' ? 85 : 55,
        retail_floor_strength: 58,
        auction_velocity: 64,
        
        // Card Identity
        is_rookie_year: cardData.is_rookie_year ? 88 : 30,
        variation_desirability: cardData.color_matches_team ? 72 : 50,
        
        // PSA/Condition
        psa_gem_potential: cardData.psa_alignment ? 92 : cardData.ai_scan_quality === 'flawless' ? 78 : 45,
        card_condition_psa_readiness: cardData.psa_alignment ? 90 : 50,
        
        // Serial / Scarcity — use real print run if available
        is_serialized: cardData.serial_number ? 100 : 10,
        print_run_size: getPrintRunScore(cardData.serial_number) ?? 10,
        is_one_of_one: cardData.serial_number === '1' ? 100 : 0,
        has_autograph: cardData.has_autograph ? 75 : 25,
        has_patch: cardData.has_autograph || cardData.color_matches_team ? 68 : 35,
        auto_quality: cardData.has_autograph ? 70 : 20,
        rpa_designation: 45,
        historical_appreciation: 62,
      };
    }
    
    return {
      ...aiResult,
      attribute_scores: attributeScores,
    };
  };

  const handleValuate = async (cardData) => {
    setIsLoading(true);
    setCardInput(cardData);
    setCompFetchResult(null);

    // ── PHASE 1: Fetch real last-sold comp if not already provided ──────────
    let enrichedCardData = { ...cardData };

    if (!cardData.comp_value || parseFloat(cardData.comp_value) <= 0) {
      setLoadingPhase('fetching_comp');
      try {
        const compData = await fetchRealComp(cardData);
        setCompFetchResult(compData);

        if (compData.comp_value && compData.comp_value > 0) {
          enrichedCardData = {
            ...enrichedCardData,
            comp_value: compData.comp_value,
            cheapest_available: enrichedCardData.cheapest_available || compData.cheapest_available || null,
            _comp_sale_date: compData.sale_date || null,
            _comp_confidence: compData.confidence || 'medium',
            _comp_notes: compData.notes || '',
            _comp_tier: compData.tier || null,
            _comp_ebay_link: compData.ebay_link || null,
            _similar_comps: compData.similar_comps || [],
            _conservative_estimate_reasoning: compData.conservative_estimate_reasoning || null,
          };
        } else {
          // No comp found — still carry through tier data and similar comps
          enrichedCardData = {
            ...enrichedCardData,
            _comp_tier: compData.tier || 'no_comp_conservative_estimate',
            _comp_notes: compData.notes || '',
            _similar_comps: compData.similar_comps || [],
            _conservative_estimate_reasoning: compData.conservative_estimate_reasoning || null,
          };
        }
        // If still null — proceed, but the valuation prompt will flag it
      } catch {
        // Phase 1 failed silently — proceed to valuation anyway
      }
    } else {
      enrichedCardData._comp_confidence = 'user_provided';
    }

    // ── PHASE 2: Full valuation ──────────────────────────────────────────────
    setLoadingPhase('valuing');

    const prompt = buildPrompt(enrichedCardData);
    const schema = buildResponseSchema();
    const compValue = parseFloat(enrichedCardData.comp_value) || 0;

    // Run LLM valuation — calculateValuation backend will fire in parallel once we have signals
    let aiResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: true,
    });

    // Ensure non-zero adjustments
    aiResult = ensureNonZeroAdjustments(aiResult, enrichedCardData);

    let finalAiValue = parseFloat(aiResult.ai_investment_value) || 0;
    let backendCalc = null;

    // Compute net signal direction from key_signals so we pick the right side
    const signals = aiResult.key_signals || [];
    const netSignalPct = signals.reduce((sum, sig) => {
      const pct = sig.impact_pct || 0;
      return sum + (sig.direction === 'bullish' ? pct : sig.direction === 'bearish' ? -pct : 0);
    }, 0);

    // IRONCLAD: AI value MUST differ from comp by at least 8%. No exceptions.
    const enforceMinDiff = (aiVal, comp) => {
      if (!comp || comp <= 0) return aiVal > 0 ? Math.round(aiVal) : 0;
      const candidate = Math.round(aiVal);
      const diffPct = Math.abs((candidate - comp) / comp) * 100;
      if (diffPct < 8) {
        return netSignalPct < 0 ? Math.round(comp * 0.92) : Math.round(comp * 1.08);
      }
      return candidate;
    };

    finalAiValue = enforceMinDiff(finalAiValue, compValue);

    // Call calculateValuation backend in parallel — fire immediately, await result
    if (signals.length > 0) {
      const anchorPrice = compValue > 0 ? compValue : finalAiValue;
      try {
        const valuationResponse = await base44.functions.invoke('calculateValuation', {
          last_sold_price: anchorPrice,
          grade: cardData.grade || 'Raw',
          ai_eye_appeal_grade: enrichedCardData.ai_eye_appeal_grade || 'B',
          attributes: signals.map(sig => ({
            label: sig.label,
            percent_adjustment: `${sig.direction === 'bullish' ? '+' : sig.direction === 'bearish' ? '-' : ''}${sig.impact_pct}%`,
            reason: sig.reason
          }))
        });
        const vr = valuationResponse.data;
        const rawDisplay = vr.holders_comp_display || '';
        const isNegDisplay = rawDisplay.includes('-');
        const parsed = parseFloat(rawDisplay.replace(/[^0-9.]/g, '')) * (isNegDisplay ? -1 : 1);
        const backendValue = parsed && !isNaN(parsed) ? parsed : finalAiValue;
        finalAiValue = enforceMinDiff(backendValue, compValue);
        backendCalc = vr.holders_comp_calculation;
        if (vr.top_value_drivers && vr.top_value_drivers.length > 0) {
          aiResult = { ...aiResult, value_drivers: vr.top_value_drivers };
        }
      } catch (err) {
        // enforceMinDiff already applied above, value is safe
      }
    }

    // FINAL ABSOLUTE SAFETY — triple-check before setting state, no matter what path was taken
    if (compValue > 0) {
      const finalDiffPct = Math.abs((finalAiValue - compValue) / compValue) * 100;
      if (finalDiffPct < 8) {
        finalAiValue = netSignalPct < 0 ? Math.round(compValue * 0.92) : Math.round(compValue * 1.08);
      }
    }

    const finalResult = {
      ...enrichedCardData,
      comp_value: compValue || null,
      ...aiResult,
      ai_investment_value: finalAiValue,
      holders_comp_calculation: backendCalc || aiResult.holders_comp_calculation || null,
      _comp_sale_date: enrichedCardData._comp_sale_date || null,
      _comp_confidence: enrichedCardData._comp_confidence || null,
      _comp_notes: enrichedCardData._comp_notes || '',
      _comp_tier: enrichedCardData._comp_tier || null,
      _comp_ebay_link: enrichedCardData._comp_ebay_link || null,
      _similar_comps: enrichedCardData._similar_comps || [],
      _conservative_estimate_reasoning: enrichedCardData._conservative_estimate_reasoning || null,
    };

    // Check alerts — fire-and-forget, never block the result
    if (compValue > 0) {
      base44.functions.invoke('checkAlerts', {
        player_name: enrichedCardData.player_name,
        card_set: enrichedCardData.card_set || '',
        grade: enrichedCardData.grade || '',
        variation: enrichedCardData.variation || '',
        last_sold_price: compValue,
      }).then(res => {
        const matches = res?.data?.matches || [];
        matches.forEach(match => {
          toast({
            title: `🔔 Alert Match: ${match.player_name}`,
            description: `Last sold $${compValue.toLocaleString()} ${match.grade ? `· ${match.grade}` : ''} matches your "${match.alert_type.replace(/_/g, ' ')}" alert.`,
          });
        });
      }).catch(() => {});
    }

    setResult(finalResult);
    setIsLoading(false);
    setLoadingPhase(null);
  };

  const handleSave = async () => {
    await base44.entities.CardValuation.create({
      player_name: result.player_name,
      card_year: result.card_year || '',
      card_set: result.card_set || '',
      card_number: result.card_number || '',
      variation: result.variation || '',
      grade: result.grade || '',
      comp_value: result.comp_value || null,
      cheapest_available: result.cheapest_available || null,
      ai_investment_value: result.ai_investment_value || 0,
      overall_score: result.overall_score || 0,
      flip_vs_hold: result.flip_vs_hold || 'hold',
      attribute_scores: result.attribute_scores || {},
      analysis_summary: result.analysis_summary || '',
      in_portfolio: true,
    });

    toast({
      title: "Saved to Portfolio",
      description: `${result.player_name} card has been added to your portfolio.`,
    });
  };

  const handleScanned = (extracted) => {
    // Same flow as URL confirm — go straight to valuation
    handleValuate(extracted);
  };

  const handleReset = () => {
    setResult(null);
    setCardInput(null);
    setShowManualForm(false);
    setScannedData(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground">AI Card Valuation</h1>
        <p className="text-base sm:text-lg text-foreground/80 mt-2">
          Last Sold = what it sold for. AI Value = what it's <em>worth</em>. Serial number, auto type, patch quality, pop report, player thesis — every signal that moves the needle.
        </p>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <ValuationLoadingScreen
          loadingPhase={loadingPhase}
          compFetchResult={compFetchResult}
          cardData={cardInput}
        />
      )}

      {/* Result */}
      {result && !isLoading && (
        <ValuationResult
          result={result}
          onSave={handleSave}
          onReset={handleReset}
        />
      )}

      {/* Input area */}
      {!result && !isLoading && (
        <>
          <PasteUrlInput onCardExtracted={handleValuate} />

          {/* Snap / Upload card image */}
          <div className="my-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-1">Or — Snap / Upload Your Card</p>
            <p className="text-xs text-muted-foreground mb-3">Take a photo or upload a screenshot — AI reads the card, shows condition & eye appeal, then runs the full valuation.</p>
            <CardImageScanner onConfirmed={handleScanned} />
          </div>


        </>
      )}
    </div>
  );
}