import { Component, Input } from '@angular/core';

/**
 * Reusable component for displaying rating stars.
 * Accepts a numeric rating value and displays filled/unfilled stars accordingly.
 */
@Component({
  selector: 'app-rating-stars',
  standalone: true,
  template: `
    @if (value !== null) {
    <div class="stars" [class]="cssClass" [attr.title]="title || 'Note: ' + value">
      @for (n of [1, 2, 3, 4, 5]; track n) {
      <svg viewBox="0 0 24 24" aria-hidden="true" [class.filled]="n <= roundedValue()">
        <path
          d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"
          fill="currentColor"
        />
      </svg>
      }
      @if (showValue) {
      <span class="rating-value">{{ value }}</span>
      }
    </div>
    }
  `,
  styles: [
    `
      .stars {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      svg {
        width: 1em;
        height: 1em;
        fill: currentColor;
        opacity: 0.3;
      }
      svg.filled {
        opacity: 1;
        fill: var(--star-fill, gold);
      }
      .rating-value {
        margin-left: 0.5rem;
        font-weight: 500;
      }
    `,
  ],
})
export class RatingStarsComponent {
  @Input() value: number | null = null;
  @Input() showValue = false;
  @Input() cssClass = '';
  @Input() title?: string;

  roundedValue(): number {
    return this.value == null ? 0 : Math.round(this.value);
  }
}
