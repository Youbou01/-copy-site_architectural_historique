import { Component, computed, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FetchedImage } from '../../../services/image.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { FavoritesService } from '../../../services/favorites.service';
import { SiteHistorique } from '../../../models/site-historique';
import { trigger, transition, style, animate } from '@angular/animations';
import { CarouselComponent } from '../ui/carousel/carousel.component';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { ImageService } from '../../../services/image.service';
import { RatingStarsComponent } from '../shared/rating-stars.component';
import { CategoryChipsComponent } from '../shared/category-chips.component';
import { getInitials, getCommentStatusClass } from '../../utils/common.utils';

/** Type union des onglets disponibles dans la vue détail patrimoine */
type TabKey = 'about' | 'monuments' | 'comments' | 'map';

/**
 * Composant de vue détaillée d'un patrimoine.
 * 
 * Responsabilités:
 * - Affichage complet d'un patrimoine avec carousel, descriptions, monuments et commentaires
 * - Gestion des onglets pour naviguer entre différentes sections (À propos, Monuments, Commentaires, Carte)
 * - Filtrage des monuments par recherche textuelle et catégorie
 * - Récupération d'images additionnelles depuis Unsplash et Wikimedia Commons
 * - Calcul de la note moyenne basée sur tous les commentaires de monuments
 * - Gestion des favoris pour le patrimoine
 */
@Component({
  selector: 'app-patrimoine-detail',
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
        animate('280ms ease-out', style({ opacity: 1 })),
      ]),
    ]),
    // Animation de fade-in avec translation pour les sections
    trigger('sectionFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
  templateUrl: './patrimoine-detail.component.html',
  styleUrls: ['./patrimoine-detail.component.css'],
})
export class PatrimoineDetailComponent {
  private route = inject(ActivatedRoute);
  private service = inject(PatrimoineService);
  private favorites = inject(FavoritesService);
  private images = inject(ImageService);
  
  // Observables pour images externes (Unsplash et Wikimedia Commons)
  unsplashImages$!: Observable<FetchedImage[]>;
  commonsImages$!: Observable<FetchedImage[]>;
  extraImages = signal<FetchedImage[]>([]); // Signal fusionnant les deux sources

  // Signaux d'état principal
  patrimoine = signal<SiteHistorique | null>(null);  // Patrimoine actuellement affiché
  loading = signal(true);                            // État de chargement
  error = signal<string | null>(null);               // Message d'erreur éventuel

  // Signaux d'interface utilisateur
  activeTab = signal<TabKey>('about');        // Onglet actif
  monumentSearch = signal('');                // Recherche dans les monuments
  monumentCategory = signal('');              // Filtre de catégorie pour monuments

  constructor() {
    // Récupération de l'ID depuis les paramètres de route
    const id = this.route.snapshot.paramMap.get('patrimoineId');
    if (!id) {
      this.error.set('ID manquant');
      this.loading.set(false);
      return;
    }

    // Rendu optimiste: affiche immédiatement les données en cache si disponibles
    const cached = this.service.patrimoines().find((p) => p.id === id);
    if (cached) {
      this.patrimoine.set(cached);
      this.loading.set(false);
    }

    // Récupération complète des données depuis l'API (inclut monuments complets)
    this.service.getById(id).subscribe({
      next: (data) => {
        this.patrimoine.set(data);
        this.service.currentPatrimoine.set(data);
        this.loading.set(false);
        
        // Récupération d'images additionnelles depuis les deux sources externes
        this.unsplashImages$ = this.images.fetchFor$(data.nom, 2);
        this.commonsImages$ = this.images.fetchCommons$(data.nom, 2);
        
        // Fusion des images Unsplash dans le signal
        this.unsplashImages$.subscribe((u) => {
          const current = this.extraImages();
          this.extraImages.set([...u, ...current.filter((i) => i.source !== 'unsplash')]);
        });
        
        // Fusion des images Commons dans le signal
        this.commonsImages$.subscribe((c) => {
          const current = this.extraImages();
          this.extraImages.set([...current.filter((i) => i.source !== 'commons'), ...c]);
        });
      },
      error: (err) => {
        console.error(err);
        this.error.set('Patrimoine introuvable');
        this.loading.set(false);
      },
    });
  }

  /**
   * Calcul dérivé: tous les commentaires de tous les monuments, aplatis en une seule liste.
   * Utilisé pour afficher l'onglet "Commentaires" global du patrimoine.
   */
  allComments = computed(() => {
    const p = this.patrimoine();
    if (!p) return [];
    return p.monuments.flatMap((m) => m.comments);
  });

  /**
   * Calcul dérivé: note moyenne de tous les commentaires notés (tous monuments confondus).
   * Retourne null si aucun commentaire n'a de note.
   * Arrondi à 1 décimale (ex: 4.3).
   */
  averageRating = computed<number | null>(() => {
    const rated = this.allComments().filter((c) => c.note != null);
    if (!rated.length) return null;
    const sum = rated.reduce((s, c) => s + (c.note ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  });

  /**
   * Calcul dérivé: liste combinée des images du patrimoine.
   * Fusion des photos locales (photoCarousel) et des images externes récupérées.
   */
  combinedImages = computed<string[]>(() => {
    const p = this.patrimoine();
    if (!p) return [];
    const local = p.photoCarousel ?? [];
    const extra = this.extraImages().map((i) => i.src);
    return [...local, ...extra];
  });

  /**
   * Calcul dérivé: textes alternatifs pour chaque image du carousel.
   * Génère automatiquement des alt text si non fournis par la source externe.
   */
  altTexts = computed<string[]>(() => {
    const p = this.patrimoine();
    if (!p) return [];
    const local = p.photoCarousel ?? [];
    const extra = this.extraImages();
    return [
      ...local.map((_, i) => `Photo ${i + 1} de ${p.nom}`),
      ...extra.map((img, i) => img.alt || `Image additionnelle ${i + 1} de ${p.nom}`),
    ];
  });

  /**
   * Calcul dérivé: liste unique des catégories de tous les monuments du patrimoine.
   * Utilisée pour générer les filtres de catégorie dans l'onglet Monuments.
   */
  monumentCategories = computed(() => {
    const p = this.patrimoine();
    if (!p) return [];
    const set = new Set<string>();
    p.monuments.forEach((m) => m.categories.forEach((c) => set.add(c)));
    return [...set].sort();
  });

  /**
   * Calcul dérivé: liste des monuments filtrés selon la recherche et la catégorie.
   * Applique les filtres de recherche textuelle et de catégorie sélectionnée.
   */
  filteredMonuments = computed(() => {
    const p = this.patrimoine();
    if (!p) return [];
    let list = p.monuments;
    const q = this.monumentSearch().trim().toLowerCase();
    const cat = this.monumentCategory();
    
    // Filtre de recherche textuelle (nom ou description)
    if (q) {
      list = list.filter(
        (m) => m.nom.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
      );
    }
    
    // Filtre par catégorie
    if (cat) {
      list = list.filter((m) => m.categories.includes(cat));
    }
    
    return list;
  });

  // Méthodes de mise à jour des signaux d'interface
  setTab(tab: TabKey) {
    this.activeTab.set(tab);
  }
  setMonumentSearch(val: string) {
    this.monumentSearch.set(val);
  }
  setMonumentCategory(val: string) {
    this.monumentCategory.set(val);
  }

  // Fonctions utilitaires importées pour usage dans le template
  initiales = getInitials;
  commentStatusClass = getCommentStatusClass;

  /**
   * Vérifie si ce patrimoine est dans les favoris de l'utilisateur.
   */
  isFavoritePatrimoine() {
    return this.favorites.isPatrimoineFavorite(this.patrimoine());
  }

  /**
   * Bascule l'état favori de ce patrimoine (ajout/retrait).
   */
  toggleFavoritePatrimoine() {
    this.favorites.togglePatrimoine(this.patrimoine());
  }
}
