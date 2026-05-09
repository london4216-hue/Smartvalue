import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PriceHistoryChart({ comps, aiValue }) {
  const chartData = useMemo(() => {
    if (!comps || comps.length === 0) return null;

    // Create a map of months to prices
    const monthMap = {};
    const now = new Date();

    comps.forEach(comp => {
      if (!comp.sold_date || comp.sold_price <= 0) return;
      
      const compDate = new Date(comp.sold_date);
      const monthKey = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Keep only sales from last 12 months
      const monthsAgo = (now.getFullYear() - compDate.getFullYear()) * 12 + (now.getMonth() - compDate.getMonth());
      if (monthsAgo > 12) return;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = [];
      }
      monthMap[monthKey].push(comp.sold_price);
    });

    // Convert to chart data (monthly average)
    const sorted = Object.entries(monthMap)
      .map(([month, prices]) => ({
        month,
        price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        count: prices.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    if (sorted.length === 0) return null;

    // Add current AI value as "today"
    const last = sorted[sorted.length - 1];
    if (aiValue && aiValue > 0) {
      sorted.push({
        month: 'Today',
        price: aiValue,
        count: 1,
        isCurrent: true,
      });
    }

    return sorted;
  }, [comps, aiValue]);

  if (!chartData || chartData.length < 2) {
    return null;
  }

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const trend = chartData[chartData.length - 1].price > chartData[0].price ? 'up' : 'down';
  const trendPct = ((chartData[chartData.length - 1].price - chartData[0].price) / chartData[0].price * 100).toFixed(1);

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">12-Month Price History</p>
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold',
          trend === 'up'
            ? 'bg-emerald-500/10 text-emerald-600'
            : 'bg-red-500/10 text-red-600'
        )}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend === 'up' ? '+' : ''}{trendPct}%
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              domain={[minPrice * 0.9, maxPrice * 1.1]}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value) => [`$${value.toLocaleString()}`, 'Price']}
              labelFormatter={(label) => label}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isCurrent) {
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    />
                  );
                }
                return <circle cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-secondary/40 border border-border/40 rounded-lg p-2">
          <p className="text-muted-foreground font-medium">Lowest</p>
          <p className="text-sm font-bold text-foreground mt-0.5">${minPrice.toLocaleString()}</p>
        </div>
        <div className="bg-secondary/40 border border-border/40 rounded-lg p-2">
          <p className="text-muted-foreground font-medium">Current</p>
          <p className="text-sm font-bold text-foreground mt-0.5">${chartData[chartData.length - 1].price.toLocaleString()}</p>
        </div>
        <div className="bg-secondary/40 border border-border/40 rounded-lg p-2">
          <p className="text-muted-foreground font-medium">Highest</p>
          <p className="text-sm font-bold text-foreground mt-0.5">${maxPrice.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}