import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { SiteHistorique } from '../../../models/site-historique';
import { switchMap } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { CarouselComponent } from '../ui/carousel/carousel.component';

@Component({
  selector: 'app-patrimoine-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CarouselComponent],
  animations: [
    trigger('pageFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
  templateUrl: './patrimoine-detail.component.html',
  styleUrls: ['./patrimoine-detail.component.css'],
})
export class PatrimoineDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(PatrimoineService);

  patrimoine?: SiteHistorique;
  loading = true;
  error: string | null = null;

  constructor() {
    const patrimoineId = this.route.snapshot.paramMap.get('patrimoineId')!;

    // Optimistic render: use cached list item immediately if available
    const cached = this.service.patrimoines().find((p) => p.id === patrimoineId);
    if (cached) {
      this.patrimoine = cached;
      this.loading = false;
    }

    // Still fetch fresh data from server (handles direct URL navigation or data updates)
    this.route.paramMap
      .pipe(switchMap((params) => this.service.getById(params.get('patrimoineId')!)))
      .subscribe({
        next: (data) => {
          this.patrimoine = data;
          this.service.currentPatrimoine.set(data); // Cache detailed data for child components
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.error = 'Patrimoine introuvable';
          this.loading = false;
        },
      });
  }
}
