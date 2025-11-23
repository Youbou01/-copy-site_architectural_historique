import { Component, computed, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchedImage } from '../../../services/image.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { FavoritesService } from '../../../services/favorites.service';
import { SiteHistorique } from '../../../models/site-historique';
import { trigger, transition, style, animate } from '@angular/animations';
import { CarouselComponent } from '../ui/carousel/carousel.component';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { ImageService } from '../../../services/image.service';
import { RatingStarsComponent } from '../shared/rating-stars.component';
import { CategoryChipsComponent } from '../shared/category-chips.component';
import { getInitials, getCommentStatusClass } from '../../utils/common.utils';

type TabKey = 'about' | 'monuments' | 'comments' | 'map';

@Component({
  selector: 'app-patrimoine-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CarouselComponent,
    SafeUrlPipe,
    RatingStarsComponent,
    CategoryChipsComponent,
  ],
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
  private favorites = inject(FavoritesService);
  private images = inject(ImageService);
  unsplashImages$!: Observable<FetchedImage[]>;
  commonsImages$!: Observable<FetchedImage[]>;
  extraImages = signal<FetchedImage[]>([]); // merged sources

  patrimoine = signal<SiteHistorique | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  activeTab = signal<TabKey>('about');
  monumentSearch = signal('');
  monumentCategory = signal('');

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
        // Fetch both sources and merge
        this.unsplashImages$ = this.images.fetchFor$(data.nom, 2);
        this.commonsImages$ = this.images.fetchCommons$(data.nom, 2);
        this.unsplashImages$.subscribe((u) => {
          const current = this.extraImages();
          this.extraImages.set([...u, ...current.filter((i) => i.source !== 'unsplash')]);
        });
        this.commonsImages$.subscribe((c) => {
          const current = this.extraImages();
          this.extraImages.set([...current.filter((i) => i.source !== 'commons'), ...c]);
        });
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

  // Combine local patrimoine photos with fetched Unsplash extras
  combinedImages = computed<string[]>(() => {
    const p = this.patrimoine();
    if (!p) return [];
    const local = p.photoCarousel ?? [];
    const extra = this.extraImages().map((i) => i.src);
    return [...local, ...extra];
  });

  altTexts = computed<string[]>(() => {
    const p = this.patrimoine();
    if (!p) return [];
    const local = p.photoCarousel ?? [];
    const extra = this.extraImages();
    return [
      ...local.map((_, i) => `Photo ${i + 1} de ${p.nom}`),
      ...extra.map((img, i) => img.alt || `Image additionnelle ${i + 1} de ${p.nom}`),
    ];
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

  initiales = getInitials;
  commentStatusClass = getCommentStatusClass;

  isFavoritePatrimoine() {
    return this.favorites.isPatrimoineFavorite(this.patrimoine());
  }

  toggleFavoritePatrimoine() {
    this.favorites.togglePatrimoine(this.patrimoine());
  }
}
