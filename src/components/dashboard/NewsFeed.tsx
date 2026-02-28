"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { type DiscoverConfig } from "@/lib/config-store";
import { cachedFetch, EXPIRY_TIMES } from "@/lib/api-fetcher";
import Image from "next/image";
import { AlertCircle, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchGNewsAction } from "@/app/actions/news";

interface Article {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

export function NewsFeed({ config }: { config: DiscoverConfig }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const observerTarget = useRef(null);

  const fetchNews = useCallback(async (pageNum: number, isInitial: boolean = false) => {
    if (!config.apiKeys.news) return;
    
    setLoading(true);
    setError(null);

    try {
      const q = config.newsTopics.length > 0 ? config.newsTopics.join(' OR ') : 'general';
      const languages = config.newsLanguages.length > 0 ? config.newsLanguages : ['en'];
      
      const languageRequests = languages.map(lang => 
        cachedFetch(
          `gnews_v6_${encodeURIComponent(q)}_${lang}_p${pageNum}_${config.apiKeys.news.slice(-4)}`,
          async () => {
            return await fetchGNewsAction(q, lang, pageNum, config.apiKeys.news);
          },
          EXPIRY_TIMES.NEWS
        )
      );

      const results = await Promise.all(languageRequests);
      const combinedArticles: Article[] = results.flat();

      if (combinedArticles.length === 0) {
        setHasMore(false);
      } else {
        setArticles(prev => {
          const baseArticles = isInitial ? [] : prev;
          const merged = [...baseArticles, ...combinedArticles];
          
          const uniqueArticles = Array.from(new Map(merged.map(a => [a.url, a])).values());
          
          return uniqueArticles.sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
        });
      }
    } catch (err: any) {
      setError(err.message || "Deep Dive interrupted by a network glitch.");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    setPage(1);
    fetchNews(1, true);
  }, [fetchNews]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && articles.length > 0) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchNews(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, fetchNews, articles.length]);

  if (!config.apiKeys.news) {
    return (
      <Card className="rounded-3xl-card bg-muted/20 border-dashed h-40 flex items-center justify-center">
        <p className="text-muted-foreground italic font-medium">GNews API Key required to view feed.</p>
      </Card>
    );
  }

  if (error && articles.length === 0) {
    return (
      <Card className="rounded-3xl-card border-none p-12 text-center bg-destructive/5">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4 opacity-50" />
        <h4 className="text-xl font-headline font-bold mb-2 text-destructive">Deep Dive Interrupted</h4>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => fetchNews(1, true)}
          className="rounded-full gap-2 border-destructive/20 hover:bg-destructive/10"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-0">
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
                      {article.source.name}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Recent'}
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
          <div key={`skeleton-${i}`} className="h-64 rounded-3xl-card animate-skeleton bg-muted/40 break-inside-avoid mb-6" />
        ))}
      </div>
      
      <div ref={observerTarget} className="h-20 flex items-center justify-center">
        {loading && articles.length > 0 && (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">Loading more global insight...</span>
          </div>
        )}
        {!hasMore && articles.length > 0 && (
          <p className="text-muted-foreground italic text-sm">You have reached the end of the current horizon.</p>
        )}
      </div>

      {!loading && articles.length === 0 && (
        <div className="py-20 text-center text-muted-foreground italic">
          No articles found for your selected topics and languages.
        </div>
      )}
    </div>
  );
}