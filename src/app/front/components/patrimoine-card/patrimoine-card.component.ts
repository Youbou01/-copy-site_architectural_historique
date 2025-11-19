// Enhanced patrimoine card
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
        style({ opacity: 0, transform: 'translateY(8px) scale(.98)' }),
        animate('360ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ])
  ],
  template: `
    <article
      class="patrimoine-card"
      [routerLink]="['/patrimoines', patrimoine.id]"
      [@cardEnter]
      tabindex="0"
      aria-label="Voir le site {{ patrimoine.nom }}"
    >
      <div class="image-wrapper">
        <img
          [src]="patrimoine.photoCarousel[0] || '/images/placeholder.webp'"
          [alt]="patrimoine.nom"
          loading="lazy"
        />
        <div class="overlay"></div>
        <div class="category-bar">
          @for (cat of patrimoine.categories.slice(0,3); track cat) {
          <span class="badge">{{ cat }}</span>
          }
          @if (patrimoine.categories.length > 3) {
            <span class="badge extra">+{{ patrimoine.categories.length - 3 }}</span>
          }
        </div>
      </div>
      <div class="content">
        <h3>{{ patrimoine.nom }}</h3>
        @if (patrimoine.localisation) {
          <p class="location">
            <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5Z"/></svg>
            {{ patrimoine.localisation }}
          </p>
        }
      </div>
    </article>
  `,
  styleUrls: ['./patrimoine-card.component.css'],
})
export class PatrimoineCardComponent {
  @Input({ required: true }) patrimoine!: SiteHistorique;
}