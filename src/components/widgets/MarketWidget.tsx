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
    // Reset all states when config changes to ensure a clean live retry
    setError(null);
    setIsDemo(false);
    setLoading(true);

    if (!config.apiKeys.market || tickerList.length === 0) {
      setLoading(false);
      return;
    }

    const fetchStocks = async () => {
      try {
        const results = await Promise.all(
          tickerList.map(async (ticker) => {
            // Include full API key (partially) in cache key to force bust on key change
            const apiKeySignature = config.apiKeys.market.slice(-8);
            return cachedFetch(
              `stock_v11_${ticker}_${apiKeySignature}`,
              async () => {
                const res = await fetch(
                  `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${config.apiKeys.market}`
                );
                const json = await res.json();
                
                if (json.Note || json.Information) {
                  throw new Error("API Limit Reached");
                }
                
                if (json["Error Message"]) {
                  throw new Error("Invalid API Key");
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
              if (err.message === "Invalid API Key") throw err;
              return null;
            });
          })
        );
        
        const validStocks = results.filter((s): s is StockData => s !== null);
        
        if (validStocks.length === 0) {
          setError("Data Stream Limited - Demo Active");
          setStocks(DEMO_STOCKS);
          setIsDemo(true);
        } else {
          setStocks(validStocks);
          setIsDemo(false);
          setError(null);
        }
      } catch (err: any) {
        setError(err.message || "Market Data Unavailable");
        setStocks(DEMO_STOCKS);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    if (tickerList.length > 0 && !selectedSymbol) {
      setSelectedSymbol(tickerList[0]);
    }
  }, [config.apiKeys.market, tickerList]);

  useEffect(() => {
    if (!selectedSymbol) return;

    if (isDemo || !config.apiKeys.market) {
      setHistoricalData(DEMO_HISTORY);
      return;
    }

    const fetchHistory = async () => {
      setHistLoading(true);
      setHistError(null);
      try {
        const apiKeySignature = config.apiKeys.market.slice(-8);
        const data = await cachedFetch(
          `stock_hist_v6_${selectedSymbol}_${apiKeySignature}`,
          async () => {
            const res = await fetch(
              `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${selectedSymbol}&apikey=${config.apiKeys.market}`
            );
            const json = await res.json();
            
            if (json.Note || json.Information || json["Error Message"]) throw new Error("API Limit");
            
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
        setHistError("History Stream Unavailable");
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
          <p className="text-xs">Add tickers and API key in settings.</p>
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
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">
              Market Watch {isDemo && "(Demo)"}
            </CardTitle>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {stocks.map((stock, idx) => (
              <div key={`${stock.symbol}-${idx}`} className="flex items-center justify-between group/item">
                <div>
                  <p className="font-black text-xl font-headline group-hover/item:text-primary transition-colors">{stock.symbol}</p>
                  <p className="text-sm font-bold">
                    ${(stock.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`flex flex-col items-end ${(stock.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <div className="flex items-center gap-1 font-bold">
                    {(stock.change || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {stock.changePercent}
                  </div>
                  <p className="text-[10px] font-bold opacity-60">
                    {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {error && (
              <p className="text-[10px] text-center text-muted-foreground italic pt-2">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-4xl bg-card p-0 overflow-hidden shadow-2xl">
        <div className="flex h-[600px]">
          {/* Sidebar List */}
          <div className="w-72 bg-muted/10 border-r p-6 space-y-4 overflow-y-auto">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Your Portfolio</h4>
            <div className="space-y-2">
              {stocks.map(stock => (
                <button
                  key={stock.symbol}
                  onClick={() => setSelectedSymbol(stock.symbol)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all font-bold text-sm flex justify-between items-center group",
                    selectedSymbol === stock.symbol 
                      ? "bg-primary text-primary-foreground shadow-md scale-105" 
                      : "hover:bg-primary/10 bg-card/40 text-foreground/70"
                  )}
                >
                  <span>{stock.symbol}</span>
                  <span className={cn(
                    "text-[10px] font-black",
                    selectedSymbol === stock.symbol ? "text-white/80" : "text-muted-foreground"
                  )}>${(stock.price || 0).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 p-10 flex flex-col bg-card">
            <DialogHeader className="mb-10">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-4xl font-headline font-black tracking-tight">{selectedSymbol}</DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1">30-Day performance history for selected ticker.</DialogDescription>
                </div>
                {histLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 relative">
              {historicalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1rem', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'hsl(var(--card))',
                        padding: '12px'
                      }}
                      itemStyle={{ fontWeight: 800, color: 'hsl(var(--primary))' }}
                      labelStyle={{ marginBottom: '4px', fontSize: '10px', color: 'hsl(var(--muted-foreground))', fontWeight: 900, textTransform: 'uppercase' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={5} 
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-muted/5 rounded-3xl border border-dashed">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-40" />
                  <p className="text-xl font-bold text-foreground/80">{histError || "Awaiting Data Stream..."}</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs">Historical data retrieval is subject to Alpha Vantage API limits.</p>
                </div>
              )}
            </div>
            
            <div className="mt-10 grid grid-cols-2 gap-6">
              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 transition-colors hover:bg-primary/10">
                <p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Connectivity</p>
                <p className="font-bold flex items-center gap-2 text-foreground/90">
                  <Activity className="w-4 h-4" /> {isDemo ? "Demonstration Logic" : "Authenticated API Stream"}
                </p>
              </div>
              <div className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10 transition-colors hover:bg-secondary/10">
                <p className="text-[10px] font-black uppercase text-secondary mb-1 tracking-widest">Data Tier</p>
                <p className="font-bold text-foreground/90">Standard Global Watcher</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
