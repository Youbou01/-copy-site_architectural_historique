import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { FavoritesService } from '../../../services/favorites.service';
import { SiteHistorique } from '../../../models/site-historique';
import { combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate } from '@angular/animations';
import { CarouselComponent } from '../ui/carousel/carousel.component';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { ImageService, FetchedImage } from '../../../services/image.service';
import { Observable } from 'rxjs';
import { RatingStarsComponent } from '../shared/rating-stars.component';
import { CategoryChipsComponent } from '../shared/category-chips.component';
import { getInitials } from '../../utils/common.utils';

@Component({
  selector: 'app-monument-detail',
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
        animate('250ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
  templateUrl: './monument-detail.component.html',
  styleUrls: ['./monument-detail.component.css'],
})
export class MonumentDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(PatrimoineService);
  private favorites = inject(FavoritesService);
  private images = inject(ImageService);
  unsplashImages$!: Observable<FetchedImage[]>;
  commonsImages$!: Observable<FetchedImage[]>;
  extraImages = signal<FetchedImage[]>([]); // merged

  loading = signal(true);
  error = signal<string | null>(null);
  monument = signal<SiteHistorique | null>(null);
  parentId = signal<string | null>(null);

  avgNote = computed<number | null>(() => {
    const comments = this.monument()?.comments ?? [];
    const rated = comments.filter((c) => c.note != null);
    if (!rated.length) return null;
    const sum = rated.reduce((s, c) => s + (c.note ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  });

  // Accessible alt texts for carousel images
  altTexts = computed<string[]>(() => {
    const m = this.monument();
    if (!m) return [];
    const local = m.photoCarousel ?? [];
    const extra = this.extraImages();
    return [
      ...local.map((_, i) => `Photo ${i + 1} de ${m.nom}`),
      ...extra.map((img, i) => img.alt || `Image additionnelle ${i + 1} de ${m.nom}`),
    ];
  });

  combinedImages = computed<string[]>(() => {
    const m = this.monument();
    if (!m) return [];
    const local = m.photoCarousel ?? [];
    const extra = this.extraImages().map((i) => i.src);
    return [...local, ...extra];
  });

  constructor() {
    const parent = this.route.parent ?? this.route;

    combineLatest([parent.paramMap, this.route.paramMap])
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
          this.monument.set(null);
        }),
        map(([pp, cp]) => {
          const patrimoineId =
            pp.get('patrimoineId') ??
            pp.get('id') ??
            this.route.snapshot.paramMap.get('patrimoineId') ??
            this.route.snapshot.paramMap.get('id');

          const monumentId = cp.get('monumentId') ?? cp.get('id');

          return { patrimoineId, monumentId };
        }),
        tap(({ patrimoineId }) => this.parentId.set(patrimoineId ?? null)),
        switchMap(({ patrimoineId, monumentId }) => {
          if (!patrimoineId || !monumentId) {
            this.error.set('Paramètres de route invalides.');
            return of<SiteHistorique | null>(null);
          }

          // Fast path: use cached detailed patrimoine from parent when available
          const current = this.service.currentPatrimoine();
          if (current && current.id === patrimoineId) {
            const found = current.monuments.find((m) => m.id === monumentId) ?? null;
            return of(found);
          }

          // Fallback: fetch patrimoine, then find monument
          return this.service
            .getById(patrimoineId)
            .pipe(map((p) => p.monuments.find((m) => m.id === monumentId) ?? null));
        }),
        catchError((err) => {
          console.error(err);
          this.error.set('Erreur de chargement.');
          return of(null);
        }),
        tap((m) => {
          if (!m && !this.error()) {
            this.error.set('Monument introuvable');
          }
          this.monument.set(m);
          this.loading.set(false);
          if (m) {
            // Fetch both sources then merge
            this.unsplashImages$ = this.images.fetchFor$(m.nom, 2);
            this.commonsImages$ = this.images.fetchCommons$(m.nom, 2);
            this.unsplashImages$.pipe(takeUntilDestroyed()).subscribe((u) => {
              const current = this.extraImages();
              this.extraImages.set([...u, ...current.filter((i) => i.source !== 'unsplash')]);
            });
            this.commonsImages$.pipe(takeUntilDestroyed()).subscribe((c) => {
              const current = this.extraImages();
              this.extraImages.set([...current.filter((i) => i.source !== 'commons'), ...c]);
            });
          }
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  initiales = getInitials;

  isFavoriteMonument() {
    return this.favorites.isMonumentFavorite(this.parentId(), this.monument());
  }

  toggleFavoriteMonument() {
    this.favorites.toggleMonument(this.parentId(), this.monument());
  }
}
