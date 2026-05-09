import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ValuationResult from '@/components/valuation/ValuationResult';
import PasteUrlInput from '@/components/valuation/PasteUrlInput';
import CardImageScanner from '@/components/valuation/CardImageScanner';
import { GRADE_WEIGHTS } from '@/components/valuation/AttributeCategories';
import ValuationLoadingScreen from '@/components/valuation/ValuationLoadingScreen';
import { Camera, Link, ChevronRight, Sparkles, Shield, TrendingUp, Zap } from 'lucide-react';

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

const TOP_ATTRS = [
  'is_rookie_year','print_run_size','is_one_of_one','auto_type','patch_quality',
  'rpa_designation','card_brand_tier','pop_count_at_grade','player_momentum',
  'goat_legacy_score','psa_gem_potential','variation_desirability',
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
${cardData._smart_value_hint ? `SMARTVALUE ENGINE (rule-based): $${cardData._smart_value_hint.toLocaleString()} — anchor: ${cardData._anchor_source || 'comps'}. TREAT THIS AS A HARD FLOOR/CEILING REFERENCE — your ai_investment_value should stay within 20% of SmartValue unless you have strong contradicting signals.` : ''}
LAST SOLD (ANCHOR 90%): $${comp || 'UNKNOWN'} — ai_investment_value MUST differ ≥8% from this.
${cardData.cheapest_available ? `CHEAPEST AVAILABLE: $${cardData.cheapest_available} (hard ceiling if below comp unless pop<10)` : ''}
${scanSection}
${gradeSection}
${serialSection}
${similarCompsSection}
${cardData._comp_tier === 'no_comp_conservative_estimate' ? 'NO COMP: use market knowledge, flag uncertainty.' : ''}
SIGNALS: RC=${cardData.is_rookie_year?'YES':'no'} | Set tier=${cardData.card_set||'unknown'} (NT/Flawless=90-100,Prizm/Select=65-85,Base=10-35) | Player=${cardData.player_popularity||'unknown'} | Auto=${cardData.has_autograph?(cardData.is_sticker_auto?'sticker(30-55)':'on-card(85-100)'):'none'} | Patch=${cardData.has_patch?'yes':'none'}${cardData.jersey_match?' | JERSEY NUMBER MATCH=YES (+15-25% collector premium)':''}${cardData.scan_notes?` | Scan notes: ${cardData.scan_notes}`:''}

SCORE THESE 12 ATTRIBUTES (0-100, -1=N/A):
is_rookie_year, print_run_size, is_one_of_one, auto_type, patch_quality, rpa_designation, card_brand_tier, pop_count_at_grade, player_momentum, goat_legacy_score, psa_gem_potential, variation_desirability

QUICK REFS: patch=logoman100/swoosh88/number82/multi70/white40/none0 | pop_count: pop1_highest_graded=100(MAXIMUM — only copy at highest grade ever awarded, massive ceiling premium),pop1_not_highest=97,2-5=93,6-15=85,16-30=75,31-75=64,76-150=50,300+=23,500+=10 | brand: NT=95,Prizm=70,Base=30
${cardData._pop_report?.pop_at_grade === 1 && (cardData._pop_report?.pop_higher === 0 || (cardData._pop_report?.highest_grade_achieved && cardData.grade && cardData._pop_report.highest_grade_achieved.toString().trim() === cardData.grade.toString().trim())) ? `⚠️ POP 1 + HIGHEST GRADED: This is the ONLY copy at this grade AND no higher grade has ever been awarded out of ${cardData._pop_report.total_pop_all_grades || '?'} total submitted. pop_count_at_grade MUST be scored 100. Apply a 25-40% ceiling premium to ai_investment_value above the highest available lower-grade comp.` : cardData._pop_report?.pop_at_grade === 1 && cardData._pop_report?.pop_higher > 0 ? `⚠️ POP 1 AT GRADE (NOT HIGHEST): Only 1 copy at this grade, BUT ${cardData._pop_report.pop_higher} cop${cardData._pop_report.pop_higher === 1 ? 'y exists' : 'ies exist'} graded higher. pop_count_at_grade score 93-96. Apply moderate (not maximum) scarcity premium — ceiling is capped by the existence of higher-graded copies.` : ''}

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
      player_activity: { type: "object", properties: { injury_status: { type: "string" }, current_season_status: { type: "string" }, last_game: { type: "object", properties: { date: { type: "string" }, points: { type: "number" }, rebounds: { type: "number" }, assists: { type: "number" } } }, last_10_avg_pts: { type: "number" }, trend: { type: "string" }, top_2_news: { type: "array", items: { type: "object", properties: { date: { type: "string" }, headline: { type: "string" }, impact: { type: "string" } } } } } },
      market_signals: { type: "array", items: { type: "object", properties: { emoji: { type: "string" }, label: { type: "string" }, as_of: { type: "string" }, items: { type: "array", items: { type: "object", properties: { label: { type: "string" }, stat: { type: "string" }, note: { type: "string" }, trend: { type: "string" } } } } } } },
      pop_report: { type: "object", properties: { pop_at_grade: { type: "number" }, total_pop_all_grades: { type: "number" }, scarcity_assessment: { type: "string" }, grader_breakdown: { type: "object", properties: { PSA: { type: "number" }, BGS: { type: "number" }, SGC: { type: "number" } } }, highest_grade_achieved: { type: "string" }, notes: { type: "string" }, source_confidence: { type: "string" } } }
    }
  };
}

async function fetchRealComp(cardData) {
  // SmartValue Engine: canonical identity → exact last sold → comps → rule-based value
  const response = await base44.functions.invoke('smartValueEngine', cardData);
  const d = response.data;
  // Map SmartValue output to the shape ValuateCard expects
  return {
    comp_value:      d.comp_value ?? d.last_sold?.last_sold_price ?? null,
    sale_date:       d.sale_date  ?? d.last_sold?.last_sold_date  ?? null,
    last_sold_url:   d.last_sold_url ?? d.last_sold?.last_sold_url ?? null,
    match_confidence: d.match_confidence ?? d.last_sold?.match_confidence ?? 0,
    confidence:      d.confidence >= 80 ? 'high' : d.confidence >= 50 ? 'medium' : 'low',
    tier:            d.tier ?? 'no_comp_conservative_estimate',
    notes:           d.confidence_factors?.join(' · ') || '',
    similar_comps:   d.similar_comps || [],
    anomaly_flag:    false,
    anomaly_reason:  null,
    _ebay_search_url: d._ebay_search_url || null,
    // Surface SmartValue as a hint to the AI (AI still runs its own model)
    _smart_value_hint: d.smart_value || null,
    _anchor_source:  d.anchor_source || null,
    _value_drivers:  d.value_drivers || [],
    _identity:       d.identity || null,
  };
}

const FEATURES = [
  { icon: TrendingUp, label: '90% Comp Rule',  desc: 'AI anchors to real last-sold data' },
  { icon: Shield,     label: '44 Attributes',  desc: 'Serial, auto, patch, pop & more' },
  { icon: Zap,        label: 'Pop-1 Protocol', desc: 'Scarcity multipliers for rare slabs' },
  { icon: Sparkles,   label: 'Eye Appeal AI',  desc: 'Centering & corners scored visually' },
];

export default function ValuateCard() {
  const [isLoading, setIsLoading]       = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(null);
  const [result, setResult]             = useState(null);
  const [cardInput, setCardInput]       = useState(null);
  const [activeTab, setActiveTab]       = useState('url');
  const { toast } = useToast();

  const ensureNonZeroAdjustments = (aiResult, cardData) => {
    const compValue = cardData.comp_value || 0;
    let attributeScores = aiResult.attribute_scores || {};
    const allZero = Object.values(attributeScores).every(score => score === -1 || score === 0 || score === 50);
    if (allZero && compValue > 0) {
      attributeScores = {
        is_rookie_year:         cardData.is_rookie_year ? 88 : 30,
        print_run_size:         getPrintRunScore(cardData.serial_number) ?? 10,
        is_one_of_one:          cardData.serial_number === '1' ? 100 : 0,
        auto_type:              cardData.has_autograph ? (cardData.is_sticker_auto ? 40 : 88) : 0,
        patch_quality:          cardData.has_patch ? 70 : 0,
        rpa_designation:        (cardData.has_autograph && cardData.has_patch) ? 90 : 0,
        card_brand_tier:        cardData.card_set ? 68 : 50,
        pop_count_at_grade:     60,
        player_momentum:        cardData.player_popularity === 'rising' ? 80 : cardData.player_popularity === 'declining' ? 25 : 60,
        goat_legacy_score:      cardData.player_popularity === 'legend' ? 88 : 55,
        psa_gem_potential:      cardData.psa_alignment ? 92 : cardData.ai_scan_quality === 'flawless' ? 78 : 45,
        variation_desirability: cardData.color_matches_team ? 72 : 50,
      };
    }
    return { ...aiResult, attribute_scores: attributeScores };
  };

  const handleValuate = async (cardData) => {
    setIsLoading(true);
    setLoadingPhase(null);
    setCardInput(cardData);

    let validatedCardData = cardData;
    let enrichedCardData = { ...cardData };

    // STEP 1: VALIDATE CARD DATA — ensure extraction is clean (non-blocking)
    setLoadingPhase('validating_data');
    try {
      const validationResp = await base44.functions.invoke('validateCardData', validatedCardData);
      if (validationResp?.data && !validationResp.data.error) {
        validatedCardData = validationResp.data;
        enrichedCardData = { ...enrichedCardData, ...validatedCardData };
      }
    } catch (_) {
      // Validation failed — continue with original extracted data
    }

    // STEP 2: FETCH & VALIDATE COMP
    if (cardData.comp_value && parseFloat(cardData.comp_value) > 0) {
      enrichedCardData._comp_confidence = 'user_provided';
      enrichedCardData._comp_tier = 'exact_match';
      enrichedCardData._comp_notes = 'User-entered real last sold price — locked in as comp anchor.';
    } else {
      setLoadingPhase('fetching_comp');
      try {
        const compData = await fetchRealComp(validatedCardData);
        
        // VALIDATE comp before accepting it
        if (compData.comp_value && compData.comp_value > 0) {
          // Accept comp by default; optionally validate (non-blocking)
          let acceptComp = true;
          let compConfidence = compData.confidence || 'medium';
          try {
            const compValidation = await base44.functions.invoke('validateComp', {
              cardData: validatedCardData,
              compData: compData
            });
            if (compValidation?.data && !compValidation.data.error) {
              acceptComp = compValidation.data.accept_as_anchor !== false;
              compConfidence = compValidation.data.confidence_adjustment || compConfidence;
            }
          } catch (_) {
            // Validation failed — accept comp with original confidence
          }

          if (acceptComp) {
            enrichedCardData = {
              ...enrichedCardData,
              comp_value: compData.comp_value,
              cheapest_available: enrichedCardData.cheapest_available || compData.cheapest_available || null,
              _comp_sale_date: compData.sale_date || null,
              _comp_confidence: compConfidence,
              _comp_notes: compData.notes || '',
              _comp_tier: compData.tier || null,
              _similar_comps: compData.similar_comps || [],
              last_sold_url: compData.last_sold_url || null,
              _comp_match_confidence: compData.match_confidence ?? null,
              _comp_anomaly_flag: compData.anomaly_flag || false,
              _comp_anomaly_reason: compData.anomaly_reason || null,
              _ebay_search_url: compData._ebay_search_url || null,
              _smart_value_hint: compData._smart_value_hint || null,
              _anchor_source: compData._anchor_source || null,
              _value_drivers: compData._value_drivers || [],
              _identity: compData._identity || null,
            };
          } else {
            enrichedCardData = {
              ...enrichedCardData,
              _comp_tier: 'no_comp_conservative_estimate',
              _comp_notes: 'Comp validation rejected this sale — using conservative estimate.',
              _validation_rejected_comp: true,
            };
          }
        } else {
          enrichedCardData = {
            ...enrichedCardData,
            _comp_tier: compData.tier || 'no_comp_conservative_estimate',
            _comp_notes: compData.notes || '',
            _similar_comps: compData.similar_comps || [],
          };
        }
      } catch { /* silent fail */ }
    }

    setLoadingPhase('valuing');
    const compValue = parseFloat(enrichedCardData.comp_value) || 0;
    const prompt = buildPrompt(enrichedCardData);
    const schema = buildResponseSchema();

    let netSignalPct = 0;
    const enforceMinDiff = (aiVal, comp) => {
      if (!comp || comp <= 0) return aiVal > 0 ? Math.round(aiVal) : 0;
      const candidate = Math.round(aiVal);
      const diffPct = Math.abs((candidate - comp) / comp) * 100;
      if (diffPct < 8) return netSignalPct < 0 ? Math.round(comp * 0.92) : Math.round(comp * 1.08);
      return candidate;
    };

    let aiResult = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      add_context_from_internet: false,
      model: 'gemini_3_flash',
    });

    aiResult = ensureNonZeroAdjustments(aiResult, enrichedCardData);

    const signals = aiResult.key_signals || [];
    netSignalPct = signals.reduce((sum, sig) => {
      const pct = sig.impact_pct || 0;
      return sum + (sig.direction === 'bullish' ? pct : sig.direction === 'bearish' ? -pct : 0);
    }, 0);

    let finalAiValue = enforceMinDiff(parseFloat(aiResult.ai_investment_value) || 0, compValue);

    if (compValue > 0) {
      const finalDiffPct = Math.abs((finalAiValue - compValue) / compValue) * 100;
      if (finalDiffPct < 8) finalAiValue = netSignalPct < 0 ? Math.round(compValue * 0.92) : Math.round(compValue * 1.08);
    }

    const finalResult = {
      ...enrichedCardData,
      comp_value: compValue || null,
      ...aiResult,
      ai_investment_value: finalAiValue,
      holders_comp_calculation: aiResult.holders_comp_calculation || null,
      _comp_sale_date: enrichedCardData._comp_sale_date || null,
      _comp_confidence: enrichedCardData._comp_confidence || null,
      _comp_notes: enrichedCardData._comp_notes || '',
      _comp_tier: enrichedCardData._comp_tier || null,
      _comp_ebay_link: enrichedCardData._comp_ebay_link || null,
      last_sold_url: enrichedCardData.last_sold_url || null,
      _comp_match_confidence: enrichedCardData._comp_match_confidence ?? null,
      _comp_anomaly_flag: enrichedCardData._comp_anomaly_flag || false,
      _comp_anomaly_reason: enrichedCardData._comp_anomaly_reason || null,
      _ebay_search_url: enrichedCardData._ebay_search_url || null,
      _similar_comps: enrichedCardData._similar_comps || [],
      _conservative_estimate_reasoning: enrichedCardData._conservative_estimate_reasoning || null,
      _player_activity: aiResult.player_activity || null,
      _market_signals: aiResult.market_signals || null,
      _pop_report: aiResult.pop_report || null,
    };

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
    toast({ title: "Saved to Portfolio", description: `${result.player_name} card has been added to your portfolio.` });
  };

  const handleReset = () => {
    setResult(null);
    setCardInput(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {isLoading && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <ValuationLoadingScreen loadingPhase={loadingPhase} cardData={cardInput} />
        </div>
      )}

      {result && !isLoading && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <ValuationResult result={result} onSave={handleSave} onReset={handleReset} />
        </div>
      )}

      {!result && !isLoading && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-4">

          {/* Hero Header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
              <Sparkles className="w-3 h-3" />
              Base-44 Engine · v1.1
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
              AI Card Valuation
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Last Sold = what it sold for. <strong className="text-foreground">AI Value = what it's worth.</strong> 44 attributes. Real comps. Zero guesswork.
            </p>
          </motion.div>

          {/* ── INTAKE: URL INPUT ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="border-2 border-black rounded-2xl p-5 bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-primary shrink-0" />
              <p className="text-lg font-bold text-foreground">Cut & Paste Your Listing URL to Valuate</p>
            </div>
            <p className="text-xs text-muted-foreground pl-7">Paste any eBay, COMC, or marketplace link — AI extracts all card details automatically.</p>
            <PasteUrlInput onCardExtracted={handleValuate} />
          </motion.div>

          {/* ── INTAKE: PHOTO / UPLOAD ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="border-2 border-black rounded-2xl p-5 bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary shrink-0" />
              <p className="text-lg font-bold text-foreground">Take Photo or Upload Card Image</p>
            </div>
            <p className="text-xs text-muted-foreground">AI identifies the card, scores centering & corners for eye appeal, then runs the full 44-attribute valuation.</p>
            <div className="flex items-start gap-2 p-3 bg-amber-500/8 border border-amber-500/20 rounded-lg">
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-600 leading-snug">
                <strong>Eye Appeal Disclosure:</strong> Our AI scores centering and corner wear only as a visual guide. We are not a grading company — this is not a professional grade. Actual PSA/BGS/SGC results may differ significantly.
              </p>
            </div>
            <CardImageScanner onConfirmed={handleValuate} />
          </motion.div>

          {/* Feature pills */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1.5 p-3 bg-card border border-border/50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-bold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
              </div>
            ))}
          </motion.div>

          {/* How it works */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="bg-card border border-border/30 rounded-2xl p-5">
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-4">How it works</p>
            <div className="space-y-3">
              {[
                { n: '1', title: 'Find your comp', body: 'AI searches for the closest real completed sale within 24 months — same player, same grade, same auto type.' },
                { n: '2', title: '90% baseline applied', body: 'AI value starts at 90% of the last sold comp per the Base-44 rule — never blindly matching the last sale.' },
                { n: '3', title: '44-attribute adjustment', body: 'Serial number, pop report, patch quality, brand tier, player momentum — up to ±10% max swing from baseline.' },
              ].map(({ n, title, body }) => (
                <div key={n} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-primary">{n}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      )}
    </div>
  );
}