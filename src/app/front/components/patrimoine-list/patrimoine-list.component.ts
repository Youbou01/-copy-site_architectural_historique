import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { PatrimoineCardComponent } from '../patrimoine-card/patrimoine-card.component';
import { trigger, transition, query, style, animate, stagger } from '@angular/animations';

@Component({
  selector: 'app-patrimoine-list',
  standalone: true,
  imports: [CommonModule, PatrimoineCardComponent],
  animations: [
    trigger('listStagger', [
      transition(':enter', [
        query(
          'app-patrimoine-card',
          [
            style({ opacity: 0, transform: 'translateY(10px) scale(.98)' }),
            stagger(60, animate('300ms cubic-bezier(.4,0,.2,1)', style({ opacity: 1, transform: 'none' }))),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
  templateUrl: './patrimoine-list.component.html',
  styleUrls: ['./patrimoine-list.component.css'],
})
export class PatrimoineListComponent implements OnInit {
  private service: PatrimoineService = inject(PatrimoineService);

  patrimoines = computed(() => this.service.patrimoines());
  loading = computed(() => this.service.loading());
  error = computed(() => this.service.error());

  search = signal('');
  category = signal('');
  sortMode = signal<'alpha' | 'reverse' | 'none'>('none');
  viewMode = signal<'grid' | 'list'>('grid');
  dense = signal(false);

  categories = computed(() => {
    const set = new Set<string>();
    for (const p of this.patrimoines()) {
      for (const c of p.categories) set.add(c);
    }
    return Array.from(set).sort();
  });

  filteredPatrimoines = computed(() => {
    let list = this.patrimoines();
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    if (q) {
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          (p.localisation || '').toLowerCase().includes(q)
      );
    }
    if (cat) {
      list = list.filter((p) => p.categories.includes(cat));
    }
    switch (this.sortMode()) {
      case 'alpha':
        list = [...list].sort((a, b) => a.nom.localeCompare(b.nom));
        break;
      case 'reverse':
        list = [...list].sort((a, b) => b.nom.localeCompare(a.nom));
        break;
    }
    return list;
  });

  setSearch(value: string) { this.search.set(value); }
  setCategory(value: string) { this.category.set(value); }
  setSort(mode: 'alpha' | 'reverse' | 'none') { this.sortMode.set(mode); }
  setView(mode: 'grid' | 'list') { this.viewMode.set(mode); }
  toggleDense() { this.dense.set(!this.dense()); }

  ngOnInit(): void {
    this.service.loadAll();
  }
}