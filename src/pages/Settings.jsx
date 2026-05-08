import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Key, ExternalLink } from 'lucide-react';

export default function Settings() {
  const [apifyToken, setApifyToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('apify_token');
    if (stored) setApifyToken(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem('apify_token', apifyToken.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your data sources for Last Sold lookups.</p>
        </div>

        {/* Apify Token */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Apify API Token</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Apify powers the eBay sold listings scraper for the most accurate Last Sold Price and Last Sold Date results. Without a token, the app falls back to direct scraping which may be less reliable.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">API Token</label>
            <input
              type="password"
              value={apifyToken}
              onChange={e => setApifyToken(e.target.value)}
              placeholder="apify_api_xxxxxxxxxxxxxxxxxxxx"
              className="w-full h-11 px-4 text-sm border-2 border-border rounded-xl bg-background focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} className="rounded-xl">
              {saved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : null}
              {saved ? 'Saved!' : 'Save Token'}
            </Button>
            <a
              href="https://console.apify.com/account/integrations"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Get your Apify token
            </a>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-secondary/40 border border-border/50 rounded-2xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-foreground">How Last Sold data works</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="font-bold text-primary shrink-0">1.</span> You search for a card (e.g. "2023 Topps Ohtani PSA 10")</li>
            <li className="flex gap-2"><span className="font-bold text-primary shrink-0">2.</span> The app searches eBay completed/sold listings with <code className="text-xs bg-secondary px-1 py-0.5 rounded">LH_Sold=1&LH_Complete=1</code></li>
            <li className="flex gap-2"><span className="font-bold text-primary shrink-0">3.</span> Every result shows the exact Last Sold Price, Last Sold Date, and a direct eBay link to validate</li>
            <li className="flex gap-2"><span className="font-bold text-primary shrink-0">4.</span> Results are saved to your database for future reference</li>
          </ol>
        </div>
      </div>
    </div>
  );
}