import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Newspaper, Calendar, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlayerActivityInsights({ playerName, cardYear, prefetchedData }) {
  const [loading, setLoading] = useState(!prefetchedData);
  const [insights, setInsights] = useState(prefetchedData || null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If we already have prefetched data, skip the LLM call entirely
    if (prefetchedData) {
      setInsights(prefetchedData);
      setLoading(false);
      return;
    }
    if (!playerName) { setLoading(false); return; }

    const fetchInsights = async () => {
      try {
        const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Sports analyst. Today is ${today}. Return VERIFIED data about ${playerName}. JSON only: injury_status, current_season_status, last_game:{date,points,rebounds,assists}, last_10_avg_pts, trend, top_2_news:[{date,headline,impact}]`,
          response_json_schema: {
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
          add_context_from_internet: false,
          model: 'gemini_3_flash',
        });
        setInsights(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [playerName, prefetchedData]);

  if (loading) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-6 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-xs text-muted-foreground">Fetching player activity data...</span>
      </div>
    );
  }

  if (error || !insights) {
    return null;
  }

  const hasRecentGame = insights.last_game?.date;
  const isOffSeason = insights.current_season_status?.toLowerCase().includes('off');
  const isInjured = insights.injury_status?.toLowerCase().includes('out') ||
                    insights.injury_status?.toLowerCase().includes('injured');
  // Support both old schema (top_3_news) and new folded schema (top_2_news)
  const newsItems = insights.top_3_news || insights.top_2_news || [];
  // Support both old (last_10_games.avg_points) and new (last_10_avg_pts)
  const avg10 = insights.last_10_games?.avg_points ?? insights.last_10_avg_pts;
  const trend10 = insights.last_10_games?.trend ?? insights.trend;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary/5 border-b border-border/30 px-6 py-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-primary">
            Player Activity Intelligence
          </h3>
          <span className="text-[10px] text-muted-foreground ml-auto">Real-time data · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Injury Status Alert */}
        {isInjured && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex gap-3 items-start"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-400 mb-0.5">Injury Alert</p>
              <p className="text-[10px] text-red-300/80">{insights.injury_status}</p>
            </div>
          </motion.div>
        )}

        {/* Last Game Performance */}
        {hasRecentGame && (
          <div className="bg-secondary/50 rounded-lg p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Last Game</p>
              <span className="text-[10px] text-muted-foreground ml-auto">{insights.last_game.date}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {insights.last_game.points !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Points</p>
                  <p className="text-lg font-mono font-bold text-foreground">{insights.last_game.points}</p>
                </div>
              )}
              {insights.last_game.rebounds !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rebounds</p>
                  <p className="text-lg font-mono font-bold text-foreground">{insights.last_game.rebounds}</p>
                </div>
              )}
              {insights.last_game.assists !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Assists</p>
                  <p className="text-lg font-mono font-bold text-foreground">{insights.last_game.assists}</p>
                </div>
              )}
              {insights.last_game.shooting_pct !== undefined && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">FG%</p>
                  <p className="text-lg font-mono font-bold text-foreground">{insights.last_game.shooting_pct.toFixed(1)}%</p>
                </div>
              )}
            </div>
            {insights.last_game.performance && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Performance: {insights.last_game.performance}
              </p>
            )}
          </div>
        )}

        {/* Last 10 Games Trend */}
        {(avg10 || trend10) && (
          <div className="bg-secondary/50 rounded-lg p-4 border border-border/30">
            <div className="flex items-center gap-2 mb-3">
              {trend10?.toLowerCase().includes('up') ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              )}
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Last 10 Games</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {avg10 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Avg Points</p>
                  <p className="text-lg font-mono font-bold text-foreground">{avg10}</p>
                </div>
              )}
              {trend10 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trend</p>
                  <p className={cn(
                    "text-lg font-mono font-bold capitalize",
                    trend10?.toLowerCase().includes('up') ? 'text-emerald-400' :
                    trend10?.toLowerCase().includes('down') ? 'text-red-400' :
                    'text-muted-foreground'
                  )}>
                    {trend10}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Off-Season Insights */}
        {isOffSeason && insights.off_season_insights && (
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-violet-400 mb-2">🌞 Off-Season Activity</p>
            <p className="text-xs text-foreground/80 leading-relaxed">{insights.off_season_insights}</p>
          </div>
        )}

        {/* Latest News */}
        {newsItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-mono uppercase tracking-wider text-primary">Latest News</p>
            </div>
            <div className="space-y-2">
              {newsItems.slice(0, 3).map((news, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-secondary/50 border border-border/30 rounded-lg p-3"
                >
                  <div className="flex items-start gap-2 mb-1">
                    <Calendar className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs font-mono text-muted-foreground">{news.date}</p>
                  </div>
                  <p className="text-xs font-semibold text-foreground mb-1">{news.headline}</p>
                  {(news.impact_on_value || news.impact) && (
                    <p className="text-xs text-muted-foreground italic">
                      💡 {news.impact_on_value || news.impact}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}