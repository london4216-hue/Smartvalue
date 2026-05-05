import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const IMPORTANCE_CONFIG = {
  high: { bg: 'bg-primary/10 border-primary/20', text: 'text-primary', badge: 'High Impact' },
  medium: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', badge: 'Moderate' },
  low: { bg: 'bg-muted/50 border-muted/30', text: 'text-muted-foreground', badge: 'Minor' }
};

export default function AttributeImpactView({ categories, imageUrl, eyeAppealGrade, eyeAppealReasoning, aiGradeAssessment }) {
  if (!categories || categories.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Card Image & Eye Appeal Grade */}
      {(imageUrl || eyeAppealGrade) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border/50 rounded-xl p-5 space-y-4"
        >
          {/* Image */}
          {imageUrl && (
            <div className="w-full bg-secondary/30 flex items-center justify-center p-4 rounded-lg">
              <img
                src={imageUrl}
                alt="Card"
                className="max-h-64 w-auto object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Eye Appeal Grade & Reasoning */}
          <div className="space-y-3">
            {eyeAppealGrade && (
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex items-center justify-center rounded-full w-16 h-16 text-2xl font-bold border-2",
                  eyeAppealGrade === 'A' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
                  eyeAppealGrade === 'B' ? 'bg-blue-500/10 border-blue-500 text-blue-500' :
                  eyeAppealGrade === 'C' ? 'bg-amber-500/10 border-amber-500 text-amber-500' :
                  'bg-red-500/10 border-red-500 text-red-500'
                )}>
                  {eyeAppealGrade}
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    Eye Appeal Grade
                  </p>
                  {eyeAppealReasoning && (
                    <p className="text-xs text-foreground/80 leading-snug">
                      {eyeAppealReasoning}
                    </p>
                  )}
                </div>
              </div>
            )}

            {aiGradeAssessment?.key_observations && aiGradeAssessment.key_observations.length > 0 && (
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Key Observations:</p>
                <ul className="text-xs text-foreground/70 space-y-1 list-disc list-inside">
                  {aiGradeAssessment.key_observations.map((obs, idx) => (
                    <li key={idx}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      )}
    
      {categories.map((category, catIdx) => {
        const netDir = category.net_direction === 'up' ? '↑' : category.net_direction === 'down' ? '↓' : '•';
        const netColor = category.net_direction === 'up' ? 'text-emerald-400' : category.net_direction === 'down' ? 'text-red-400' : 'text-muted-foreground';

        return (
          <motion.div
            key={catIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIdx * 0.05 }}
            className="bg-card border border-border/50 rounded-xl p-5 space-y-4"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
              <div className="flex items-center gap-2">
                <span className={cn("text-2xl font-bold", netColor)}>{netDir}</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{category.category_label}</h3>
                  <p className={cn("text-xs font-mono tracking-wider", netColor)}>
                    {category.net_percent_impact}
                  </p>
                </div>
              </div>
            </div>

            {/* Attributes List */}
            <div className="space-y-3">
              {category.attributes.map((attr, attrIdx) => {
                const attrDir = attr.direction === 'up' ? '↑' : attr.direction === 'down' ? '↓' : '•';
                const attrColor = attr.direction === 'up' ? 'text-emerald-400' : attr.direction === 'down' ? 'text-red-400' : 'text-muted-foreground';
                const impConfig = IMPORTANCE_CONFIG[attr.importance] || IMPORTANCE_CONFIG.low;

                return (
                  <motion.div
                    key={attrIdx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (catIdx * 0.05) + (attrIdx * 0.02) }}
                    className={cn("rounded-lg p-3 border", impConfig.bg)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className={cn("text-lg font-bold shrink-0", attrColor)}>{attrDir}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{attr.label}</p>
                          <p className={cn("text-[10px] font-mono uppercase tracking-wider", impConfig.text)}>
                            {impConfig.badge}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-sm font-mono font-bold whitespace-nowrap", attrColor, "text-right")}>
                        {attr.percent_of_value}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/70 leading-relaxed pl-7">
                      {attr.explanation}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Summary Footer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-primary/5 border border-primary/20 rounded-xl p-5"
      >
        <p className="text-[10px] font-mono uppercase tracking-wider text-primary mb-2">
          Why Your AI Value Is Different
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          ↑ <span className="font-semibold">Green arrows</span> boost value (good news).
          ↓ <span className="font-semibold">Red arrows</span> lower value (headwinds).
          • <span className="font-semibold">Grey dots</span> don't affect this card.
          Numbers show how much each factor pushes the price up or down.
        </p>
      </motion.div>
    </motion.div>
  );
}