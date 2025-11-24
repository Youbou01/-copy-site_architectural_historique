import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, Router } from '@angular/router';
import { AdminService } from '../../../services/admin.service';

/**
 * Admin layout component - wraps all admin pages
 * Provides navigation sidebar and header
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private router = inject(Router);
  private adminService = inject(AdminService);

  /**
   * Exit admin mode and return to public site
   */
  exitAdmin() {
    this.adminService.setAdminMode(false);
    this.router.navigate(['/patrimoines']);
  }
}
