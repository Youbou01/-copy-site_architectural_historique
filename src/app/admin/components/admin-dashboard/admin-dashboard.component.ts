import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { AdminService } from '../../../services/admin.service';

/**
 * Admin dashboard component showing statistics and quick actions
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  private patrimoineService = inject(PatrimoineService);
  private adminService = inject(AdminService);

  patrimoinesCount = signal(0);
  monumentsCount = signal(0);
  pendingCommentsCount = signal(0);
  loading = signal(true);

  constructor() {
    // Use effect to reactively update counts when patrimoines change
    effect(() => {
      const patrimoines = this.patrimoineService.patrimoines();
      if (patrimoines.length > 0) {
        this.patrimoinesCount.set(patrimoines.length);
        
        // Count all monuments across all patrimoines
        let totalMonuments = 0;
        patrimoines.forEach((p) => {
          totalMonuments += p.monuments?.length || 0;
        });
        this.monumentsCount.set(totalMonuments);
      }
    });
  }

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loading.set(true);

    // Load patrimoines (will trigger effect above)
    this.patrimoineService.loadAll();

    // Load pending comments count
    this.adminService.getPendingComments().subscribe({
      next: (comments) => {
        this.pendingCommentsCount.set(comments.length);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
