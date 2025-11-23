import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../../services/favorites.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css'],
})
export class FavoritesComponent {
  private favoritesSvc = inject(FavoritesService);

  all = this.favoritesSvc.favorites;
  patrimoines = computed(() => this.all().filter((f) => f.kind === 'patrimoine'));
  monuments = computed(() => this.all().filter((f) => f.kind === 'monument'));

  remove(kind: 'patrimoine' | 'monument', id: string, parentId?: string) {
    this.favoritesSvc.remove(kind, id, parentId);
  }
}
