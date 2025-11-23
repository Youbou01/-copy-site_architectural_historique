import { Routes } from '@angular/router';
import { PatrimoineListComponent } from './front/components/patrimoine-list/patrimoine-list.component';
import { PatrimoineDetailComponent } from './front/components/patrimoine-detail/patrimoine-detail.component';
import { MonumentDetailComponent } from './front/components/monument-detail/monument-detail.component';
import { MonumentListComponent } from './front/components/monument-list/monument-list.component';
import { FavoritesComponent } from './front/components/favorites/favorites.component';

export const routes: Routes = [
  { path: '', redirectTo: 'patrimoines', pathMatch: 'full' },
  { path: 'patrimoines', component: PatrimoineListComponent },
  { path: 'monuments', component: MonumentListComponent },
  { path: 'patrimoines/:patrimoineId', component: PatrimoineDetailComponent },
  { path: 'patrimoines/:patrimoineId/monuments/:monumentId', component: MonumentDetailComponent },
  { path: 'favoris', component: FavoritesComponent },
  { path: '**', redirectTo: 'patrimoines' },
];
