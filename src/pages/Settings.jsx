import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Key, ExternalLink, AlertCircle, Zap, Loader2, Info } from 'lucide-react';

export default function Settings() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'success' | 'fail'
  const [testMessage, setTestMessage] = useState('');

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage('');
    try {
      const res = await base44.functions.invoke('testApifyEbay', {});
      const data = res.data;
      if (data?.success) {
        setTestResult('success');
        setTestMessage(data.message || `✓ Connected as "${data.username}". Apify is working!`);
      } else {
        setTestResult('fail');
        setTestMessage(data?.error || 'Connection failed. The APIFY_TOKEN secret may be wrong — update it in the platform settings.');
      }
    } catch (err) {
      setTestResult('fail');
      setTestMessage(err.message || 'Connection failed.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-black text-foreground">Setup Guide</h1>
          <p className="text-sm text-muted-foreground mt-2">Follow these steps to get accurate comps and pop reports working.</p>
        </div>

        {/* Step 1: Apify Token */}
        <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-black text-primary">1</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">Get Apify API Token (Free)</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Apify scrapes real eBay sold listings so you get ACTUAL last sold prices, not estimates.
              </p>
            </div>
          </div>

          <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-3 ml-11">
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">a)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Click the button below</p>
                <p className="text-xs text-muted-foreground mt-0.5">Opens Apify console in a new tab</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">b)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Sign up (takes 2 minutes)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Free tier = 100+ free runs per month</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">c)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Go to Account → Integrations</p>
                <p className="text-xs text-muted-foreground mt-0.5">Copy your API token (starts with <code className="bg-background px-1 rounded text-[10px]">apify_api_</code>)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">d)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Paste it below and hit Save</p>
                <p className="text-xs text-muted-foreground mt-0.5">Token stays on your device, never leaves</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 ml-11">
            {/* Platform secret notice */}
            <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground">Token is stored as a platform secret</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The <code className="bg-background px-1 rounded">APIFY_TOKEN</code> is configured in the app's backend settings — not in your browser. To update it, go to the app's <strong>Settings → Secrets</strong> in the Base44 dashboard and set a new value for <code className="bg-background px-1 rounded">APIFY_TOKEN</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button onClick={handleTest} disabled={testing} className="rounded-xl">
                {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                {testing ? 'Testing...' : 'Test Apify Connection'}
              </Button>
              <a
                href="https://console.apify.com/account/integrations"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Get Apify Token
              </a>
            </div>

            {/* Test result */}
            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${testResult === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700' : 'bg-red-500/10 border-red-500/30 text-red-700'}`}>
                {testResult === 'success'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <p>{testMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Search for Comps */}
        <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-black text-primary">2</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">Search for Your First Card</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Once Apify is set up, go valuate a card to populate the database.
              </p>
            </div>
          </div>

          <div className="bg-secondary/40 border border-border/50 rounded-xl p-4 space-y-3 ml-11">
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">a)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Go to "Valuate Card"</p>
                <p className="text-xs text-muted-foreground mt-0.5">Click the nav menu or go home and hit "Value a Card"</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">b)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Paste a card listing URL or upload a photo</p>
                <p className="text-xs text-muted-foreground mt-0.5">eBay, PWCC, Goldin, or any card site works</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">c)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">AI extracts card details automatically</p>
                <p className="text-xs text-muted-foreground mt-0.5">Apify then searches eBay for real sold prices</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0">d)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">You get accurate comps in <strong>2-3 seconds</strong></p>
                <p className="text-xs text-muted-foreground mt-0.5">No guesswork, just real market data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Pop Report (Manual) */}
        <div className="bg-card border-2 border-amber-500/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 mt-1">
              <span className="text-sm font-black text-amber-600">3</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">Get PSA Pop Report Data</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Pop reports show how many copies exist at each grade — this is manual for now.
              </p>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3 ml-11">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 font-bold text-sm shrink-0">a)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Go to <strong>psacard.com/pop</strong></p>
                <p className="text-xs text-muted-foreground mt-0.5">Basketball cards section</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 font-bold text-sm shrink-0">b)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Search for your card (e.g. "Victor Wembanyama 2023 Panini Select")</p>
                <p className="text-xs text-muted-foreground mt-0.5">Find the exact parallel/variation you want</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 font-bold text-sm shrink-0">c)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Write down the numbers for your grade</p>
                <p className="text-xs text-muted-foreground mt-0.5">Example: PSA 10 = 96 copies (pop_at_grade), 0 higher (pop_higher)</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 font-bold text-sm shrink-0">d)</span>
              <div>
                <p className="text-sm font-semibold text-foreground">When valuating, if asked for pop data, enter these numbers</p>
                <p className="text-xs text-muted-foreground mt-0.5">App will use them in the valuation calculation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">✓ You're all set!</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                After saving your Apify token, go valuate a card. You should now get real eBay comps in seconds instead of empty results. If pop data is still slow, you'll need to manually check PSA.com for the exact numbers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}