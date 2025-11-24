import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AdminService } from '../services/admin.service';

/**
 * Guard to protect admin routes
 * Redirects to home if not authenticated as admin
 */
export const adminGuard: CanActivateFn = () => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  if (adminService.isAdmin()) {
    return true;
  }

  // Redirect to home page if not admin
  router.navigate(['/patrimoines']);
  return false;
};
