import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, shareReplay, map, catchError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** Structure de réponse d'une photo depuis l'API Unsplash */
interface UnsplashApiPhotoResult {
  id: string;
  urls: { regular: string; thumb: string };
  user: { name: string };
  links: { html: string };
  alt_description?: string;
  description?: string;
}

/**
 * Interface représentant une image récupérée depuis une source externe.
 * Format unifié pour Unsplash et Wikimedia Commons.
 */
export interface FetchedImage {
  /** Identifiant unique de l'image depuis la source */
  id: string;
  
  /** URL de l'image en pleine résolution */
  src: string;
  
  /** URL de la miniature (thumbnail) */
  thumb: string;
  
  /** Nom de l'auteur/photographe */
  author: string;
  
  /** URL vers la page source de l'image */
  sourceUrl: string;
  
  /** Texte alternatif pour l'accessibilité */
  alt: string;
  
  /** Terme de recherche utilisé pour récupérer cette image */
  query: string;
  
  /** Source de l'image (Unsplash ou Wikimedia Commons) */
  source: 'unsplash' | 'commons';
  
  /** Licence d'utilisation (principalement pour Commons) */
  license?: string;
}

/**
 * Service de récupération et gestion d'images externes depuis Unsplash et Wikimedia Commons.
 * 
 * Responsabilités:
 * - Récupération d'images pertinentes pour enrichir les galeries de patrimoines/monuments
 * - Gestion du cache en mémoire pour éviter les requêtes API redondantes
 * - Scoring et filtrage intelligent des résultats de recherche
 * - Unification des formats de réponse entre différentes sources
 */
@Injectable({ providedIn: 'root' })
export class ImageService {
  private http = inject(HttpClient);

  // Cache des images Unsplash, indexé par nom de patrimoine normalisé
  private cache = signal<Record<string, FetchedImage[]>>({});
  
  // Cache des images Wikimedia Commons, indexé par nom de patrimoine normalisé
  private commonsCache = signal<Record<string, FetchedImage[]>>({});
  
  // Ensemble des clés actuellement en cours de chargement
  private loadingSet = signal<Set<string>>(new Set());
  
  // Map des messages d'erreur par clé de recherche
  private errorMap = signal<Record<string, string>>({});
  
  // Map des observables de requête pour éviter les doublons (partage de requête)
  private requestMap: Record<string, Observable<FetchedImage[]>> = {};

  /**
   * Retourne toutes les images (Unsplash + Commons) disponibles pour un patrimoine donné.
   * @param name - Nom du patrimoine ou monument
   * @returns Tableau fusionné d'images des deux sources
   */
  imagesFor = (name: string): FetchedImage[] => {
    const key = this.normalize(name);
    return [...(this.cache()[key] ?? []), ...(this.commonsCache()[key] ?? [])];
  };

  /**
   * Vérifie si une requête est en cours de chargement pour un nom donné.
   * @param name - Nom du patrimoine/monument
   */
  isLoading = (name: string): boolean => this.loadingSet().has(this.normalize(name));
  
  /**
   * Récupère le message d'erreur éventuel pour une recherche donnée.
   * @param name - Nom du patrimoine/monument
   */
  errorFor = (name: string): string | undefined => this.errorMap()[this.normalize(name)];

  /**
   * Récupère des images depuis Unsplash pour un terme de recherche donné.
   * Implémente un système de cache et de partage de requête (shareReplay).
   * 
   * @param name - Nom du patrimoine ou monument à rechercher
   * @param limit - Nombre d'images à retourner (défaut: 2)
   * @returns Observable émettant un tableau d'images filtrées et scorées
   */
  fetchFor$(name: string, limit = 2): Observable<FetchedImage[]> {
    const key = this.normalize(name);
    if (!name.trim()) return of([]);
    
    // Retourne l'observable en cache si une requête est déjà en cours pour cette clé
    if (this.requestMap[key]) return this.requestMap[key];

    // Si des images sont déjà en cache, les retourner immédiatement
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
      per_page: String(Math.max(limit * 3, limit)), // Récupère un pool plus large pour filtrage
      client_id: accessKey,
      orientation: 'landscape',
    };

    const obs = this.http.get<{ results: UnsplashApiPhotoResult[] }>(url, { params }).pipe(
      map((res) => this.refineAndPick(res.results, limit, query)),
      map((picked) => {
        // Mise à jour du cache avec les images filtrées
        this.cache.set({ ...this.cache(), [key]: picked });
        return picked;
      }),
      catchError((err) => {
        console.error('Unsplash fetch error', err);
        this.errorMap.set({ ...this.errorMap(), [key]: 'Images indisponibles' });
        return of([]);
      }),
      shareReplay(1) // Partage le résultat entre tous les abonnés
    );

    this.requestMap[key] = obs;

    // Marque le chargement comme terminé lors de la complétion
    obs.subscribe({ complete: () => this.markLoading(key, false) });
    return obs;
  }

  /**
   * Filtre et score les résultats Unsplash pour ne retourner que les plus pertinents.
   * Utilise un scoring basé sur la correspondance des mots-clés dans les descriptions.
   * 
   * @param results - Résultats bruts de l'API Unsplash
   * @param limit - Nombre d'images à retourner
   * @param query - Terme de recherche utilisé
   * @returns Tableau d'images formatées et triées par pertinence
   */
  private refineAndPick(
    results: UnsplashApiPhotoResult[],
    limit: number,
    query: string
  ): FetchedImage[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    
    // Enrichissement avec score de pertinence
    const enriched = results.map((r) => {
      const text = (r.alt_description || r.description || '').toLowerCase();
      const scoreContent = words.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
      // Pénalité pour les images sans description (souvent génériques)
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

  /**
   * Récupère des images depuis Wikimedia Commons pour un terme de recherche donné.
   * Utilise l'API MediaWiki pour trouver des images libres de droits.
   * 
   * @param name - Nom du patrimoine ou monument à rechercher
   * @param limit - Nombre d'images à retourner (défaut: 2)
   * @returns Observable émettant un tableau d'images filtrées et scorées
   */
  fetchCommons$(name: string, limit = 2): Observable<FetchedImage[]> {
    const key = this.normalize(name);
    if (!name.trim()) return of([]);
    
    const existing = this.commonsCache()[key];
    if (existing?.length) return of(existing);

    const query = name.trim();
    // Utilise une recherche entre guillemets pour plus de précision
    const url = 'https://commons.wikimedia.org/w/api.php';
    const params: Record<string, string> = {
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: `"${query}"`,
      gsrlimit: String(Math.max(limit * 6, limit)), // Pool élargi pour filtrage
      gsrnamespace: '6', // Namespace "File" uniquement
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '1280',
    };

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
          .filter((img) => img.src); // Ne garde que les images avec URL valide
          
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

  /**
   * Calcule un score de pertinence pour une page Wikimedia Commons.
   * Favorise les photos réelles et pénalise logos, cartes, icônes.
   * 
   * @param page - Objet page depuis l'API Wikimedia
   * @param query - Terme de recherche
   * @returns Objet avec score et page originale
   */
  private scoreCommonsPage(page: any, query: string): { score: number; page: any } {
    const title: string = (page.title || '').toLowerCase();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 0;
    
    // Score basé sur correspondance des mots dans le titre
    for (const w of words) if (title.includes(w)) score += 2;
    
    // Pénalités pour types d'images non souhaités
    const ext = title.split('.').pop() || '';
    if (['svg', 'gif', 'webp'].includes(ext)) score -= 2; // Évite logos/graphiques
    if (/logo|map|flag|icon/.test(title)) score -= 3;
    
    // Préfère images de résolution raisonnable
    const width = page.imageinfo?.[0]?.width || 0;
    if (width < 600) score -= 1;
    
    // Image inutilisable si pas d'URL
    if (!page.imageinfo?.[0]?.url) score = -10;
    
    return { score, page };
  }

  /**
   * Normalise un nom pour utilisation comme clé de cache (minuscules, trimmed).
   */
  private normalize(name: string) {
    return name.trim().toLowerCase();
  }

  /**
   * Marque une clé comme étant en cours de chargement ou non.
   */
  private markLoading(key: string, loading: boolean) {
    const set = new Set(this.loadingSet());
    if (loading) set.add(key);
    else set.delete(key);
    this.loadingSet.set(set);
  }
}
