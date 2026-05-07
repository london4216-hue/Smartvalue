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

// The 12 highest-impact attributes — used for fast valuation
const TOP_ATTRS = [
  'is_rookie_year',
  'print_run_size',
  'is_one_of_one',
  'auto_type',
  'patch_quality',
  'rpa_designation',
  'card_brand_tier',
  'pop_count_at_grade',
  'player_momentum',
  'goat_legacy_score',
  'psa_gem_potential',
  'variation_desirability',
];

function buildPrompt(cardData) {
  const gradeInfo = cardData.grade && GRADE_WEIGHTS[cardData.grade] ? GRADE_WEIGHTS[cardData.grade] : null;
  const serialNum = cardData.serial_number ? parseInt(cardData.serial_number, 10) : null;
  const printRunScore = getPrintRunScore(cardData.serial_number);
  const comp = cardData.comp_value || 0;

  const scanSection = cardData.ai_scan_quality ? `AI Scan: "${cardData.ai_scan_quality}"${cardData.psa_alignment ? ' — PSA 10 POTENTIAL CONFIRMED → +40-60% uplift' : ''}` : '';
  const gradeSection = gradeInfo ? `Grade multiplier: ${gradeInfo.multiplier}× | Pop scarcity: ${(gradeInfo.pop_scarcity_factor*100).toFixed(0)}/100` : '';
  const serialSection = serialNum ? `Serial /${serialNum} → print_run_size=${printRunScore}, is_one_of_one=${serialNum===1?100:0}` : 'Not serialized';
  const similarCompsSection = cardData._comp_tier === 'similar_card_baseline' && cardData._similar_comps?.length > 0
    ? `No direct comp. Baseline from similar cards avg: $${Math.round(cardData._similar_comps.reduce((s,c)=>s+(c.sold_price||0),0)/cardData._similar_comps.length).toLocaleString()}. Apply scarcity premium for /${serialNum}.`
    : '';

  return `NBA CARD VALUATION — ONE PASS, JSON ONLY, NO MARKDOWN.

CARD: ${cardData.player_name} | ${[cardData.card_year, cardData.card_set, cardData.variation, serialNum?`/${serialNum}`:null, cardData.grade].filter(Boolean).join(' · ')}
LAST SOLD (ANCHOR 90%): $${comp || 'UNKNOWN'} — ai_investment_value MUST differ ≥8% from this.
${cardData.cheapest_available ? `CHEAPEST AVAILABLE: $${cardData.cheapest_available} (hard ceiling if below comp unless pop<10)` : ''}
${scanSection}
${gradeSection}
${serialSection}
${similarCompsSection}
${cardData._comp_tier === 'no_comp_conservative_estimate' ? 'NO COMP: use market knowledge, flag uncertainty.' : ''}
SIGNALS: RC=${cardData.is_rookie_year?'YES':'no'} | Set tier=${cardData.card_set||'unknown'} (NT/Flawless=90-100,Prizm/Select=65-85,Base=10-35) | Player=${cardData.player_popularity||'unknown'} | Auto=${cardData.has_autograph?(cardData.is_sticker_auto?'sticker(30-55)':'on-card(85-100)'):'none'} | Patch=${cardData.has_patch?'yes':'none'}${cardData.scan_notes?` | Scan notes: ${cardData.scan_notes}`:''}

SCORE THESE 12 ATTRIBUTES (0-100, -1=N/A):
is_rookie_year, print_run_size, is_one_of_one, auto_type, patch_quality, rpa_designation, card_brand_tier, pop_count_at_grade, player_momentum, goat_legacy_score, psa_gem_potential, variation_desirability

QUICK REFS: patch=logoman100/swoosh88/number82/multi70/white40/none0 | pop_count: 1=100,2-5=93,6-15=85,16-30=75,31-75=64,76-150=50,300+=23,500+=10 | brand: NT=95,Prizm=70,Base=30

ALSO RETURN (folded into same response — use training knowledge only, no web search):
- player_activity: {injury_status, current_season_status, last_game:{date,points,rebounds,assists}, last_10_avg_pts, trend, top_2_news:[{date,headline,impact}]}
- market_signals: 2-3 sections [{emoji,label,as_of,items:[{label,stat,note,trend:up|down|neutral}]}]
- pop_report: {pop_at_grade, total_pop_all_grades, scarcity_assessment:ultra_rare|very_rare|rare|uncommon|common, grader_breakdown:{PSA,BGS,SGC}, highest_grade_achieved, notes, source_confidence:high|medium|low}

RULES: possible_treasure=true only if net>+12% AND 3+ bullish. bust_risk=true only if net<-12% AND multiple red flags.
Disclosure: possible_treasure_text="Our ultra-conservative model identifies X% net upside — possible treasure found if market catches up. Model accuracy improves with more data; treat as one high-signal tool, not gospel." bust_risk_text="Attributes suggest potential bust — consider staying away from last comps. Model accuracy improves with more data; treat as one high-signal tool, not gospel."

RETURN JSON: overall_score, flip_vs_hold(strong_buy|buy|hold|sell|strong_sell), ai_investment_value(≥8% diff from $${comp}), liquidity_score, trader_recommendation, possible_treasure, possible_treasure_text, bust_risk, bust_risk_text, projections:{one_year,three_year,five_year}, analysis_summary(3-4 sentences), key_signals[5-8:{label,direction,impact_pct,reason}], value_drivers[6-8:{label,percent_adjustment,dollar_adjustment,reason}], holders_comp_calculation:{last_sold_comp,grade_multiplier_dollars,top5_dollar_adjustments[],supporting_factors_dollars,final_holders_comp(≥8% diff)}, attribute_scores:{...12 keys}, other_attributes[4-6:{label,direction}], player_activity, market_signals, pop_report`;
}

function buildResponseSchema() {
  const attrProps = {};
  TOP_ATTRS.forEach(key => { attrProps[key] = { type: "number" }; });

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
      projections: { type: "object", properties: { one_year: { type: "string" }, three_year: { type: "string" }, five_year: { type: "string" } } },
      analysis_summary: { type: "string" },
      key_signals: { type: "array", items: { type: "object", properties: { label: { type: "string" }, direction: { type: "string" }, impact_pct: { type: "number" }, reason: { type: "string" } } } },
      value_drivers: { type: "array", items: { type: "object", properties: { label: { type: "string" }, percent_adjustment: { type: "string" }, dollar_adjustment: { type: "string" }, reason: { type: "string" } } } },
      holders_comp_calculation: { type: "object", properties: { last_sold_comp: { type: "string" }, grade_multiplier_dollars: { type: "string" }, top5_dollar_adjustments: { type: "array", items: { type: "string" } }, supporting_factors_dollars: { type: "string" }, final_holders_comp: { type: "string" } } },
      attribute_scores: { type: "object", properties: attrProps },
      other_attributes: { type: "array", items: { type: "object", properties: { label: { type: "string" }, direction: { type: "string" } } } },
      player_activity: {
        type: "object",
        properties: {
          injury_status: { type: "string" },
          current_season_status: { type: "string" },
          last_game: { type: "object", properties: { date: { type: "string" }, points: { type: "number" }, rebounds: { type: "number" }, assists: { type: "number" } } },
          last_10_avg_pts: { type: "number" },
          trend: { type: "string" },
          top_2_news: { type: "array", items: { type: "object", properties: { date: { type: "string" }, headline: { type: "string" }, impact: { type: "string" } } } },
        }
      },
      market_signals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            emoji: { type: "string" },
            label: { type: "string" },
            as_of: { type: "string" },
            items: { type: "array", items: { type: "object", properties: { label: { type: "string" }, stat: { type: "string" }, note: { type: "string" }, trend: { type: "string" } } } }
          }
        }
      },
      pop_report: {
        type: "object",
        properties: {
          pop_at_grade: { type: "number" },
          total_pop_all_grades: { type: "number" },
          scarcity_assessment: { type: "string" },
          grader_breakdown: { type: "object", properties: { PSA: { type: "number" }, BGS: { type: "number" }, SGC: { type: "number" } } },
          highest_grade_achieved: { type: "string" },
          notes: { type: "string" },
          source_confidence: { type: "string" },
        }
      }
    }
  };
}

// Phase 1: Fetch real last-sold comp — fast, no web search, LLM uses training data
async function fetchRealComp(cardData) {
  const { player_name, card_year, card_set, variation, serial_number, grade, has_autograph } = cardData;
  const serialStr = serial_number ? `/${serial_number}` : '';
  const autoNote = has_autograph === false ? 'No autograph — base card only comps.' : '';

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Sports card comp lookup. Use your training knowledge of eBay/PWCC sold prices.

CARD: ${player_name} ${card_year || ''} ${card_set || ''} ${variation || ''} ${serialStr}${grade ? ' · ' + grade : ''}
${autoNote}

Pick best tier: exact_match → adjusted_comp → similar_card_baseline (3 comps) → no_comp_conservative_estimate

Return JSON only: tier, comp_value, cheapest_available, sale_date, confidence (high/medium/low), notes, ebay_link, similar_comps[], conservative_estimate_reasoning`,
    response_json_schema: {
      type: "object",
      properties: {
        tier: { type: "string" },
        comp_value: { type: ["number", "null"] },
        cheapest_available: { type: ["number", "null"] },
        sale_date: { type: "string" },
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
    add_context_from_internet: false,
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
      // Auto-generate scores for only the top 12 impact attributes
      attributeScores = {
        is_rookie_year:        cardData.is_rookie_year ? 88 : 30,
        print_run_size:        getPrintRunScore(cardData.serial_number) ?? 10,
        is_one_of_one:         cardData.serial_number === '1' ? 100 : 0,
        auto_type:             cardData.has_autograph ? (cardData.is_sticker_auto ? 40 : 88) : 0,
        patch_quality:         cardData.has_patch ? 70 : 0,
        rpa_designation:       (cardData.has_autograph && cardData.has_patch) ? 90 : 0,
        card_brand_tier:       cardData.card_set ? 68 : 50,
        pop_count_at_grade:    60,
        player_momentum:       cardData.player_popularity === 'rising' ? 80 : cardData.player_popularity === 'declining' ? 25 : 60,
        goat_legacy_score:     cardData.player_popularity === 'legend' ? 88 : 55,
        psa_gem_potential:     cardData.psa_alignment ? 92 : cardData.ai_scan_quality === 'flawless' ? 78 : 45,
        variation_desirability:cardData.color_matches_team ? 72 : 50,
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
      add_context_from_internet: false,
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
      // Pre-fetched sub-component data — no extra LLM calls needed on result page
      _player_activity: aiResult.player_activity || null,
      _market_signals: aiResult.market_signals || null,
      _pop_report: aiResult.pop_report || null,
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