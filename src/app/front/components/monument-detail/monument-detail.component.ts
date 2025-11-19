import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { SiteHistorique } from '../../../models/site-historique';
import { combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate } from '@angular/animations';
import { CarouselComponent } from '../ui/carousel/carousel.component';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';

@Component({
  selector: 'app-monument-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CarouselComponent, SafeUrlPipe],
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
  
  loading = signal(true);
  error = signal<string | null>(null);
  monument = signal<SiteHistorique | null>(null);
  parentId = signal<string | null>(null);

  // UI helpers
  readonly stars = [1, 2, 3, 4, 5] as const;

  avgNote = computed<number | null>(() => {
    const comments = this.monument()?.comments ?? [];
    const rated = comments.filter((c) => c.note != null);
    if (!rated.length) return null;
    const sum = rated.reduce((s, c) => s + (c.note ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
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
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  initiales(nom: string): string {
    const parts = nom.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
  }
}