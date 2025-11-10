import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SiteHistorique } from '../models/site-historique';

// Service métier pour gérer les patrimoines (sites racine + monuments imbriqués)
@Injectable({ providedIn: 'root' })
export class PatrimoineService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/patrimoines';

  // signal cache (liste des sites racine)
  readonly patrimoines = signal<SiteHistorique[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Cache for currently viewed detailed patrimoine (with full monuments data)
  readonly currentPatrimoine = signal<SiteHistorique | null>(null);

  loadAll() {
    if (this.patrimoines().length) return; // simple memoization
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

  getById(id: string) {
    return this.http.get<SiteHistorique>(`${this.baseUrl}/${id}`);
  }
}
