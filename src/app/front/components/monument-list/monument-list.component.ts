import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { FavoritesService } from '../../../services/favorites.service';
import { SiteHistorique } from '../../../models/site-historique';

interface FlatMonument {
  id: string;
  nom: string;
  parentId: string;
  parentNom: string;
  categories: string[];
  description?: string;
  photo?: string;
  estClasse: boolean;
  ouvert: boolean;
  comments: number;
}

@Component({
  selector: 'app-monument-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './monument-list.component.html',
  styleUrls: ['./monument-list.component.css'],
})
export class MonumentListComponent {
  private patrimoineSvc = inject(PatrimoineService);
  private favorites = inject(FavoritesService);

  search = signal('');
  category = signal('');

  constructor() {
    this.patrimoineSvc.loadAll();
  }

  // Flatten all monuments across patrimoines
  allMonuments = computed<FlatMonument[]>(() => {
    return this.patrimoineSvc.patrimoines().flatMap((p) =>
      (p.monuments || []).map((m) => ({
        id: m.id,
        nom: m.nom,
        parentId: p.id,
        parentNom: p.nom,
        categories: m.categories || [],
        description: m.description,
        photo: m.photoCarousel?.[0],
        estClasse: m.estClasse,
        ouvert: m.ouvert,
        comments: m.comments?.length || 0,
      }))
    );
  });

  categories = computed(() => {
    const set = new Set<string>();
    this.allMonuments().forEach((m) => m.categories.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  });

  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    return this.allMonuments().filter((m) => {
      if (
        q &&
        !(m.nom.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q))
      )
        return false;
      if (cat && !m.categories.includes(cat)) return false;
      return true;
    });
  });

  setSearch(val: string) {
    this.search.set(val);
  }
  setCategory(val: string) {
    this.category.set(val);
  }

  isFav(m: FlatMonument) {
    // Monument favorites stored with parentId + id; we need a SiteHistorique shape only for API of service
    return this.favorites
      .favorites()
      .some((f) => f.kind === 'monument' && f.parentId === m.parentId && f.id === m.id);
  }

  toggleFav(m: FlatMonument) {
    // Build a minimal SiteHistorique representing the monument for toggle convenience
    const fake: SiteHistorique = {
      id: m.id,
      nom: m.nom,
      description: m.description || '',
      photoCarousel: m.photo ? [m.photo] : [],
      latitude: 0,
      longitude: 0,
      categories: m.categories,
      dateConstruction: null,
      estClasse: m.estClasse,
      prixEntree: 0,
      ouvert: m.ouvert,
      horaires: [],
      visitesGuideesDisponibles: false,
      lieuxProches: [],
      comments: [],
      monuments: [],
    };
    this.favorites.toggleMonument(m.parentId, fake);
  }
}
