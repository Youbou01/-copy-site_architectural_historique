import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Composant de pied de page (footer) de l'application.
 * 
 * Responsabilités:
 * - Affichage des informations de copyright et liens légaux
 * - Mise à jour automatique de l'année courante
 * - Liens vers les réseaux sociaux et pages informatives
 */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  /** Année courante pour le copyright, mise à jour automatiquement */
  readonly year = new Date().getFullYear();
}
