import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ImagePlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CardConfirmQuestions from './CardConfirmQuestions';

// Runs the same full analysis pipeline as extractCardFromUrl but from an image
async function analyzeCardImage(file) {
  // 1. Upload image
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  // 2. Extract all card details + condition from the image
  const extraction = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a sports card expert grader. Analyze this card image and return JSON only (no markdown).

CARD IDENTIFICATION: player(required), set, year, parallel, card_number, rookie(bool/null), grade_company(PSA/BGS/SGC/CGC/null), grade_value, serial_number(number only e.g. 45 for /45), has_autograph(bool), auto_type(on_card|sticker|unknown|null)

CERT NUMBER (CRITICAL): Look carefully on the PSA/BGS/SGC label for the certification number.
- PSA cert: usually 8-9 digits printed on the label (e.g. "12345678" or "123456789")
- BGS cert: usually 7-9 digits on the Beckett label
- cert_number: extract ONLY the numeric cert/certification number, null if not visible

GRADING ASSESSMENT — score each of the 4 PSA/BGS grading categories on a 1–10 scale:
- centering_score: 1-10 (10=perfectly centered, 5=moderate off-center, 1=severely miscut)
- centering_note: 1 short sentence describing what you see
- corners_score: 1-10 (10=razor sharp, 5=light wear, 1=heavy fraying)
- corners_note: 1 short sentence
- surface_score: 1-10 (10=pristine gloss/no marks, 5=minor scratches, 1=heavy damage)
- surface_note: 1 short sentence
- edges_score: 1-10 (10=clean/sharp, 5=minor nicks, 1=heavy chips)
- edges_note: 1 short sentence

OVERALL: eye_appeal_grade(A/B/C/D — A=gem mint, B=excellent, C=good, D=poor), eye_appeal_reasoning(1-2 sentences explaining the overall visual assessment and any PSA potential)`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        player:              { type: ["string", "null"] },
        set:                 { type: ["string", "null"] },
        year:                { type: ["string", "null"] },
        parallel:            { type: ["string", "null"] },
        card_number:         { type: ["string", "null"] },
        rookie:              { type: ["boolean", "null"] },
        grade_company:       { type: ["string", "null"] },
        grade_value:         { type: ["string", "null"] },
        serial_number:       { type: ["string", "null"] },
        has_autograph:       { type: ["boolean", "null"] },
        auto_type:           { type: ["string", "null"] },
        cert_number:         { type: ["string", "null"] },
        centering_score:     { type: ["number", "null"] },
        centering_note:      { type: ["string", "null"] },
        corners_score:       { type: ["number", "null"] },
        corners_note:        { type: ["string", "null"] },
        surface_score:       { type: ["number", "null"] },
        surface_note:        { type: ["string", "null"] },
        edges_score:         { type: ["number", "null"] },
        edges_note:          { type: ["string", "null"] },
        eye_appeal_grade:    { type: ["string", "null"] },
        eye_appeal_reasoning:{ type: ["string", "null"] },
      }
    },
    model: 'gemini_3_flash',
  });

  if (!extraction?.player && !extraction?.cert_number) {
    throw new Error("Couldn't identify a card in this image. Try a clearer photo.");
  }

  // If we got a cert number, look it up for accurate card data + pop
  let certData = null;
  if (extraction.cert_number) {
    try {
      const certResp = await base44.functions.invoke('lookupCertNumber', {
        cert_number: extraction.cert_number,
        grader: extraction.grade_company || null,
      });
      if (certResp?.data && !certResp.data.error) {
        certData = certResp.data;
      }
    } catch (_) {}
  }

  // Build the same shape as extractCardFromUrl returns
  const gradeStr = (certData?.grade) ||
    (extraction.grade_company && extraction.grade_value
      ? `${extraction.grade_company} ${extraction.grade_value}`
      : null);

  const result = {
    player_name: certData?.player_name || extraction.player,
    card_year: certData?.card_year || extraction.year || null,
    card_set: certData?.card_set || extraction.set || null,
    card_number: certData?.card_number || extraction.card_number || null,
    variation: certData?.variation || extraction.parallel || null,
    serial_number: certData?.serial_number || extraction.serial_number || null,
    grade: gradeStr || null,
    is_rookie_year: extraction.rookie || false,
    has_autograph: extraction.has_autograph || false,
    is_sticker_auto: extraction.auto_type === 'sticker',
    _auto_type_uncertain: extraction.auto_type === 'unknown',
    has_patch: false,
    image_url: file_url,
    cert_number: extraction.cert_number || null,
    cert_source: certData?.source || null,
    cert_url: certData?.cert_url || null,
    comp_value: null,
    cheapest_available: null,
    ai_grade_assessment: {
      centering_score: extraction.centering_score || null,
      centering_note:  extraction.centering_note  || null,
      corners_score:   extraction.corners_score   || null,
      corners_note:    extraction.corners_note    || null,
      surface_score:   extraction.surface_score   || null,
      surface_note:    extraction.surface_note    || null,
      edges_score:     extraction.edges_score     || null,
      edges_note:      extraction.edges_note      || null,
    },
    ai_grade_disclosure: 'Eye appeal grade reflects our visual assessment only. We are not a grading company — this is NOT a professional grade. Actual PSA/BGS/SGC results may differ significantly.',
    ai_eye_appeal_grade: extraction.eye_appeal_grade || null,
    eye_appeal_reasoning: extraction.eye_appeal_reasoning || null,
  };

  return result;
}

export default function CardImageScanner({ onConfirmed }) {
  const [dragging, setDragging]         = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [extracted, setExtracted]       = useState(null);
  const [error, setError]               = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setError('');
    setExtracted(null);

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setScanning(true);
    try {
      const result = await analyzeCardImage(file);
      setExtracted(result);
    } catch (err) {
      const isNetwork = err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch');
      setError(isNetwork
        ? "Network error — check your connection and tap 'Try again' below."
        : (err.message || "Couldn't identify the card. Try a clearer photo."));
      setImagePreview(null);
    } finally {
      setScanning(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleReset = () => {
    setImagePreview(null);
    setExtracted(null);
    setError('');
    setScanning(false);
  };

  const handleConfirm = (finalData) => {
    onConfirmed(finalData);
  };

  const handleWrongCard = () => {
    handleReset();
  };

  const cardSummary = extracted ? [
    extracted.player_name,
    extracted.card_year,
    extracted.card_set,
    extracted.variation,
    extracted.serial_number ? `/${extracted.serial_number}` : null,
    extracted.grade,
  ].filter(Boolean).join(' · ') : '';

  return (
    <div className="space-y-3">
      {/* Upload buttons — hidden via CSS when image selected, never unmounted */}
      <div
        className={cn("grid grid-cols-2 gap-3", (imagePreview || scanning) && "hidden")}
        style={{ willChange: 'opacity' }}
      >
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 transition-all text-primary"
        >
          <Camera className="w-7 h-7" />
          <span className="text-xs font-semibold">Take Photo</span>
          <span className="text-[10px] text-primary/60">Use your camera</span>
        </button>

        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed transition-all",
            dragging
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground"
          )}
        >
          <ImagePlus className="w-7 h-7" />
          <span className="text-xs font-semibold">Upload Screenshot</span>
          <span className="text-[10px] text-muted-foreground/60">From camera roll or desktop</span>
        </button>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => processFile(e.target.files[0])} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-red-500 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => { setError(''); }}
              className="mt-1.5 text-[10px] font-semibold underline text-red-400 hover:text-red-600"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Optimistic skeleton — shown instantly as soon as image is selected, before AI returns */}
      {imagePreview && scanning && (
        <div className="rounded-xl overflow-hidden border-2 border-primary/60" style={{ willChange: 'opacity' }}>
          {/* Real image shows immediately — no blank box */}
          <div className="relative h-56 bg-secondary/20">
            <img src={imagePreview} alt="Card" loading="eager" className="w-full h-full object-contain" />
            {/* Scan line overlay — CSS animation only */}
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <div className="scan-line" />
              <div className="relative z-10 text-center">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm font-mono text-primary font-semibold">AI analyzing card<span className="step-dots" /></p>
                <p className="text-[10px] text-muted-foreground mt-1">Detecting player · condition · grade · centering</p>
              </div>
            </div>
          </div>
          {/* Skeleton shimmer rows below image */}
          <div className="p-4 space-y-2 bg-card">
            <div className="h-3 w-2/3 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-secondary animate-pulse" />
          </div>
        </div>
      )}

      {/* Confirmation — 3 critical questions */}
      <AnimatePresence>
        {extracted && !scanning && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <CardConfirmQuestions
              extracted={extracted}
              imagePreview={imagePreview}
              cardSummary={cardSummary}
              onConfirm={handleConfirm}
              onWrongCard={handleWrongCard}
            />
            <button onClick={handleReset} className="w-full mt-2 text-[10px] text-muted-foreground hover:text-foreground underline text-center">
              Scan a different card
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}