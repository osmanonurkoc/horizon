"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, ArrowRight, Activity, AlertCircle, Loader2 } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from "@/lib/utils";

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

interface HistoricalData {
  date: string;
  price: number;
}

const DEMO_STOCKS: StockData[] = [
  { symbol: "AAPL", price: 185.92, change: 1.25, changePercent: "0.68%" },
  { symbol: "NVDA", price: 726.13, change: 15.42, changePercent: "2.16%" },
  { symbol: "GOOGL", price: 142.71, change: -0.84, changePercent: "-0.59%" },
];

const DEMO_HISTORY: HistoricalData[] = Array.from({ length: 30 }).map((_, i) => ({
  date: `03/${i + 1}`,
  price: 150 + Math.random() * 20
}));

export function MarketWidget({ config }: { config: DiscoverConfig }) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);

  const tickerList = useMemo(() => 
    config.stocks.map(s => s.split(' ')[0].toUpperCase()), 
    [config.stocks]
  );

  useEffect(() => {
    if (!config.apiKeys.market || tickerList.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStocks = async () => {
      setLoading(true);
      setError(null);
      setIsDemo(false);
      
      try {
        const results = await Promise.all(
          tickerList.map(async (ticker) => {
            return cachedFetch(
              `stock_quote_v5_${ticker}_${config.apiKeys.market.slice(-4)}`,
              async () => {
                const res = await fetch(
                  `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${config.apiKeys.market}`
                );
                const json = await res.json();
                
                // Alpha Vantage specific error fields
                if (json.Note || json.Information || json["Error Message"]) {
                  throw new Error("API Limit Reached");
                }

                const quote = json["Global Quote"];
                if (!quote || Object.keys(quote).length === 0) return null;

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
        if (validStocks.length === 0) {
          setError("API Limit Reached - Demo Mode Active");
          setStocks(DEMO_STOCKS);
          setIsDemo(true);
        } else {
          setStocks(validStocks);
        }
      } catch (err: any) {
        setError("API Limit Reached - Demo Mode Active");
        setStocks(DEMO_STOCKS);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    if (tickerList.length > 0) setSelectedSymbol(tickerList[0]);
    else if (isDemo) setSelectedSymbol(DEMO_STOCKS[0].symbol);
  }, [config, tickerList, isDemo]);

  useEffect(() => {
    if (!selectedSymbol || !config.apiKeys.market || isDemo) {
      if (isDemo) setHistoricalData(DEMO_HISTORY);
      return;
    }

    const fetchHistory = async () => {
      setHistLoading(true);
      setHistError(null);
      try {
        const data = await cachedFetch(
          `stock_hist_v1_${selectedSymbol}_${config.apiKeys.market.slice(-4)}`,
          async () => {
            const res = await fetch(
              `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${selectedSymbol}&apikey=${config.apiKeys.market}`
            );
            const json = await res.json();
            
            if (json.Note || json.Information || json["Error Message"]) throw new Error("API Limit Reached");
            
            const timeSeries = json["Time Series (Daily)"];
            if (!timeSeries) throw new Error("No historical data");

            return Object.entries(timeSeries)
              .slice(0, 30)
              .map(([date, values]: [string, any]) => ({
                date: date.split('-').slice(1).join('/'),
                price: parseFloat(values["4. close"])
              }))
              .reverse();
          },
          EXPIRY_TIMES.MARKET
        );
        setHistoricalData(data);
      } catch (err: any) {
        setHistError("History Unavailable (API Limit)");
        setHistoricalData(DEMO_HISTORY);
      } finally {
        setHistLoading(false);
      }
    };

    fetchHistory();
  }, [selectedSymbol, config.apiKeys.market, isDemo]);

  if (!config.apiKeys.market || (tickerList.length === 0 && !isDemo)) {
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
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">Market Watch {isDemo && "(Demo)"}</CardTitle>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {stocks.map((stock, idx) => (
              <div key={`${stock.symbol}-${idx}`} className="flex items-center justify-between group/item">
                <div>
                  <p className="font-black text-xl font-headline group-hover/item:text-primary transition-colors">{stock.symbol}</p>
                  <p className="text-sm font-bold">
                    ${(stock.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`flex flex-col items-end ${(stock.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <div className="flex items-center gap-1 font-bold">
                    {(stock.change ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {stock.changePercent}
                  </div>
                  <p className="text-[10px] font-bold opacity-60">
                    {(stock.change ?? 0) >= 0 ? '+' : ''}{(stock.change ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {isDemo && (
              <p className="text-[10px] text-center text-muted-foreground italic pt-2">
                API Daily Limit Reached. Showing demonstration data.
              </p>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-4xl bg-card p-0 overflow-hidden">
        <div className="flex h-[550px]">
          <div className="w-64 bg-muted/20 border-r p-6 space-y-4 overflow-y-auto">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Portfolio</h4>
            <div className="space-y-2">
              {(isDemo ? DEMO_STOCKS : stocks).map(stock => (
                <button
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all font-bold text-sm",
                    selectedSymbol === stock.symbol 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "hover:bg-primary/10 bg-card/50"
                  )}
                >
                  {stock.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-8 flex flex-col">
            <DialogHeader className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-3xl font-headline font-black">{selectedSymbol}</DialogTitle>
                  <DialogDescription>30-Day Performance History & Technical Horizon</DialogDescription>
                </div>
                {histLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 relative">
              {historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      dy={10}
                    />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1rem', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4} 
                      dot={false}
                      animationDuration={1000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-40" />
                  <p className="text-lg font-bold text-muted-foreground">{histError || "Initializing stream..."}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex gap-4">
              <div className="flex-1 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-[10px] font-black uppercase text-primary mb-1">Status</p>
                <p className="font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4" /> {isDemo ? "Demo Data" : "Live Market Access"}
                </p>
              </div>
              <div className="flex-1 p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                <p className="text-[10px] font-black uppercase text-secondary mb-1">Analytics</p>
                <p className="font-bold">Real-time Global Quotes</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
