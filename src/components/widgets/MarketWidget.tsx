"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { type DiscoverConfig } from "@/lib/config-store";

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
        setStocks(results);
      } catch (err) {
        setError("Data limit or key issue");
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
    <Card className="rounded-3xl-card bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Market Watch</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {error ? (
          <div className="text-center py-4 text-muted-foreground italic">{error}</div>
        ) : (
          stocks.map((stock) => (
            <div key={stock.symbol} className="flex items-center justify-between group">
              <div>
                <p className="font-black text-xl font-headline group-hover:text-primary transition-colors">{stock.symbol}</p>
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
  );
}