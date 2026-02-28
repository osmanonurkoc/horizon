
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tickerList = useMemo(() => 
    config.stocks.map(s => s.split(' ')[0].toUpperCase()), 
    [config.stocks]
  );

  // Initial symbol selection
  useEffect(() => {
    if (tickerList.length > 0 && !selectedSymbol) {
      setSelectedSymbol(tickerList[0]);
    }
  }, [tickerList, selectedSymbol]);

  // Fetch quotes for the card view
  useEffect(() => {
    const fetchStocks = async () => {
      if (tickerList.length === 0) {
        setLoading(false);
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const symbols = tickerList.join(',');
        const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
        
        const data = await cachedFetch(
          `yahoo_quotes_v3_${symbols.replace(/,/g, '_')}`,
          async () => {
            const res = await fetch(
              `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
            );
            
            if (!res.ok) {
              if (res.status === 403) throw new Error("Market Hub Access Denied (403)");
              throw new Error(`Market Hub Offline (${res.status})`);
            }
            
            const json = await res.json();
            const results = json.quoteResponse?.result || [];
            
            return results.map((item: any) => ({
              symbol: item.symbol,
              price: item.regularMarketPrice || 0,
              change: item.regularMarketChange || 0,
              changePercent: `${(item.regularMarketChangePercent || 0).toFixed(2)}%`,
            }));
          },
          EXPIRY_TIMES.MARKET
        );
        
        setStocks(data);
        setError(null);
      } catch (err: any) {
        console.error("Quotes fetch error:", err);
        setError(err.message || "Unable to load market data.");
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
  }, [tickerList]);

  // Fetch historical data for the chart view
  useEffect(() => {
    if (!selectedSymbol || !isModalOpen) return;

    const fetchHistory = async () => {
      setHistLoading(true);
      setHistError(null);
      setHistoricalData([]);
      
      try {
        const data = await cachedFetch(
          `yahoo_chart_v3_${selectedSymbol}`,
          async () => {
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(selectedSymbol)}?interval=1d&range=1mo`;
            const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
            
            if (!res.ok) {
              if (res.status === 403) throw new Error("Chart Stream Access Denied (403)");
              throw new Error(`History Stream Offline (${res.status})`);
            }

            const json = await res.json();
            const result = json.chart?.result?.[0];
            
            if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
              throw new Error("No historical records found.");
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
        console.error("History fetch error:", err);
        setHistError(err.message || "Unable to sync trends.");
      } finally {
        setHistLoading(false);
      }
    };

    fetchHistory();
  }, [selectedSymbol, isModalOpen]);

  const handleSymbolSelect = useCallback((symbol: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSymbol(symbol);
  }, []);

  if (tickerList.length === 0) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6 text-center">
          <BarChart3 className="w-12 h-12 mb-2 opacity-30" />
          <p className="font-medium">Market Setup Required</p>
          <p className="text-xs">Add your favorite tickers in settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <div className="h-48 rounded-3xl-card animate-skeleton bg-muted/40" />;

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
            {stocks.length > 0 ? stocks.map((stock, idx) => (
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
            )) : (
              <div className="py-10 text-center space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-destructive/50" />
                <p className="text-sm font-bold text-muted-foreground">{error || "No real-time signals available."}</p>
              </div>
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
              {stocks.length > 0 ? stocks.map(stock => (
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
              )) : (
                <p className="text-xs text-muted-foreground italic p-4">No portfolio data found.</p>
              )}
            </div>
          </div>

          {/* Chart Area */}
          <div className="flex-1 p-10 flex flex-col bg-card">
            <DialogHeader className="mb-10">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <DialogTitle className="text-4xl font-headline font-black tracking-tight">
                    {selectedSymbol || "Market Insights"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {selectedSymbol 
                      ? `30-Day performance history for ${selectedSymbol}.` 
                      : "Detailed historical stock performance trends from Yahoo Finance."}
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
                        Awaiting Market Signals...
                      </p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground mt-4 max-w-sm">
                    Global Market Stream provided via Yahoo Finance.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-10 grid grid-cols-2 gap-6">
              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 transition-colors hover:bg-primary/10">
                <p className="text-[10px] font-black uppercase text-primary mb-1 tracking-widest">Connectivity</p>
                <p className="font-bold flex items-center gap-2 text-foreground/90 text-sm">
                  <Activity className="w-4 h-4" /> Global Finance Stream
                </p>
              </div>
              <div className="p-5 bg-secondary/5 rounded-2xl border border-secondary/10 transition-colors hover:bg-secondary/10">
                <p className="text-[10px] font-black uppercase text-secondary mb-1 tracking-widest">Provider</p>
                <p className="font-bold text-foreground/90 text-sm">Yahoo Finance Hub</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
