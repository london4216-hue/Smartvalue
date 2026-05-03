import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, Sparkles, X, CheckCircle2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ScanLine className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono uppercase tracking-wider text-primary">AI Card Scanner</span>
        <span className="text-[10px] text-muted-foreground ml-auto">Upload card image to auto-fill</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all overflow-hidden",
          dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/40",
          imagePreview ? "h-36" : "h-28"
        )}
      >
        {imagePreview ? (
          <>
            <img
              src={imagePreview}
              alt="Card"
              className="w-full h-full object-contain bg-secondary/20"
            />
            {/* Scan overlay */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                >
                  {/* Scanning line animation */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-primary/80 shadow-[0_0_8px_hsl(43,96%,56%)]"
                    animate={{ top: ['10%', '90%', '10%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="relative z-10 text-center">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-1" />
                    <p className="text-xs font-mono text-primary">Scanning card...</p>
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
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  <p className="text-xs font-mono text-emerald-400">Fields populated!</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!scanning && (
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5" />
              <span className="text-sm">Drop card image or click to upload</span>
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/60">
              AI will auto-detect player, set, grade, variation
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </div>
  );
}