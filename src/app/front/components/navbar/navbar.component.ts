import { Component, signal, inject, PLATFORM_ID } from '@angular/core';
import { RouterLink, Router, RouterModule } from '@angular/router';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  theme = signal<'dark' | 'light'>('dark');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);
  router = inject(Router);

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (isPlatformBrowser(this.platformId)) {
      (this.doc.documentElement as HTMLElement).dataset['theme'] = next;
    }
  }

  isActive(path: string) {
    return this.router.url.startsWith(path);
  }
}
