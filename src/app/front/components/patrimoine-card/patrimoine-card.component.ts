//used ngIf
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SiteHistorique } from '../../../models/site-historique';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-patrimoine-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  animations: [
    trigger('cardEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('300ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  template: `
    <article
      class="patrimoine-card"
      [@cardEnter]
      [routerLink]="['/patrimoines', patrimoine.id]"
      tabindex="0"
    >
      <div class="image-wrapper">
        <img [src]="patrimoine.photoCarousel[0]" [alt]="patrimoine.nom" loading="lazy" />
        <div class="badge-group">
          @for (cat of patrimoine.categories; track cat) {
          <span class="badge">{{ cat }}</span>
          }
        </div>
      </div>
      <div class="content">
        <h3>{{ patrimoine.nom }}</h3>
        @if (patrimoine.localisation) {
        <p class="location">{{ patrimoine.localisation }}</p>
        }
      </div>
    </article>
  `,
  styleUrls: ['./patrimoine-card.component.css'],
})
export class PatrimoineCardComponent {
  @Input({ required: true }) patrimoine!: SiteHistorique;
}
