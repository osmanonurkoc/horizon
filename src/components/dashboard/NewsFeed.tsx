
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { type DiscoverConfig } from "@/lib/config-store";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import Image from "next/image";
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Article {
  title: string;
  description: string;
  url: string;
  image?: string;
  published_at: string;
  source: string;
  category: string;
}

export function NewsFeed({ config }: { config: DiscoverConfig }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchNews = async () => {
    if (!config.apiKeys.news) return;
    
    setLoading(true);
    if (offset === 0) setError(null);

    try {
      const keywords = config.newsTopics.length > 0 ? config.newsTopics.join(',') : 'general';
      const languages = config.newsLanguages.length > 0 ? config.newsLanguages.join(',') : 'en';
      
      const result = await cachedFetch(
        `news_mediastack_${keywords}_${languages}_${offset}`,
        async () => {
          try {
            // Using Mediastack as the alternative provider
            const res = await fetch(
              `https://api.mediastack.com/v1/news?access_key=${config.apiKeys.news}&keywords=${encodeURIComponent(keywords)}&languages=${languages}&limit=12&offset=${offset}`
            );
            
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error?.message || `News API error: ${res.status}`);
            }
            
            const json = await res.json();
            if (!json.data) throw new Error("No data found in response");
            
            // Map the Mediastack format to our internal Article interface
            return json.data as Article[];
          } catch (err: any) {
            if (err.name === 'TypeError' || err.message.includes('fetch')) {
              throw new Error("Network error: Failed to reach the news service. This might be due to connection issues or API restrictions.");
            }
            throw err;
          }
        },
        EXPIRY_TIMES.NEWS
      );
      
      if (result) {
        setArticles(prev => offset === 0 ? result : [...prev, ...result]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch news. Please check your network or API key.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [config, offset]);

  useEffect(() => {
    if (error) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && !error) {
        setOffset(prev => prev + 12);
      }
    }, { threshold: 1 });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loading, error]);

  if (!config.apiKeys.news) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed h-40 flex items-center justify-center">
        <p className="text-muted-foreground italic font-medium">Mediastack API Key required to view feed.</p>
      </Card>
    );
  }

  if (error && articles.length === 0) {
    return (
      <Card className="rounded-3xl-card border-destructive/20 bg-destructive/5 p-12 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
        <h4 className="text-xl font-headline font-bold text-destructive mb-2">Deep Dive Interrupted</h4>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => { setOffset(0); fetchNews(); }}
          className="rounded-full gap-2 border-destructive/20 hover:bg-destructive/10"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="masonry-grid">
        {articles.map((article, idx) => (
          <a key={`${article.url}-${idx}`} href={article.url} target="_blank" rel="noopener noreferrer" className="block group">
            <Card className="rounded-3xl-card overflow-hidden bg-card border-none shadow-sm hover:shadow-xl transition-all duration-500">
              {article.image && (
                <div className="relative h-48 w-full overflow-hidden">
                  <Image 
                    src={article.image} 
                    alt={article.title} 
                    fill 
                    unoptimized={true}
                    className="object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {article.source || 'News'}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {new Date(article.published_at).toLocaleDateString()}
                    </span>
                  </div>
                  {article.category && (
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {article.category}
                    </span>
                  )}
                </div>
                <h4 className="text-lg font-headline font-bold leading-snug group-hover:text-primary transition-colors mb-3">
                  {article.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {article.description}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
        
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="h-80 rounded-3xl-card animate-skeleton bg-muted/40" />
        ))}
      </div>
      
      {error && articles.length > 0 && (
        <div className="text-center p-6 bg-destructive/5 rounded-2xl border border-destructive/10 flex items-center justify-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-destructive font-medium text-sm">Failed to load more: {error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchNews()} className="text-xs h-8">Retry</Button>
        </div>
      )}

      <div ref={loaderRef} className="h-10 w-full flex items-center justify-center">
        {loading && articles.length > 0 && <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />}
      </div>
    </div>
  );
}
