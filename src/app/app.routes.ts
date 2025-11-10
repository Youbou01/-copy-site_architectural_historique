import { Routes } from '@angular/router';
import { PatrimoineListComponent } from './front/components/patrimoine-list/patrimoine-list.component';
import { PatrimoineDetailComponent } from './front/components/patrimoine-detail/patrimoine-detail.component';
import { MonumentDetailComponent } from './front/components/monument-detail/monument-detail.component';

export const routes: Routes = [
  { path: '', redirectTo: 'patrimoines', pathMatch: 'full' },
  { path: 'patrimoines', component: PatrimoineListComponent },
  {
    path: 'patrimoines/:patrimoineId',
    component: PatrimoineDetailComponent,
    children: [{ path: 'monuments/:monumentId', component: MonumentDetailComponent }],
  },
  { path: '**', redirectTo: 'patrimoines' },
];
