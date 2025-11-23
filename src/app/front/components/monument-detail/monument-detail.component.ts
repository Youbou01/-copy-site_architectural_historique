import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { FavoritesService } from '../../../services/favorites.service';
import { SiteHistorique } from '../../../models/site-historique';
import { combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { trigger, transition, style, animate } from '@angular/animations';
import { CarouselComponent } from '../ui/carousel/carousel.component';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { ImageService, FetchedImage } from '../../../services/image.service';
import { Observable } from 'rxjs';
import { RatingStarsComponent } from '../shared/rating-stars.component';
import { CategoryChipsComponent } from '../shared/category-chips.component';
import { getInitials } from '../../utils/common.utils';

/**
 * Composant de vue détaillée d'un monument individuel.
 * 
 * Responsabilités:
 * - Affichage complet d'un monument appartenant à un patrimoine
 * - Récupération complexe de données via route imbriquée (patrimoine → monument)
 * - Optimisation via cache du patrimoine parent si disponible
 * - Récupération d'images additionnelles depuis sources externes
 * - Calcul de la note moyenne des commentaires du monument
 * - Gestion des favoris pour le monument
 * 
 * Architecture de routage:
 * - Route: /patrimoines/:patrimoineId/monuments/:monumentId
 * - Utilise combineLatest pour gérer les paramètres de route imbriqués
 */
@Component({
  selector: 'app-monument-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CarouselComponent,
    SafeUrlPipe,
    RatingStarsComponent,
    CategoryChipsComponent,
  ],
  animations: [
    // Animation de fade-in pour l'entrée de la page
    trigger('pageFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
  templateUrl: './monument-detail.component.html',
  styleUrls: ['./monument-detail.component.css'],
})
export class MonumentDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(PatrimoineService);
  private favorites = inject(FavoritesService);
  private images = inject(ImageService);
  
  // Observables pour images externes (Unsplash et Wikimedia Commons)
  unsplashImages$!: Observable<FetchedImage[]>;
  commonsImages$!: Observable<FetchedImage[]>;
  extraImages = signal<FetchedImage[]>([]); // Signal fusionnant les deux sources

  // Signaux d'état
  loading = signal(true);                         // État de chargement
  error = signal<string | null>(null);            // Message d'erreur éventuel
  monument = signal<SiteHistorique | null>(null); // Monument actuellement affiché
  parentId = signal<string | null>(null);         // ID du patrimoine parent

  /**
   * Calcul dérivé: note moyenne des commentaires du monument.
   * Retourne null si aucun commentaire n'a de note.
   * Arrondi à 1 décimale.
   */
  avgNote = computed<number | null>(() => {
    const comments = this.monument()?.comments ?? [];
    const rated = comments.filter((c) => c.note != null);
    if (!rated.length) return null;
    const sum = rated.reduce((s, c) => s + (c.note ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  });

  /**
   * Calcul dérivé: textes alternatifs pour les images du carousel.
   * Génère automatiquement des alt text accessibles.
   */
  altTexts = computed<string[]>(() => {
    const m = this.monument();
    if (!m) return [];
    const local = m.photoCarousel ?? [];
    const extra = this.extraImages();
    return [
      ...local.map((_, i) => `Photo ${i + 1} de ${m.nom}`),
      ...extra.map((img, i) => img.alt || `Image additionnelle ${i + 1} de ${m.nom}`),
    ];
  });

  /**
   * Calcul dérivé: liste combinée des images (locales + externes).
   */
  combinedImages = computed<string[]>(() => {
    const m = this.monument();
    if (!m) return [];
    const local = m.photoCarousel ?? [];
    const extra = this.extraImages().map((i) => i.src);
    return [...local, ...extra];
  });

  constructor() {
    // Résolution de la route parente (peut être this.route ou parent selon structure de routage)
    const parent = this.route.parent ?? this.route;

    /**
     * Flux RxJS complexe de récupération du monument:
     * 
     * 1. combineLatest des paramètres de route parent et enfant
     * 2. Extraction des IDs patrimoine et monument
     * 3. Vérification du cache du patrimoine actuel
     * 4. Fallback: récupération du patrimoine complet via API si cache manquant
     * 5. Extraction du monument depuis le patrimoine
     * 6. Récupération d'images additionnelles externes
     * 
     * Optimisation: utilise currentPatrimoine du service si disponible pour éviter requête API.
     */
    combineLatest([parent.paramMap, this.route.paramMap])
      .pipe(
        // Réinitialisation des états à chaque changement de route
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
          this.monument.set(null);
        }),
        
        // Extraction des IDs depuis les paramètres de route (gère différentes structures)
        map(([pp, cp]) => {
          const patrimoineId =
            pp.get('patrimoineId') ??
            pp.get('id') ??
            this.route.snapshot.paramMap.get('patrimoineId') ??
            this.route.snapshot.paramMap.get('id');

          const monumentId = cp.get('monumentId') ?? cp.get('id');

          return { patrimoineId, monumentId };
        }),
        
        // Stockage de l'ID parent pour usage dans favoris
        tap(({ patrimoineId }) => this.parentId.set(patrimoineId ?? null)),
        
        // Récupération du monument (stratégie fast path vs fallback)
        switchMap(({ patrimoineId, monumentId }) => {
          if (!patrimoineId || !monumentId) {
            this.error.set('Paramètres de route invalides.');
            return of<SiteHistorique | null>(null);
          }

          // Fast path: utilise le patrimoine en cache si disponible (navigation depuis parent)
          const current = this.service.currentPatrimoine();
          if (current && current.id === patrimoineId) {
            const found = current.monuments.find((m) => m.id === monumentId) ?? null;
            return of(found);
          }

          // Fallback: récupère le patrimoine complet puis extrait le monument
          return this.service
            .getById(patrimoineId)
            .pipe(map((p) => p.monuments.find((m) => m.id === monumentId) ?? null));
        }),
        
        // Gestion des erreurs HTTP
        catchError((err) => {
          console.error(err);
          this.error.set('Erreur de chargement.');
          return of(null);
        }),
        
        // Traitement final: mise à jour des signaux et récupération images externes
        tap((m) => {
          if (!m && !this.error()) {
            this.error.set('Monument introuvable');
          }
          this.monument.set(m);
          this.loading.set(false);
          
          if (m) {
            // Récupération d'images additionnelles depuis les deux sources externes
            this.unsplashImages$ = this.images.fetchFor$(m.nom, 2);
            this.commonsImages$ = this.images.fetchCommons$(m.nom, 2);
            
            // Fusion des images Unsplash
            this.unsplashImages$.pipe(takeUntilDestroyed()).subscribe((u) => {
              const current = this.extraImages();
              this.extraImages.set([...u, ...current.filter((i) => i.source !== 'unsplash')]);
            });
            
            // Fusion des images Commons
            this.commonsImages$.pipe(takeUntilDestroyed()).subscribe((c) => {
              const current = this.extraImages();
              this.extraImages.set([...current.filter((i) => i.source !== 'commons'), ...c]);
            });
          }
        }),
        
        // Auto-désabonnement lors de la destruction du composant
        takeUntilDestroyed()
      )
      .subscribe();
  }

  // Fonction utilitaire importée pour usage dans le template
  initiales = getInitials;

  /**
   * Vérifie si ce monument est dans les favoris de l'utilisateur.
   * Nécessite l'ID du parent pour identification unique.
   */
  isFavoriteMonument() {
    return this.favorites.isMonumentFavorite(this.parentId(), this.monument());
  }

  /**
   * Bascule l'état favori de ce monument (ajout/retrait).
   */
  toggleFavoriteMonument() {
    this.favorites.toggleMonument(this.parentId(), this.monument());
  }
}
