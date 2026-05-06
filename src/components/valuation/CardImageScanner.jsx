import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, X, CheckCircle2, ScanLine, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CardImageScanner({ onExtracted }) {
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setScanning(true);
    setDone(false);

    // Upload image
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Ask AI to extract card details from the image
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a basketball card expert. Analyze this card image and extract every detail you can see.

Extract the following fields (leave blank string if not visible/readable):
- player_name: Full player name
- card_year: Year the card was produced (4 digits)
- card_set: Card set name (e.g. Prizm, Optic, National Treasures, Select, Mosaic, Fleer, etc.)
- card_number: Card number shown on card (e.g. #23)
- variation: Color/variation (e.g. Silver, Gold, Base, Holo, RPA, Auto, etc.)
- grade: Grade if visible (e.g. PSA 10, BGS 9.5, SGC 10, or "Raw (Ungraded)" if no slab)
- scan_notes: Any notable observations about the card condition, centering, surface, corners that you can see

Be as specific as possible. If you see a PSA/BGS/SGC slab, note the exact grade shown on the label.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          player_name:  { type: "string" },
          card_year:    { type: "string" },
          card_set:     { type: "string" },
          card_number:  { type: "string" },
          variation:    { type: "string" },
          grade:        { type: "string" },
          scan_notes:   { type: "string" },
        }
      }
    });

    setScanning(false);
    setDone(true);
    onExtracted({ ...result, image_url: file_url });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleFileInput = (e) => {
    processFile(e.target.files[0]);
  };

  const handleReset = () => {
    setImagePreview(null);
    setDone(false);
    setScanning(false);
  };

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-wider text-primary">AI Card Scanner</span>
        <span className="text-[10px] text-muted-foreground ml-auto">Snap or upload · AI auto-fills all fields</span>
      </div>

      {!imagePreview ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Camera — opens camera directly on mobile */}
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 transition-all text-primary"
          >
            <Camera className="w-7 h-7" />
            <span className="text-xs font-semibold">Take Photo</span>
            <span className="text-[10px] text-primary/60">Use your camera</span>
          </button>

          {/* Gallery / file upload */}
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

          {/* Hidden inputs */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileInput} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
        </div>
      ) : (
        <div
          className={cn(
            "relative border-2 border-dashed rounded-xl overflow-hidden transition-all",
            scanning ? "border-primary" : done ? "border-emerald-500" : "border-border/50",
            "h-48"
          )}
        >
          <img src={imagePreview} alt="Card" className="w-full h-full object-contain bg-secondary/20" />

          <AnimatePresence>
            {scanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
              >
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-primary/80"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative z-10 text-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-1" />
                  <p className="text-xs font-mono text-primary">AI scanning card...</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Detecting player, set, grade & more</p>
                </div>
              </motion.div>
            )}
            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <p className="text-sm font-semibold text-emerald-400">Card identified!</p>
                <p className="text-[10px] text-emerald-300/70">Fields auto-filled below</p>
              </motion.div>
            )}
          </AnimatePresence>

          {!scanning && (
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 flex items-center justify-center hover:bg-background transition-colors shadow"
            >
              <X className="w-3.5 h-3.5 text-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}