import { Injectable, signal, effect } from '@angular/core';
import { SiteHistorique } from '../models/site-historique';

export type FavoriteKind = 'patrimoine' | 'monument';
export interface FavoriteItem {
  id: string;
  kind: FavoriteKind;
  parentId?: string; // only for monuments
  nom: string;
  categories: string[];
  photo?: string;
}

const STORAGE_KEY = 'favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private load(): FavoriteItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as FavoriteItem[];
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn('Failed to parse favorites from storage', e);
    }
    return [];
  }

  favorites = signal<FavoriteItem[]>(this.load());

  constructor() {
    effect(() => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favorites()));
      } catch (e) {
        console.warn('Failed to persist favorites', e);
      }
    });
  }

  isPatrimoineFavorite(p: SiteHistorique | null): boolean {
    if (!p) return false;
    return this.favorites().some((f) => f.kind === 'patrimoine' && f.id === p.id);
  }

  isMonumentFavorite(parentId: string | null, m: SiteHistorique | null): boolean {
    if (!parentId || !m) return false;
    return this.favorites().some(
      (f) => f.kind === 'monument' && f.parentId === parentId && f.id === m.id
    );
  }

  togglePatrimoine(p: SiteHistorique | null) {
    if (!p) return;
    if (this.isPatrimoineFavorite(p)) {
      this.favorites.update((list) =>
        list.filter((f) => !(f.kind === 'patrimoine' && f.id === p.id))
      );
    } else {
      const item: FavoriteItem = {
        id: p.id,
        kind: 'patrimoine',
        nom: p.nom,
        categories: p.categories ?? [],
        photo: p.photoCarousel?.[0],
      };
      this.favorites.update((list) => [...list, item]);
    }
  }

  toggleMonument(parentId: string | null, m: SiteHistorique | null) {
    if (!parentId || !m) return;
    if (this.isMonumentFavorite(parentId, m)) {
      this.favorites.update((list) =>
        list.filter((f) => !(f.kind === 'monument' && f.parentId === parentId && f.id === m.id))
      );
    } else {
      const item: FavoriteItem = {
        id: m.id,
        parentId,
        kind: 'monument',
        nom: m.nom,
        categories: m.categories ?? [],
        photo: m.photoCarousel?.[0],
      };
      this.favorites.update((list) => [...list, item]);
    }
  }

  remove(kind: FavoriteKind, id: string, parentId?: string) {
    this.favorites.update((list) =>
      list.filter(
        (f) =>
          !(
            f.kind === kind &&
            f.id === id &&
            (kind === 'monument' ? f.parentId === parentId : true)
          )
      )
    );
  }
}
