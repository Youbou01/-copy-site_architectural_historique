import { Injectable, signal, effect } from '@angular/core';
import { SiteHistorique } from '../models/site-historique';

/** Type identifiant le type de favori: patrimoine parent ou monument enfant */
export type FavoriteKind = 'patrimoine' | 'monument';

/**
 * Interface représentant un élément favori simplifié.
 * Contient les informations essentielles pour afficher un favori sans recharger tout l'objet.
 */
export interface FavoriteItem {
  /** Identifiant unique de l'élément favori */
  id: string;
  
  /** Type de favori (patrimoine ou monument) */
  kind: FavoriteKind;
  
  /** ID du patrimoine parent (uniquement pour les monuments) */
  parentId?: string;
  
  /** Nom du site ou monument favori */
  nom: string;
  
  /** Catégories associées pour l'affichage */
  categories: string[];
  
  /** URL de la photo principale (optionnelle) */
  photo?: string;
}

const STORAGE_KEY = 'favorites';

/**
 * Service de gestion des favoris utilisateur.
 * 
 * Responsabilités:
 * - Stockage et récupération des favoris depuis localStorage
 * - Gestion de l'état réactif via un signal Angular
 * - Distinction entre patrimoines et monuments favoris
 * - Persistance automatique lors des modifications
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  /**
   * Charge les favoris depuis le localStorage au démarrage.
   * Gère les erreurs de parsing et retourne un tableau vide en cas d'échec.
   */
  private load(): FavoriteItem[] {
    // Vérifie l'environnement navigateur (SSR safety)
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

  // Signal réactif contenant tous les favoris de l'utilisateur
  favorites = signal<FavoriteItem[]>(this.load());

  constructor() {
    // Effect automatique: persiste les favoris dans localStorage à chaque modification
    effect(() => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.favorites()));
      } catch (e) {
        console.warn('Failed to persist favorites', e);
      }
    });
  }

  /**
   * Vérifie si un patrimoine est dans les favoris.
   * @param p - Le patrimoine à vérifier
   * @returns true si le patrimoine est favori, false sinon
   */
  isPatrimoineFavorite(p: SiteHistorique | null): boolean {
    if (!p) return false;
    return this.favorites().some((f) => f.kind === 'patrimoine' && f.id === p.id);
  }

  /**
   * Vérifie si un monument spécifique est dans les favoris.
   * Nécessite l'ID du patrimoine parent car les monuments peuvent avoir des IDs identiques dans différents patrimoines.
   * 
   * @param parentId - ID du patrimoine parent
   * @param m - Le monument à vérifier
   * @returns true si le monument est favori, false sinon
   */
  isMonumentFavorite(parentId: string | null, m: SiteHistorique | null): boolean {
    if (!parentId || !m) return false;
    return this.favorites().some(
      (f) => f.kind === 'monument' && f.parentId === parentId && f.id === m.id
    );
  }

  /**
   * Ajoute ou retire un patrimoine des favoris (toggle).
   * @param p - Le patrimoine à basculer
   */
  togglePatrimoine(p: SiteHistorique | null) {
    if (!p) return;
    if (this.isPatrimoineFavorite(p)) {
      // Retirer du favori
      this.favorites.update((list) =>
        list.filter((f) => !(f.kind === 'patrimoine' && f.id === p.id))
      );
    } else {
      // Ajouter aux favoris
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

  /**
   * Ajoute ou retire un monument des favoris (toggle).
   * @param parentId - ID du patrimoine parent
   * @param m - Le monument à basculer
   */
  toggleMonument(parentId: string | null, m: SiteHistorique | null) {
    if (!parentId || !m) return;
    if (this.isMonumentFavorite(parentId, m)) {
      // Retirer du favori
      this.favorites.update((list) =>
        list.filter((f) => !(f.kind === 'monument' && f.parentId === parentId && f.id === m.id))
      );
    } else {
      // Ajouter aux favoris
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

  /**
   * Supprime un favori spécifique de la liste.
   * @param kind - Type de favori (patrimoine ou monument)
   * @param id - ID de l'élément à supprimer
   * @param parentId - ID du parent (requis pour les monuments)
   */
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
