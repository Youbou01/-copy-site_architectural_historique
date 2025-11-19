import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { SiteHistorique } from '../../../models/site-historique';
import { trigger, transition, style, animate } from '@angular/animations';
import { CarouselComponent } from '../ui/carousel/carousel.component';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';

type TabKey = 'about' | 'monuments' | 'comments' | 'map';

@Component({
  selector: 'app-patrimoine-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CarouselComponent, SafeUrlPipe],
  animations: [
    trigger('pageFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('280ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
    trigger('sectionFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  templateUrl: './patrimoine-detail.component.html',
  styleUrls: ['./patrimoine-detail.component.css'],
})
export class PatrimoineDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(PatrimoineService);

  patrimoine = signal<SiteHistorique | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  activeTab = signal<TabKey>('about');
  monumentSearch = signal('');
  monumentCategory = signal('');

  readonly stars = [1, 2, 3, 4, 5] as const;

  constructor() {
    const id = this.route.snapshot.paramMap.get('patrimoineId');
    if (!id) {
      this.error.set('ID manquant');
      this.loading.set(false);
      return;
    }

    // Optimistic render
    const cached = this.service.patrimoines().find((p) => p.id === id);
    if (cached) {
      this.patrimoine.set(cached);
      this.loading.set(false);
    }

    this.service.getById(id).subscribe({
      next: (data) => {
        this.patrimoine.set(data);
        this.service.currentPatrimoine.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('Patrimoine introuvable');
        this.loading.set(false);
      },
    });
  }

  // All monument-level comments flattened
  allComments = computed(() => {
    const p = this.patrimoine();
    if (!p) return [];
    return p.monuments.flatMap((m) => m.comments);
  });

  averageRating = computed<number | null>(() => {
    const rated = this.allComments().filter((c) => c.note != null);
    if (!rated.length) return null;
    const sum = rated.reduce((s, c) => s + (c.note ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  });

  // Rounded integer average for star fill comparison in template
  roundedAverage = computed<number>(() => {
    const avg = this.averageRating();
    return avg == null ? 0 : Math.round(avg);
  });

  monumentCategories = computed(() => {
    const p = this.patrimoine();
    if (!p) return [];
    const set = new Set<string>();
    p.monuments.forEach((m) => m.categories.forEach((c) => set.add(c)));
    return [...set].sort();
  });

  filteredMonuments = computed(() => {
    const p = this.patrimoine();
    if (!p) return [];
    let list = p.monuments;
    const q = this.monumentSearch().trim().toLowerCase();
    const cat = this.monumentCategory();
    if (q) {
      list = list.filter(
        (m) => m.nom.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
      );
    }
    if (cat) {
      list = list.filter((m) => m.categories.includes(cat));
    }
    return list;
  });

  setTab(tab: TabKey) {
    this.activeTab.set(tab);
  }
  setMonumentSearch(val: string) {
    this.monumentSearch.set(val);
  }
  setMonumentCategory(val: string) {
    this.monumentCategory.set(val);
  }

  initiales(nom: string): string {
    const parts = nom.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
  }

  commentStatusClass(etat: string) {
    switch (etat) {
      case 'approuvé':
        return 'approved';
      case 'en attente':
        return 'pending';
      case 'rejeté':
        return 'rejected';
      default:
        return '';
    }
  }
}
