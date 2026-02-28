
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, ArrowRight, Activity, AlertCircle } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

const MOCK_STOCKS: StockData[] = [
  { symbol: "AAPL", price: 189.43, change: 1.25, changePercent: "0.66%" },
  { symbol: "GOOGL", price: 142.56, change: -0.89, changePercent: "-0.62%" },
  { symbol: "MSFT", price: 402.12, change: 2.45, changePercent: "0.61%" },
];

export function MarketWidget({ config }: { config: DiscoverConfig }) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!config.apiKeys.market || config.stocks.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStocks = async () => {
      setLoading(true);
      setError(null);
      setIsDemo(false);
      
      try {
        const results = await Promise.all(
          config.stocks.map(async (symbol) => {
            const ticker = symbol.split(' ')[0].toUpperCase();
            return cachedFetch(
              `stock_v4_${ticker}_${config.apiKeys.market.slice(-4)}`,
              async () => {
                const res = await fetch(
                  `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${config.apiKeys.market}`
                );
                const json = await res.json();
                
                if (json.Note || json.Information || json["Information"]) {
                  throw new Error("API Limit Reached");
                }

                const quote = json["Global Quote"];
                if (!quote || Object.keys(quote).length === 0) {
                  return null;
                }

                return {
                  symbol: quote["01. symbol"] || ticker,
                  price: parseFloat(quote["05. price"]) || 0,
                  change: parseFloat(quote["09. change"]) || 0,
                  changePercent: quote["10. change percent"] || "0%",
                };
              },
              EXPIRY_TIMES.MARKET
            ).catch(err => {
              if (err.message === "API Limit Reached") throw err;
              return null;
            });
          })
        );
        
        const validStocks = results.filter((s): s is StockData => s !== null);
        
        if (validStocks.length === 0 && config.stocks.length > 0) {
          setError("No market data found");
        } else {
          setStocks(validStocks);
        }
      } catch (err: any) {
        if (err.message === "API Limit Reached") {
          setError("Daily Limit Reached (Demo Mode)");
          setStocks(MOCK_STOCKS);
          setIsDemo(true);
        } else {
          setError("Market Data Unavailable");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [config]);

  if (!config.apiKeys.market || config.stocks.length === 0) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
          <BarChart3 className="w-12 h-12 mb-2 opacity-30" />
          <p className="font-medium">Market Setup Required</p>
          <p className="text-xs">Add tickers in settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <div className="h-48 rounded-3xl-card animate-skeleton bg-muted/40" />;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="rounded-3xl-card bg-card overflow-hidden cursor-pointer group hover:border-primary/50 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Market Watch</CardTitle>
              {isDemo && <span className="text-[10px] text-amber-500 font-bold uppercase animate-pulse">Demo Mode</span>}
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {error && !isDemo ? (
              <div className="text-center py-6 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-destructive opacity-40" />
                <p className="text-sm font-bold text-muted-foreground italic">{error}</p>
                <p className="text-[10px] uppercase text-muted-foreground/50">Alpha Vantage Limit</p>
              </div>
            ) : stocks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground italic">No data available</div>
            ) : (
              stocks.map((stock, idx) => (
                <div key={`${stock.symbol}-${idx}`} className="flex items-center justify-between group/item">
                  <div>
                    <p className="font-black text-xl font-headline group-hover/item:text-primary transition-colors">{stock.symbol}</p>
                    <p className="text-sm font-bold">
                      ${(stock.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className={`flex flex-col items-end ${(stock.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center gap-1 font-bold">
                      {(stock.change ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {stock.changePercent || '0%'}
                    </div>
                    <p className="text-xs font-medium opacity-70">
                      {(stock.change ?? 0) >= 0 ? '+' : ''}{(stock.change ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-2xl bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold">Portfolio Analysis</DialogTitle>
          <DialogDescription>
            Detailed market performance and sector analysis for your selected symbols. {isDemo && "Currently showing demonstration data due to API limits."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Volatility</p>
              <p className="text-xl font-black">Medium</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Volume</p>
              <p className="text-xl font-black">Steady</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Market State</p>
              <p className="text-xl font-black text-green-500 uppercase">Open</p>
            </div>
          </div>
          <div className="h-48 bg-accent/5 border border-dashed border-accent/20 rounded-3xl flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-10 h-10 text-accent mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground italic">Interactive sector charts processing...</p>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">Detailed Quotes</h4>
            {stocks.map((s, idx) => (
              <div key={`${s.symbol}-det-${idx}`} className="flex justify-between items-center p-4 bg-muted/10 rounded-xl">
                <span className="font-black text-lg">{s.symbol}</span>
                <span className="font-mono text-xs opacity-70">Price: ${(s.price ?? 0).toFixed(2)} | Δ: {s.changePercent}</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
