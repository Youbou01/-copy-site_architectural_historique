import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { SiteHistorique } from '../../../models/site-historique';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-monument-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monument-detail.component.html',
  styleUrls: ['./monument-detail.component.css'],
})
export class MonumentDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(PatrimoineService);

  monument?: SiteHistorique;
  loading = true;
  error: string | null = null;

  constructor() {
    const patrimoineId = this.route.snapshot.paramMap.get('patrimoineId')!;
    const monumentId = this.route.snapshot.paramMap.get('monumentId')!;

    // Optimistic render: use currentPatrimoine (detailed data from parent) first
    const currentPatrimoine = this.service.currentPatrimoine();
    if (currentPatrimoine && currentPatrimoine.id === patrimoineId) {
      const cachedMonument = currentPatrimoine.monuments.find((m) => m.id === monumentId);
      if (cachedMonument) {
        this.monument = cachedMonument;
        this.loading = false;
        return; // Skip server fetch since we have fresh data
      }
    }

    // Fallback: fetch from server (for direct URL navigation)
    this.route.paramMap
      .pipe(
        switchMap((params) => this.service.getById(params.get('patrimoineId')!)),
        map((p) => {
          const monId = this.route.snapshot.paramMap.get('monumentId');
          return p.monuments.find((m) => m.id === monId);
        })
      )
      .subscribe({
        next: (m) => {
          if (!m) {
            this.error = 'Monument introuvable';
          }
          this.monument = m;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.error = 'Erreur de chargement';
          this.loading = false;
        },
      });
  }
}
