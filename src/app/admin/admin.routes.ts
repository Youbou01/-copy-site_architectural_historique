import { Routes } from '@angular/router';
import { adminGuard } from '../guards/admin.guard';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { CommentModerationComponent } from './components/comment-moderation/comment-moderation.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'comments', component: CommentModerationComponent },
      // Add more admin routes here (patrimoines, monuments management)
    ],
  },
];
