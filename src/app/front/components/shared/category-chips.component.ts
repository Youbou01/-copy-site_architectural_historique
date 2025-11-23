import { Component, Input } from '@angular/core';

/**
 * Reusable component for displaying category chips/badges.
 * Accepts an array of category strings and displays them as styled chips.
 */
@Component({
  selector: 'app-category-chips',
  standalone: true,
  template: `
    @if (categories.length) {
    <div class="chips" [class]="cssClass">
      @for (cat of categories; track cat) {
      <span class="chip">
        @if (showIcon) {
        <svg class="chip-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20.59 13.41 12 4.83H4v8.17l8.59 8.59a2 2 0 0 0 2.82 0l5.18-5.18a2 2 0 0 0 0-2.82ZM7 9a2 2 0 1 1 2-2 2 2 0 0 1-2 2Z"
          />
        </svg>
        }
        {{ cat }}
      </span>
      }
    </div>
    }
  `,
  styles: [
    `
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.375rem 0.75rem;
        background: var(--chip-bg, rgba(59, 130, 246, 0.1));
        color: var(--chip-color, #3b82f6);
        border-radius: 1rem;
        font-size: 0.875rem;
        font-weight: 500;
      }
      .chip-icon {
        width: 1em;
        height: 1em;
      }
    `,
  ],
})
export class CategoryChipsComponent {
  @Input({ required: true }) categories: string[] = [];
  @Input() showIcon = true;
  @Input() cssClass = '';
}
