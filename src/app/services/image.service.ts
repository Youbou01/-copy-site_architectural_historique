import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, shareReplay, map, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

interface UnsplashApiPhotoResult {
  id: string;
  urls: { regular: string; thumb: string };
  user: { name: string };
  links: { html: string };
  alt_description?: string;
  description?: string;
}

export interface FetchedImage {
  id: string;
  src: string;
  thumb: string;
  author: string;
  sourceUrl: string;
  alt: string;
  query: string;
  source: 'unsplash' | 'commons';
  license?: string;
}

@Injectable({ providedIn: 'root' })
export class ImageService {
  private http = inject(HttpClient);

  // Cache keyed by normalized query (entity name)
  private cache = signal<Record<string, FetchedImage[]>>({}); // Unsplash cache
  private commonsCache = signal<Record<string, FetchedImage[]>>({}); // Wikimedia Commons cache
  private loadingSet = signal<Set<string>>(new Set());
  private errorMap = signal<Record<string, string>>({});
  private requestMap: Record<string, Observable<FetchedImage[]>> = {};

  imagesFor = (name: string): FetchedImage[] => {
    const key = this.normalize(name);
    return [...(this.cache()[key] ?? []), ...(this.commonsCache()[key] ?? [])];
  };

  isLoading = (name: string): boolean => this.loadingSet().has(this.normalize(name));
  errorFor = (name: string): string | undefined => this.errorMap()[this.normalize(name)];

  // Observable-based fetch with caching and replay
  fetchFor$(name: string, limit = 2): Observable<FetchedImage[]> {
    const key = this.normalize(name);
    if (!name.trim()) return of([]);
    // Serve cached observable if exists
    if (this.requestMap[key]) return this.requestMap[key];

    // If we already have cached images, just return them as observable
    if (this.cache()[key]?.length) {
      this.requestMap[key] = of(this.cache()[key]);
      return this.requestMap[key];
    }

    this.markLoading(key, true);
    const accessKey = environment.unsplash.accessKey;
    const query = name;
    const url = 'https://api.unsplash.com/search/photos';
    const params = {
      query,
      per_page: String(Math.max(limit * 3, limit)), // fetch wider pool
      client_id: accessKey,
      orientation: 'landscape',
    };

    const obs = this.http.get<{ results: UnsplashApiPhotoResult[] }>(url, { params }).pipe(
      map((res) => this.refineAndPick(res.results, limit, query)),
      map((picked) => {
        this.cache.set({ ...this.cache(), [key]: picked });
        return picked;
      }),
      catchError((err) => {
        console.error('Unsplash fetch error', err);
        this.errorMap.set({ ...this.errorMap(), [key]: 'Images indisponibles' });
        return of([]);
      }),
      shareReplay(1)
    );

    this.requestMap[key] = obs;

    // Mark loading false when first emission occurs
    obs.subscribe({ complete: () => this.markLoading(key, false) });
    return obs;
  }

  private refineAndPick(
    results: UnsplashApiPhotoResult[],
    limit: number,
    query: string
  ): FetchedImage[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    // Additional filtering: remove obviously unrelated (score 0 and empty descriptions)
    const enriched = results.map((r) => {
      const text = (r.alt_description || r.description || '').toLowerCase();
      const scoreContent = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
      // Penalize generic images (no text)
      const emptyPenalty = text.trim() === '' ? -1 : 0;
      const score = scoreContent + emptyPenalty;
      return { score, raw: r };
    });
    enriched.sort((a, b) => b.score - a.score);
    const filtered = enriched.filter((e) => e.score > 0);
    const take = (filtered.length ? filtered : enriched).slice(0, limit);
    return take.map((s) => {
      const r = s.raw;
      return {
        id: r.id,
        src: r.urls.regular,
        thumb: r.urls.thumb,
        author: r.user?.name ?? 'Inconnu',
        sourceUrl: r.links?.html,
        alt: r.alt_description || r.description || `Photo de ${r.user?.name || 'Auteur inconnu'}`,
        query,
        source: 'unsplash',
      };
    });
  }

  // Wikimedia Commons observable fetch
  fetchCommons$(name: string, limit = 2): Observable<FetchedImage[]> {
    const key = this.normalize(name);
    if (!name.trim()) return of([]);
    const existing = this.commonsCache()[key];
    if (existing?.length) return of(existing);

    const query = name.trim();
    // Use quoted phrase for precision; fallback handled in scoring.
    const url = 'https://commons.wikimedia.org/w/api.php';
    const params: Record<string, string> = {
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: `"${query}"`,
      gsrlimit: String(Math.max(limit * 6, limit)),
      gsrnamespace: '6', // File namespace
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '1280',
    };

    // Build query string
    const searchParams = new URLSearchParams(params);
    const fullUrl = `${url}?${searchParams.toString()}`;

    return this.http.get<any>(fullUrl).pipe(
      map((res) => {
        const pages = res?.query?.pages ? Object.values(res.query.pages) : [];
        const scored = pages.map((p: any) => this.scoreCommonsPage(p, query));
        scored.sort((a, b) => b.score - a.score);
        const filtered = scored.filter((s) => s.score > 0);
        const chosen = (filtered.length ? filtered : scored).slice(0, limit);
        const images: FetchedImage[] = chosen
          .map((c) => ({
            id: String(c.page.pageid),
            src: c.page.imageinfo?.[0]?.url || '',
            thumb: c.page.imageinfo?.[0]?.url || '',
            author:
              c.page.imageinfo?.[0]?.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ||
              'Auteur inconnu',
            sourceUrl: c.page.imageinfo?.[0]?.descriptionurl || '',
            alt: c.page.title?.replace(/^File:/, '') || `Image de ${query}`,
            query,
            source: 'commons' as const,
            license: c.page.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || undefined,
          }))
          .filter((img) => img.src);
        this.commonsCache.set({ ...this.commonsCache(), [key]: images });
        return images;
      }),
      catchError((err) => {
        console.error('Commons fetch error', err);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  private scoreCommonsPage(page: any, query: string): { score: number; page: any } {
    const title: string = (page.title || '').toLowerCase();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 0;
    for (const w of words) if (title.includes(w)) score += 2; // stronger weight
    const ext = title.split('.').pop() || '';
    if (['svg', 'gif', 'webp'].includes(ext)) score -= 2; // deprioritize logos/graphics
    if (/logo|map|flag|icon/.test(title)) score -= 3;
    const width = page.imageinfo?.[0]?.width || 0;
    if (width < 600) score -= 1; // prefer reasonable resolution
    if (!page.imageinfo?.[0]?.url) score = -10; // unusable
    return { score, page };
  }

  private normalize(name: string) {
    return name.trim().toLowerCase();
  }

  private markLoading(key: string, loading: boolean) {
    const set = new Set(this.loadingSet());
    if (loading) set.add(key);
    else set.delete(key);
    this.loadingSet.set(set);
  }
}
