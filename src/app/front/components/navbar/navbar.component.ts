import { Component, signal, inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router, RouterModule } from '@angular/router';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { AdminService } from '../../../services/admin.service';

/**
 * Composant de navigation principal de l'application.
 * 
 * Responsabilités:
 * - Affichage de la barre de navigation avec liens vers les différentes sections
 * - Gestion du thème clair/sombre avec persistance dans le DOM
 * - Indication de la route active pour feedback visuel utilisateur
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  // Signal: thème actuel (dark ou light)
  theme = signal<'dark' | 'light'>('dark');
  
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);
  router = inject(Router);
  adminService = inject(AdminService);

  /**
   * Bascule entre le thème clair et sombre.
   * Met à jour l'attribut data-theme du document HTML pour appliquer les styles correspondants.
   * Compatible SSR: ne modifie le DOM que côté navigateur.
   */
  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (isPlatformBrowser(this.platformId)) {
      (this.doc.documentElement as HTMLElement).dataset['theme'] = next;
    }
  }

  /**
   * Vérifie si une route est actuellement active.
   * Utilisé pour appliquer des styles de navigation active.
   * 
   * @param path - Chemin de la route à vérifier
   * @returns true si l'URL courante commence par ce chemin
   */
  isActive(path: string) {
    return this.router.url.startsWith(path);
  }
  
  /**
   * Enable admin mode and navigate to admin panel
   */
  enterAdminMode() {
    this.adminService.setAdminMode(true);
    this.router.navigate(['/admin']);
  }
  
}
