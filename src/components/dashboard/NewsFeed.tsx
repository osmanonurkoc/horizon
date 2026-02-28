"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { type DiscoverConfig } from "@/lib/config-store";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import Image from "next/image";
import { AlertCircle, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react";
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
  const [isRateLimited, setIsRateLimited] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchNews = async (isRetry = false) => {
    if (!config.apiKeys.news) return;
    
    setLoading(true);
    if (offset === 0 || isRetry) {
      setError(null);
      setIsRateLimited(false);
    }

    try {
      // For free tier Mediastack, we must be careful with complex queries and pagination
      const keywords = config.newsTopics.length > 0 ? config.newsTopics.join(' ') : 'news';
      const languages = config.newsLanguages.length > 0 ? config.newsLanguages[0] : 'en'; // Single lang often more stable
      
      const result = await cachedFetch(
        `news_v4_${encodeURIComponent(keywords)}_${languages}_${offset}`,
        async () => {
          // Note: Use http for mediastack free tier if https causes issues, but try https first
          const url = `https://api.mediastack.com/v1/news?access_key=${config.apiKeys.news}&keywords=${encodeURIComponent(keywords)}&languages=${languages}&limit=12&offset=${offset}`;
          
          const res = await fetch(url);
          const json = await res.json();

          if (json.error) {
            if (json.error.code === 'rate_limit_reached') {
              throw new Error("RATE_LIMIT");
            }
            throw new Error(json.error.message || "Failed to fetch news.");
          }
          
          if (!json.data) throw new Error("Invalid API Response");
          
          return json.data as Article[];
        },
        EXPIRY_TIMES.NEWS
      );
      
      if (result) {
        setArticles(prev => offset === 0 ? result : [...prev, ...result]);
      }
    } catch (err: any) {
      if (err.message === "RATE_LIMIT") {
        setIsRateLimited(true);
        setError("Monthly API limit reached for Mediastack (500/mo on free tier).");
      } else {
        setError(err.message || "Deep Dive interrupted by a network glitch.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [config, offset]);

  useEffect(() => {
    if (error || loading || isRateLimited) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && articles.length > 0) {
        // Only paginate if not at risk of hitting limits too fast
        setOffset(prev => prev + 12);
      }
    }, { threshold: 0.1 });

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [loading, error, articles.length, isRateLimited]);

  if (!config.apiKeys.news) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed h-40 flex items-center justify-center">
        <p className="text-muted-foreground italic font-medium">Mediastack API Key required to view feed.</p>
      </Card>
    );
  }

  if (error && articles.length === 0) {
    return (
      <Card className={`rounded-3xl-card border-none p-12 text-center ${isRateLimited ? 'bg-orange-500/5' : 'bg-destructive/5'}`}>
        {isRateLimited ? (
          <ShieldAlert className="w-12 h-12 text-orange-500 mx-auto mb-4 opacity-50" />
        ) : (
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
        )}
        <h4 className={`text-xl font-headline font-bold mb-2 ${isRateLimited ? 'text-orange-600' : 'text-destructive'}`}>
          {isRateLimited ? 'Subscription Limit Reached' : 'Deep Dive Interrupted'}
        </h4>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
        {!isRateLimited && (
          <Button 
            variant="outline" 
            onClick={() => { setOffset(0); fetchNews(true); }}
            className="rounded-full gap-2 border-destructive/20 hover:bg-destructive/10"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      {/* TRUE MASONRY LAYOUT */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {articles.map((article, idx) => (
          <a 
            key={`${article.url}-${idx}`} 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block group break-inside-avoid mb-6"
          >
            <Card className="rounded-3xl-card overflow-hidden bg-card border-none shadow-sm hover:shadow-xl transition-all duration-500">
              {article.image && (
                <div className="relative h-48 w-full overflow-hidden bg-muted/20">
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
                      {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
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
        
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="h-80 rounded-3xl-card animate-skeleton bg-muted/40 break-inside-avoid mb-6" />
        ))}
      </div>
      
      {error && articles.length > 0 && (
        <div className="text-center p-6 bg-destructive/5 rounded-2xl border border-destructive/10 flex items-center justify-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-destructive font-medium text-sm">Update paused. API limits may apply.</p>
          <Button variant="ghost" size="sm" onClick={() => fetchNews(true)} className="text-xs h-8">Retry</Button>
        </div>
      )}

      <div ref={loaderRef} className="h-10 w-full flex items-center justify-center">
        {loading && articles.length > 0 && <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />}
      </div>
    </div>
  );
}