import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { PatrimoineCardComponent } from '../patrimoine-card/patrimoine-card.component';
import { trigger, transition, query, style, animate, stagger } from '@angular/animations';

/**
 * Composant de liste des patrimoines avec filtrage, tri et recherche.
 * 
 * Responsabilités:
 * - Affichage de tous les patrimoines sous forme de grille ou liste
 * - Filtrage par recherche textuelle et par catégorie
 * - Tri alphabétique (croissant/décroissant)
 * - Basculement entre modes d'affichage (grille/liste, dense/normal)
 * - Animation en cascade (stagger) lors de l'entrée des cartes
 */
@Component({
  selector: 'app-patrimoine-list',
  standalone: true,
  imports: [CommonModule, PatrimoineCardComponent],
  animations: [
    // Animation listStagger: entrée en cascade des cartes patrimoniales
    trigger('listStagger', [
      transition(':enter', [
        query(
          'app-patrimoine-card',
          [
            style({ opacity: 0, transform: 'translateY(10px) scale(.98)' }),
            stagger(60, animate('300ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'none' }))),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
  templateUrl: './patrimoine-list.component.html',
  styleUrls: ['./patrimoine-list.component.css'],
})
export class PatrimoineListComponent implements OnInit {
  private service: PatrimoineService = inject(PatrimoineService);

  // Signaux dérivés: lecture directe depuis le service
  patrimoines = computed(() => this.service.patrimoines());
  loading = computed(() => this.service.loading());
  error = computed(() => this.service.error());

  // Signaux locaux: état de l'interface utilisateur
  search = signal('');                                    // Texte de recherche
  category = signal('');                                  // Catégorie sélectionnée pour filtrage
  sortMode = signal<'alpha' | 'reverse' | 'none'>('none'); // Mode de tri
  viewMode = signal<'grid' | 'list'>('grid');             // Mode d'affichage (grille ou liste)
  dense = signal(false);                                   // Mode d'affichage compact

  /**
   * Calcul dérivé: liste unique de toutes les catégories présentes dans les patrimoines.
   * Utilisé pour générer les filtres de catégorie dans l'interface.
   */
  categories = computed(() => {
    const set = new Set<string>();
    for (const p of this.patrimoines()) {
      for (const c of p.categories) set.add(c);
    }
    return Array.from(set).sort();
  });

  /**
   * Calcul dérivé complexe: liste des patrimoines filtrés et triés.
   * 
   * Applique dans l'ordre:
   * 1. Filtrage par recherche textuelle (nom ou localisation)
   * 2. Filtrage par catégorie sélectionnée
   * 3. Tri selon le mode choisi (alphabétique, inversé, ou aucun)
   */
  filteredPatrimoines = computed(() => {
    let list = this.patrimoines();
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    
    // Filtre de recherche textuelle
    if (q) {
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          (p.localisation || '').toLowerCase().includes(q)
      );
    }
    
    // Filtre par catégorie
    if (cat) {
      list = list.filter((p) => p.categories.includes(cat));
    }
    
    // Application du tri
    switch (this.sortMode()) {
      case 'alpha':
        list = [...list].sort((a, b) => a.nom.localeCompare(b.nom));
        break;
      case 'reverse':
        list = [...list].sort((a, b) => b.nom.localeCompare(a.nom));
        break;
    }
    
    return list;
  });

  // Méthodes: mise à jour des signaux d'interface
  setSearch(value: string) { this.search.set(value); }
  setCategory(value: string) { this.category.set(value); }
  setSort(mode: 'alpha' | 'reverse' | 'none') { this.sortMode.set(mode); }
  setView(mode: 'grid' | 'list') { this.viewMode.set(mode); }
  toggleDense() { this.dense.set(!this.dense()); }

  /**
   * Méthode du cycle de vie: chargement initial des patrimoines.
   * Déclenche la récupération des données depuis l'API si le cache est vide.
   */
  ngOnInit(): void {
    this.service.loadAll();
  }
}