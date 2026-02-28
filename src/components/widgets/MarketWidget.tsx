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

export function MarketWidget({ config }: { config: DiscoverConfig }) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
                
                if (json.Note || json.Information || json["Information"]) {
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
        if (validStocks.length === 0) setError("Market Data Limit Reached");
        else setStocks(validStocks);
      } catch (err: any) {
        setError(err.message === "API Limit Reached" ? "API Daily Limit Reached" : "Connection Error");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
    if (tickerList.length > 0) setSelectedSymbol(tickerList[0]);
  }, [config, tickerList]);

  // Fetch Historical Data for Charts
  useEffect(() => {
    if (!selectedSymbol || !config.apiKeys.market) return;

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
            
            if (json.Note || json.Information) throw new Error("API Limit Reached");
            
            const timeSeries = json["Time Series (Daily)"];
            if (!timeSeries) throw new Error("No historical data");

            return Object.entries(timeSeries)
              .slice(0, 30)
              .map(([date, values]: [string, any]) => ({
                date: date.split('-').slice(1).join('/'), // MM/DD
                price: parseFloat(values["4. close"])
              }))
              .reverse();
          },
          EXPIRY_TIMES.MARKET // Cache for 60 mins
        );
        setHistoricalData(data);
      } catch (err: any) {
        setHistError(err.message === "API Limit Reached" ? "Rate Limit Exceeded" : "History Unavailable");
      } finally {
        setHistLoading(false);
      }
    };

    fetchHistory();
  }, [selectedSymbol, config.apiKeys.market]);

  if (!config.apiKeys.market || tickerList.length === 0) {
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
            {error ? (
              <div className="text-center py-6 flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-destructive opacity-40" />
                <p className="text-sm font-bold text-muted-foreground italic">{error}</p>
              </div>
            ) : (
              stocks.map((stock, idx) => (
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
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-4xl bg-card p-0 overflow-hidden">
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-64 bg-muted/20 border-r p-6 space-y-4 overflow-y-auto">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Portfolio</h4>
            <div className="space-y-2">
              {tickerList.map(ticker => (
                <button
                  key={ticker}
                  onClick={() => setSelectedSymbol(ticker)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all font-bold text-sm",
                    selectedSymbol === ticker 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "hover:bg-primary/10 bg-card/50"
                  )}
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-8 flex flex-col">
            <DialogHeader className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-3xl font-headline font-black">{selectedSymbol}</DialogTitle>
                  <DialogDescription>30-Day Performance Horizon</DialogDescription>
                </div>
                {histLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 relative">
              {histError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
                  <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-40" />
                  <p className="text-lg font-bold text-muted-foreground">{histError}</p>
                  <p className="text-sm text-muted-foreground/60 max-w-xs">Alpha Vantage free tier allows 5 requests per minute. Please wait and refresh.</p>
                </div>
              ) : historicalData.length > 0 ? (
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
                    <YAxis 
                      hide={true} 
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '1rem', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'hsl(var(--card))',
                        color: 'hsl(var(--foreground))'
                      }}
                      itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4} 
                      dot={false}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                   <p className="text-sm text-muted-foreground animate-pulse">Initializing data streams...</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex gap-4">
              <div className="flex-1 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-[10px] font-black uppercase text-primary mb-1">Status</p>
                <p className="font-bold flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Live Market Access
                </p>
              </div>
              <div className="flex-1 p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                <p className="text-[10px] font-black uppercase text-secondary mb-1">Insights</p>
                <p className="font-bold">Real-time Global Quotes</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
