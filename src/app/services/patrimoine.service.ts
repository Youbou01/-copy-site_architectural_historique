import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SiteHistorique } from '../models/site-historique';

/**
 * Service métier pour la gestion des patrimoines (sites historiques racines) et de leurs monuments.
 * 
 * Responsabilités:
 * - Récupération des données patrimoniales depuis l'API REST
 * - Gestion du cache en mémoire via des signaux Angular
 * - Gestion des états de chargement et d'erreur
 * - Stockage du patrimoine actuellement consulté pour optimiser la navigation
 */
@Injectable({ providedIn: 'root' })
export class PatrimoineService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/patrimoines';

  // Signal cache: liste complète des sites racine chargés depuis l'API
  readonly patrimoines = signal<SiteHistorique[]>([]);
  
  // Signal indiquant si une requête HTTP est en cours
  readonly loading = signal<boolean>(false);
  
  // Signal contenant le message d'erreur en cas d'échec, null sinon
  readonly error = signal<string | null>(null);

  // Cache du patrimoine actuellement consulté en détail (inclut les monuments complets)
  // Permet d'éviter de recharger les données lors de la navigation vers un monument enfant
  readonly currentPatrimoine = signal<SiteHistorique | null>(null);

  /**
   * Charge tous les patrimoines depuis l'API si le cache est vide.
   * Implémente une stratégie de mémoisation simple pour éviter les requêtes redondantes.
   * Met à jour les signaux loading, error et patrimoines selon le résultat.
   */
  loadAll() {
    // Simple mémoisation: ne recharge pas si des données sont déjà présentes
    if (this.patrimoines().length) return;
    
    this.loading.set(true);
    this.http.get<SiteHistorique[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.patrimoines.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Impossible de charger les patrimoines');
        console.error(err);
        this.loading.set(false);
      },
    });
  }

  /**
   * Récupère un patrimoine spécifique par son ID, incluant tous ses monuments.
   * Retourne un Observable pour permettre aux composants de gérer la souscription.
   * 
   * @param id - Identifiant unique du patrimoine à récupérer
   * @returns Observable émettant le patrimoine complet avec ses monuments
   */
  getById(id: string) {
    return this.http.get<SiteHistorique>(`${this.baseUrl}/${id}`);
  }
}
