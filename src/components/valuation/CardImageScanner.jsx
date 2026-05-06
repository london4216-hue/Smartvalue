import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, X, CheckCircle2, ScanLine, ImagePlus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Runs the same full analysis pipeline as extractCardFromUrl but from an image
async function analyzeCardImage(file) {
  // 1. Upload image
  const { file_url } = await base44.integrations.Core.UploadFile({ file });

  // 2. Extract all card details + condition from the image
  const extraction = await base44.integrations.Core.InvokeLLM({
    prompt: `Sports card image — extract ALL in one pass, return JSON only:
player(required), set, year, parallel, card_number, rookie(bool/null), grade_company(PSA/BGS/SGC/CGC/null), grade_value, serial_number(number only e.g. 45 for /45), has_autograph(bool), auto_type(on_card|sticker|unknown|null), centering(1 sentence), corners(1 sentence), surface(1 sentence), edges(1 sentence), eye_appeal_grade(A/B/C/D), eye_appeal_reasoning(1 sentence).`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        player:           { type: ["string", "null"] },
        set:              { type: ["string", "null"] },
        year:             { type: ["string", "null"] },
        parallel:         { type: ["string", "null"] },
        card_number:      { type: ["string", "null"] },
        rookie:           { type: ["boolean", "null"] },
        grade_company:    { type: ["string", "null"] },
        grade_value:      { type: ["string", "null"] },
        serial_number:    { type: ["string", "null"] },
        has_autograph:    { type: ["boolean", "null"] },
        auto_type:        { type: ["string", "null"] },
        centering:        { type: ["string", "null"] },
        corners:          { type: ["string", "null"] },
        surface:          { type: ["string", "null"] },
        edges:            { type: ["string", "null"] },
        eye_appeal_grade: { type: ["string", "null"] },
        eye_appeal_reasoning: { type: ["string", "null"] },
      }
    },
    model: 'gemini_3_flash',
  });

  if (!extraction?.player) {
    throw new Error("Couldn't identify a card in this image. Try a clearer photo.");
  }

  // Build the same shape as extractCardFromUrl returns
  const gradeStr = extraction.grade_company && extraction.grade_value
    ? `${extraction.grade_company} ${extraction.grade_value}`
    : null;

  const result = {
    player_name: extraction.player,
    card_year: extraction.year || null,
    card_set: extraction.set || null,
    card_number: extraction.card_number || null,
    variation: extraction.parallel || null,
    serial_number: extraction.serial_number || null,
    grade: gradeStr || null,
    is_rookie_year: extraction.rookie || false,
    has_autograph: extraction.has_autograph || false,
    is_sticker_auto: extraction.auto_type === 'sticker',
    _auto_type_uncertain: extraction.auto_type === 'unknown',
    has_patch: false,
    image_url: file_url,
    comp_value: null,
    cheapest_available: null,
    ai_grade_assessment: {
      key_observations: [
        extraction.centering,
        extraction.corners,
        extraction.surface,
        extraction.edges,
      ].filter(Boolean),
    },
    ai_grade_disclosure: 'Eye appeal grade reflects our visual assessment of the card only. We are not a grading company and this is not a professional grade.',
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
  const [awaitingAutoConfirm, setAwaitingAutoConfirm] = useState(false);
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
      // If auto detected but type is uncertain, ask user to confirm before proceeding
      if (result.has_autograph && result._auto_type_uncertain) {
        setAwaitingAutoConfirm(true);
      }
    } catch (err) {
      setError(err.message || "Couldn't identify the card. Try a clearer photo.");
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
    setAwaitingAutoConfirm(false);
  };

  const handleConfirm = () => {
    onConfirmed(extracted);
  };

  const handleWrongCard = () => {
    onConfirmed({ ...extracted, _needs_correction: true });
  };

  const handleAutoTypeSelect = (type) => {
    setExtracted(prev => ({
      ...prev,
      is_sticker_auto: type === 'sticker',
      _auto_type_uncertain: false,
    }));
    setAwaitingAutoConfirm(false);
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
      {/* Upload buttons — only show if no image yet */}
      {!imagePreview && !scanning && (
        <div className="grid grid-cols-2 gap-3">
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
      )}

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-red-500 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Scanning overlay with image preview */}
      {imagePreview && scanning && (
        <div className="relative rounded-xl overflow-hidden border-2 border-primary h-56">
          <img src={imagePreview} alt="Card" className="w-full h-full object-contain bg-secondary/20" />
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-primary/80"
              animate={{ top: ['10%', '90%', '10%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative z-10 text-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm font-mono text-primary font-semibold">AI analyzing card...</p>
              <p className="text-[10px] text-muted-foreground mt-1">Detecting player · condition · grade · centering</p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation card — same UX as PasteUrlInput */}
      <AnimatePresence>
        {extracted && !scanning && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            {/* Card image */}
            {imagePreview && (
              <div className="w-full bg-secondary/30 flex items-center justify-center p-3">
                <img src={imagePreview} alt={cardSummary} className="max-h-64 w-auto object-contain rounded-lg" />
              </div>
            )}

            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                  ✦ AI identified this card — is this correct?
                </p>
                <p className="text-sm font-bold text-foreground leading-snug">{cardSummary}</p>
              </div>

              {/* Auto type confirmation — ask user before proceeding */}
              {awaitingAutoConfirm && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                  <p className="text-xs font-semibold text-amber-600">✍️ We detected an autograph — is it on-card or a sticker auto?</p>
                  <p className="text-[10px] text-amber-600/80">This significantly affects valuation accuracy. Please confirm before we proceed.</p>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => handleAutoTypeSelect('on_card')} className="flex-1 h-8 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10">
                      On-Card Auto
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAutoTypeSelect('sticker')} className="flex-1 h-8 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10">
                      Sticker Auto
                    </Button>
                  </div>
                </div>
              )}

              {/* Condition Assessment */}
              {extracted.ai_grade_assessment && !awaitingAutoConfirm && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                  <p className="font-semibold text-primary text-sm">📐 Visual Assessment</p>

                  {/* Eye appeal grade badge */}
                  {extracted.ai_eye_appeal_grade && (
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "inline-flex items-center justify-center rounded-full w-12 h-12 text-xl font-bold border-2 shrink-0",
                        extracted.ai_eye_appeal_grade === 'A' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
                        extracted.ai_eye_appeal_grade === 'B' ? 'bg-blue-500/10 border-blue-500 text-blue-500' :
                        extracted.ai_eye_appeal_grade === 'C' ? 'bg-amber-500/10 border-amber-500 text-amber-500' :
                        'bg-red-500/10 border-red-500 text-red-500'
                      )}>
                        {extracted.ai_eye_appeal_grade}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Eye Appeal Grade</p>
                        {extracted.eye_appeal_reasoning && (
                          <p className="text-xs text-foreground/80 leading-snug mt-0.5">{extracted.eye_appeal_reasoning}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Key observations */}
                  {extracted.ai_grade_assessment.key_observations?.length > 0 && (
                    <ul className="space-y-1">
                      {extracted.ai_grade_assessment.key_observations.map((obs, i) => (
                        <li key={i} className="text-xs text-foreground/70 flex gap-1.5">
                          <span className="text-primary/50 shrink-0">·</span>
                          {obs}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="text-[9px] text-muted-foreground/60 italic">{extracted.ai_grade_disclosure}</p>
                </div>
              )}

              {/* Actions — only show after auto type is confirmed */}
              {!awaitingAutoConfirm && (
                <>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleConfirm} className="flex-1 h-9 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Yes, run AI valuation
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleWrongCard} className="h-9 text-xs px-3">
                      <X className="w-3 h-3 mr-1" />
                      Wrong — fix it
                    </Button>
                  </div>

                  <button onClick={handleReset} className="w-full text-[10px] text-muted-foreground hover:text-foreground underline text-center">
                    Scan a different card
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}