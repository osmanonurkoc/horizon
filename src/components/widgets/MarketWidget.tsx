"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowRight, Activity } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

export function MarketWidget({ config }: { config: DiscoverConfig }) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config.apiKeys.market || config.stocks.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStocks = async () => {
      try {
        const results = await Promise.all(
          config.stocks.map(symbol => 
            cachedFetch(
              `stock_${symbol}`,
              async () => {
                const res = await fetch(
                  `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${config.apiKeys.market}`
                );
                const json = await res.json();
                const quote = json["Global Quote"];
                if (!quote) throw new Error("Limit reached");
                return {
                  symbol: quote["01. symbol"],
                  price: parseFloat(quote["05. price"]),
                  change: parseFloat(quote["09. change"]),
                  changePercent: quote["10. change percent"],
                };
              },
              EXPIRY_TIMES.MARKET
            )
          )
        );
        setStocks(results.filter(Boolean));
      } catch (err) {
        setError("Data limit reached");
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
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Market Watch</CardTitle>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {error && stocks.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground italic">{error}</div>
            ) : (
              stocks.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between group/item">
                  <div>
                    <p className="font-black text-xl font-headline group-hover/item:text-primary transition-colors">{stock.symbol}</p>
                    <p className="text-sm font-bold">${stock.price.toLocaleString()}</p>
                  </div>
                  <div className={`flex flex-col items-end ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <div className="flex items-center gap-1 font-bold">
                      {stock.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {stock.changePercent}
                    </div>
                    <p className="text-xs font-medium opacity-70">
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline font-bold">Portfolio Analysis</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Volatilty</p>
              <p className="text-xl font-black">Low</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Daily Range</p>
              <p className="text-xl font-black">1.2% - 3.4%</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-2xl">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Sentiment</p>
              <p className="text-xl font-black text-green-500">Bullish</p>
            </div>
          </div>
          <div className="h-40 bg-accent/5 border border-dashed border-accent/20 rounded-3xl flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-8 h-8 text-accent mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-muted-foreground italic">Interactive charts coming soon...</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">Market Pulse</h4>
            {stocks.map(s => (
              <div key={s.symbol} className="flex justify-between p-3 border-b border-muted last:border-0">
                <span className="font-bold">{s.symbol}</span>
                <span className="font-mono text-xs opacity-60">P/E: 24.5 | Market Cap: $2.1T</span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
