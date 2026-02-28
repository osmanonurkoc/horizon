"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, ArrowRight, Activity, AlertCircle, Loader2, RefreshCcw } from "lucide-react";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import { type DiscoverConfig } from "@/lib/config-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

/**
 * Robust fetcher that tries multiple proxies for Yahoo Finance.
 * Prevents "Unexpected token <" by checking content types.
 */
async function fetchYahooProxy(targetUrl: string) {
  const encodedUrl = encodeURIComponent(targetUrl);
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodedUrl}`,
    `https://corsproxy.io/?${encodedUrl}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn(`Proxy ${proxyUrl} returned non-JSON content. Skipping...`);
        continue;
      }

      const json = await res.json();
      if (json && !json.error) return json;
    } catch (e) {
      console.warn(`Proxy ${proxyUrl} failed:`, e);
    }
  }
  
  throw new Error("Market Hub Connectivity Lost (403/Forbidden)");
}

export function MarketWidget({ config }: { config: DiscoverConfig }) {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tickerList = useMemo(() => 
    config.stocks.map(s => s.split(' ')[0].toUpperCase()), 
    [config.stocks]
  );

  useEffect(() => {
    if (tickerList.length > 0 && !selectedSymbol) {
      setSelectedSymbol(tickerList[0]);
    }
  }, [tickerList, selectedSymbol]);

  const fetchStocks = useCallback(async () => {
    if (tickerList.length === 0) {
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const quoteResults = await Promise.all(
        tickerList.map(async (symbol) => {
          try {
            return await cachedFetch(
              `yahoo_v15_quote_${symbol}`,
              async () => {
                const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
                const json = await fetchYahooProxy(targetUrl);
                
                const meta = json.chart?.result?.[0]?.meta;
                if (!meta) return null;

                const currentPrice = meta.regularMarketPrice || 0;
                const prevClose = meta.chartPreviousClose || currentPrice;
                const change = currentPrice - prevClose;
                const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

                return {
                  symbol: symbol,
                  price: currentPrice,
                  change: change,
                  changePercent: `${changePercent.toFixed(2)}%`,
                } as StockData;
              },
              EXPIRY_TIMES.MARKET
            );
          } catch (e) {
            return null;
          }
        })
      );
      
      const validStocks = quoteResults.filter((s): s is StockData => s !== null);
      if (validStocks.length === 0 && tickerList.length > 0) {
        setError("Market Hub Access Denied (403). Try Refreshing.");
      } else {
        setStocks(validStocks);
      }
    } catch (err: any) {
      setError("Market Hub Offline.");
    } finally {
      setLoading(false);
    }
  }, [tickerList]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const fetchHistory = useCallback(async () => {
    if (!selectedSymbol || !isModalOpen) return;

    setHistLoading(true);
    setHistError(null);
    setHistoricalData([]);
    
    try {
      const data = await cachedFetch(
        `yahoo_v15_hist_${selectedSymbol}`,
        async () => {
          const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${selectedSymbol}?interval=1d&range=1mo`;
          const json = await fetchYahooProxy(targetUrl);
          
          const result = json.chart?.result?.[0];
          if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
            throw new Error("No trend signals found.");
          }

          const timestamps = result.timestamp;
          const prices = result.indicators.quote[0].close;

          return timestamps.map((ts: number, i: number) => {
            if (prices[i] === null || prices[i] === undefined) return null;
            return {
              date: new Date(ts * 1000).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
              price: parseFloat(prices[i].toFixed(2))
            };
          }).filter((item: any) => item !== null);
        },
        EXPIRY_TIMES.MARKET
      );
      
      setHistoricalData(data);
    } catch (err: any) {
      setHistError(err.message || "Historical Link Offline.");
    } finally {
      setHistLoading(false);
    }
  }, [selectedSymbol, isModalOpen]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSymbolSelect = (symbol: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSymbol(symbol);
  };

  if (tickerList.length === 0) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
          <BarChart3 className="w-12 h-12 mb-2 opacity-30" />
          <p className="font-medium">Market Setup Required</p>
          <p className="text-xs">Add tickers in onboarding or settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <div className="h-48 rounded-3xl-card animate-skeleton bg-muted/40" />;

  if (error && stocks.length === 0) {
    return (
      <Card className="rounded-3xl-card border-none bg-destructive/5 text-center p-8">
        <AlertCircle className="w-10 h-10 text-destructive/50 mx-auto mb-3" />
        <h4 className="text-sm font-black uppercase tracking-widest text-destructive/80 mb-2">Market Link Offline</h4>
        <p className="text-xs text-muted-foreground mb-6">{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchStocks()}
          className="rounded-full gap-2 border-destructive/20"
        >
          <RefreshCcw className="w-3 h-3" /> Retry Connection
        </Button>
      </Card>
    );
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Card className="rounded-3xl-card bg-card overflow-hidden cursor-pointer group hover:border-primary/50 transition-all">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground font-bold">
              Market Watch
            </CardTitle>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {stocks.map((stock, idx) => (
              <div key={`${stock.symbol}-${idx}`} className="flex items-center justify-between group/item">
                <div>
                  <p className="font-black text-xl font-headline group-hover/item:text-primary transition-colors">{stock.symbol}</p>
                  <p className="text-sm font-bold">
                    ${(stock.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="rounded-3xl border-none max-w-4xl bg-card p-0 overflow-hidden shadow-2xl">
        <div className="flex h-[600px]">
          <div className="w-72 bg-muted/10 border-r p-6 space-y-4 overflow-y-auto">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Portfolio</h4>
            <div className="space-y-2">
              {stocks.map(stock => (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={(e) => handleSymbolSelect(stock.symbol, e)}
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

          <div className="flex-1 p-10 flex flex-col bg-card">
            <DialogHeader className="mb-10">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <DialogTitle className="text-4xl font-headline font-black tracking-tight">
                    {selectedSymbol}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Real-time performance metrics and 30-day historical chart.
                  </DialogDescription>
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
                  {histError ? (
                    <>
                      <AlertCircle className="w-12 h-12 text-destructive mb-4 opacity-40" />
                      <p className="text-lg font-bold text-foreground/80 leading-tight">
                        {histError}
                      </p>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-12 h-12 text-primary/40 mb-4 animate-spin" />
                      <p className="text-lg font-bold text-foreground/80 leading-tight">
                        Awaiting Market Stream...
                      </p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground mt-4 max-w-sm">
                    Global Market Stream via Yahoo Finance Network.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-10 grid grid-cols-2 gap-6">
              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Connectivity</p>
                <p className="font-bold flex items-center gap-2 text-foreground/90 text-sm">
                  <Activity className="w-4 h-4" /> Real-time Verified
                </p>
              </div>
              <div className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10">
                <p className="text-[10px] font-black uppercase text-secondary mb-1 tracking-widest">Network</p>
                <p className="font-bold text-foreground/90 text-sm">Yahoo Finance Proxy</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
