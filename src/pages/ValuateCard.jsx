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

function buildPrompt(cardData, fast = false) {
  // In fast mode (comp already known), strip verbose notes to massively reduce token count
  const allAttrs = Object.values(ATTRIBUTE_CATEGORIES).flatMap(cat =>
    cat.attributes.map(a => fast
      ? `"${a.key}": (${a.label})`
      : `"${a.key}": (0-100 score — ${a.label}. Context: ${a.note || ''} Weight: ${a.weight})`)
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

  return `NBA CARD VALUATION — ONE-PASS, NO RE-EVALUATION

RULES (follow exactly, no deviation):
1. Comp anchor (90% weight): $${cardData.comp_value || 'UNKNOWN'}. AI Value MUST differ by ≥8%. Never echo comp.
2. One internal pass: score ALL attributes → sum adjustments → compute AI Value. No multi-step loops.
3. possible_treasure=true ONLY if net positive >+12% AND 3+ strong bullish attributes. bust_risk=true ONLY if net negative >-12% AND multiple red flags.
4. Projections: realistic ranges, 1-sentence each.
5. key_signals: 5-8 items, honest mix bullish+bearish, ordered by impact_pct desc.
6. value_drivers: top 6-8 by absolute $ impact, each = comp × percent_adjustment.
7. holders_comp_calculation: show full math, final_holders_comp MUST differ ≥8% from last_sold_comp.

POSSIBLE TREASURE & BUST RISK DISCLOSURE TEXT (use exact wording if triggered):
- possible_treasure_text: "Our ultra-conservative model identifies X% net upside — possible treasure found if market catches up. Model accuracy improves with more data; treat as one high-signal tool, not gospel."
- bust_risk_text: "Attributes suggest potential bust — consider staying away from last comps. Model accuracy improves with more data; treat as one high-signal tool, not gospel."

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

CARD SIGNALS (one-pass scoring — use all simultaneously):
- Rookie: ${cardData.is_rookie_year ? 'YES (+RC premium)' : 'No'}
- Team color match: ${cardData.color_matches_team ? 'YES (+5-10%)' : 'No'}
- Set "${cardData.card_set || 'Unknown'}": NT/Flawless/Exquisite/Immaculate=90-100, Prizm/Select/Optic=65-85, Mosaic=40-60, Base=10-35
- Player: ${cardData.player_popularity || 'unknown'} — rising=+5-10%, peak=neutral/+small, legend=+scarcity, declining=-5-15%
- TV/Doc: ${cardData.has_tv_show && cardData.tv_show_name ? `"${cardData.tv_show_name}" active +5-15%` : 'none'}
- Sneaker: ${cardData.has_sneaker_deal && cardData.sneaker_brand ? `${cardData.sneaker_brand} — Nike/Jordan +3-8%, others +2-5%` : 'none'}
- Viral: ${cardData.recent_viral_moment && cardData.viral_description ? `"${cardData.viral_description}" +5-12% short-term, fades 30-90d` : 'none'}
${scanNotes}
ATTRIBUTE SCORE REFS (score 0-100 or -1 N/A):
- card_brand_tier: NT=90-100, Prizm=60-80, Base=20-40
- set_prestige: vintage=95-100, modern-premium=70-85, base=30-50
- variation_desirability: Silver=60-70, Gold/Color=75-85, /10-=90-100, Superfractor=100
- jersey_number_match: match=90-100, no=0-10
- Serial ${serialNum ? `/${serialNum} — print_run_size MUST=${printRunScore}, is_serialized=100, is_one_of_one=${serialNum===1?'100':'0'}` : 'none — is_serialized=10, print_run_size=10, is_one_of_one=0'}
- low_serial_number: #1=100, #2=95, #3-5=88, #6-10=78, #26+=20
- auto_type: on-card=85-100, sticker=30-55, none=0
- auto_quality: bold-full=80-100, partial=40-65, sticker-scribble=20-40
- patch_quality: logoman=100, swoosh=88, number=82, multi-color=70, white=40, none=0
- rpa_designation: true-RPA=95-100, base=0
- pop_count_at_grade: 1=100, 2-5=92-96, 6-15=82-88, 16-30=72-78, 31-75=60-68, 76-150=45-55, 300+=18-28, 500+=5-15${serialNum ? ` [MAX POP=${serialNum}]` : ''}
- pop_report: <50=90-100, <500=60-70, 2k-10k=20-35, 10k+=5-15
- liquidity: high=<7d avg sell +2-4%, medium=7-30d neutral, low=>30d -2-5%
- Retired player: career_trajectory=-1, injury_risk=-1, goat/hof/cultural/historical=80-100

Score ALL ${allAttrs.length} attributes in one batch:
${allAttrs.join('\n')}

Return JSON with:
- overall_score (0-100)
- flip_vs_hold: strong_buy|buy|hold|sell|strong_sell (strong_buy only if >15% AI premium with strong evidence)
- ai_investment_value (USD, MUST differ from $${cardData.comp_value||0} by ≥8%)
- liquidity_score (high|medium|low + short note)
- trader_recommendation (Good Buy|Grab|Hold|Sell Now + 2 sentences: 30-90d flip vs long-term hold)
- possible_treasure (boolean), possible_treasure_text (empty string if false)
- bust_risk (boolean), bust_risk_text (empty string if false)
- projections: {one_year, three_year, five_year} — string ranges with 1-sentence reasoning each
- analysis_summary (3-4 sentences: comp quality, top 2 drivers, liquidity, recommendation)
- key_signals: 5-8 items [{label, direction:bullish|bearish|neutral, impact_pct:2-20, reason}] ordered by impact_pct desc
- value_drivers: top 6-8 [{label, percent_adjustment:"+X%"|"-X%", dollar_adjustment:"+$X"|"-$X", reason}] — each dollar_adjustment = $${cardData.comp_value||0} × percent
- holders_comp_calculation: {last_sold_comp:"$${cardData.comp_value||0}", grade_multiplier_dollars, top5_dollar_adjustments:[], supporting_factors_dollars, final_holders_comp} — final MUST differ ≥8%`;
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

  const ultraRareNote = isUltraRare ? `
⚠️ ULTRA-RARE CARD — THIS IS A ${isOneOfOne ? '1/1 (ONE OF ONE)' : `/${serial_number}`} CARD.
There may be ZERO direct comps for this exact card. Follow the ESCALATING COMP STRATEGY below.
` : '';

  const autoFilter = has_autograph === false
    ? 'CRITICAL: This card has NO autograph. Only use comparable cards that also have NO autograph. Do NOT use RPAs, auto patches, or signed cards as comps — autographs add 30-200%+ premium and would distort the baseline.'
    : 'This card has an autograph. Prefer autograph comps when available.';

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Find the most recent REAL sold price for this sports card. Search eBay sold listings, 130point, PWCC, Goldin.

${ultraRareNote}CARD: ${player_name} ${card_year || ''} ${card_set || ''} ${variation || ''} ${serialStr}${grade ? ' · ' + grade : ''}
${autoFilter}

TIERS (use first that works):
T1 exact match → tier="exact_match"
T2 adj grade/serial → tier="adjusted_comp"
T3 3 similar cards as baseline → tier="similar_card_baseline", fill similar_comps
T4 no data → tier="no_comp_conservative_estimate"

Return JSON: tier, comp_value, cheapest_available, sale_date, confidence, notes, ebay_link, similar_comps, conservative_estimate_reasoning`,
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
    model: 'gemini_3_flash',
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
          enrichedCardData = {
            ...enrichedCardData,
            _comp_tier: compData.tier || 'no_comp_conservative_estimate',
            _comp_notes: compData.notes || '',
            _similar_comps: compData.similar_comps || [],
            _conservative_estimate_reasoning: compData.conservative_estimate_reasoning || null,
          };
        }
      } catch {
        // Phase 1 failed silently — proceed to valuation anyway
      }
    } else {
      // Comp already provided by user — skip Phase 1 entirely
      enrichedCardData._comp_confidence = 'user_provided';
    }

    // ── PHASE 2: Full valuation ──────────────────────────────────────────────
    setLoadingPhase('valuing');

    const compValue = parseFloat(enrichedCardData.comp_value) || 0;

    // Fast mode: comp is known, skip web search, use smaller prompt + faster model
    const fastMode = compValue > 0;
    const prompt = buildPrompt(enrichedCardData, fastMode);
    const schema = buildResponseSchema();

    // IRONCLAD: AI value MUST differ from comp by at least 8%. No exceptions.
    // (defined here so it's available in parallel closures)
    let netSignalPct = 0;
    const enforceMinDiff = (aiVal, comp) => {
      if (!comp || comp <= 0) return aiVal > 0 ? Math.round(aiVal) : 0;
      const candidate = Math.round(aiVal);
      const diffPct = Math.abs((candidate - comp) / comp) * 100;
      if (diffPct < 8) {
        return netSignalPct < 0 ? Math.round(comp * 0.92) : Math.round(comp * 1.08);
      }
      return candidate;
    };

    // Run LLM valuation — single pass, no follow-up calls
    let aiResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: !fastMode,
      model: 'gemini_3_flash',
    });

    // Ensure non-zero adjustments
    aiResult = ensureNonZeroAdjustments(aiResult, enrichedCardData);

    const signals = aiResult.key_signals || [];
    netSignalPct = signals.reduce((sum, sig) => {
      const pct = sig.impact_pct || 0;
      return sum + (sig.direction === 'bullish' ? pct : sig.direction === 'bearish' ? -pct : 0);
    }, 0);

    let finalAiValue = enforceMinDiff(parseFloat(aiResult.ai_investment_value) || 0, compValue);
    // Use value_drivers and holders_comp_calculation directly from the LLM — no extra backend call needed
    const backendCalc = aiResult.holders_comp_calculation || null;

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
      holders_comp_calculation: backendCalc,
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