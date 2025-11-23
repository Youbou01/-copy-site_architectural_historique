import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  signal,
  inject,
  effect,
  computed
} from '@angular/core';
import EmblaCarousel, { type EmblaCarouselType, type EmblaOptionsType } from 'embla-carousel';

/** Types de variantes visuelles pour le carousel */
type CarouselVariant = 'default' | 'focus' | 'filmstrip' | 'split';

/**
 * Composant Carousel réutilisable basé sur Embla Carousel.
 * 
 * Responsabilités:
 * - Affichage d'un carrousel d'images avec navigation manuelle et automatique
 * - Support de plusieurs variantes visuelles (default, focus, filmstrip, split)
 * - Autoplay configurable avec indicateur de progression
 * - Navigation clavier (flèches gauche/droite, haut/bas pour split)
 * - Miniatures (thumbnails) optionnelles pour navigation rapide
 * - Support de l'animation Ken Burns (zoom subtil) si activée
 */
@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  // Inputs de configuration
  @Input() images: string[] = [];                       // URLs des images à afficher
  @Input() altTexts: string[] = [];                     // Textes alternatifs parallèles pour accessibilité
  @Input() height?: string;                             // Hauteur personnalisée (optionnelle)
  @Input() loop = true;                                 // Boucle infinie du carrousel
  @Input() options: EmblaOptionsType = {};              // Options Embla avancées
  @Input() autoplay = true;                             // Activation de l'autoplay
  @Input() intervalMs = 4800;                           // Intervalle entre slides en autoplay (ms)
  @Input() showThumbnails = true;                       // Affichage des miniatures
  @Input() kenBurns = false;                            // Activation de l'animation Ken Burns (zoom)
  @Input() variant: CarouselVariant = 'default';        // Variante visuelle du carousel
  @Input() framed = false;                              // Flag esthétique indépendant (cadre)
  @Input() objectFit: 'cover' | 'contain' = 'cover';    // Mode d'ajustement des images
  @Input() disableProgress = false;                     // Désactivation de la barre de progression

  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLDivElement>;

  private embla?: EmblaCarouselType;  // Instance Embla Carousel
  private timer: any;                 // Timer pour l'autoplay
  private host = inject(ElementRef<HTMLElement>);

  // Signaux réactifs
  activeIndex = signal(0);   // Index de la slide actuellement affichée
  progress = signal(0);      // Progression de l'autoplay (0-100%)

  /**
   * Calcul dérivé: hauteur automatique du carousel si non spécifiée.
   * Utilise clamp() pour une hauteur responsive.
   */
  autoHeight = computed(() => {
    if (this.height) return this.height;
    // Hauteur responsive: minimum 300px, 55% viewport, maximum 560px
    return 'clamp(300px, 55vh, 560px)';
  });

  /**
   * Méthode du cycle de vie: initialisation du carousel Embla après rendu de la vue.
   * Configure les options, les événements et démarre l'autoplay si activé.
   */
  ngAfterViewInit(): void {
    if (!this.viewportRef?.nativeElement) return;
    
    const opts: EmblaOptionsType = {
      loop: this.loop,
      align: 'start',
      skipSnaps: false,
      ...this.options,
    };
    
    // Initialisation d'Embla Carousel
    this.embla = EmblaCarousel(this.viewportRef.nativeElement, opts);
    
    // Événement de sélection: mise à jour de l'index actif et redémarrage autoplay
    this.embla.on('select', () => {
      this.activeIndex.set(this.embla!.selectedScrollSnap());
      this.progress.set(0);
      this.restartAutoplay();
    });
    
    this.restartAutoplay();
    
    // Lancement de l'animation de progression si non désactivée
    if (!this.disableProgress) {
      this.tickProgress();
    }
  }

  /**
   * Méthode du cycle de vie: nettoyage lors de la destruction du composant.
   * Détruit l'instance Embla et efface le timer d'autoplay.
   */
  ngOnDestroy(): void {
    this.embla?.destroy();
    clearTimeout(this.timer);
  }

  /**
   * Redémarre le timer d'autoplay.
   * Passe à la slide suivante après intervalMs, ou revient au début si loop activé.
   */
  private restartAutoplay() {
    if (!this.autoplay) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.embla) return;
      if (this.embla.canScrollNext()) {
        this.embla.scrollNext();
      } else if (this.loop) {
        this.embla.scrollTo(0);
      }
    }, this.intervalMs);
  }

  /**
   * Animation de la barre de progression (requestAnimationFrame).
   * Incrémente progressivement le signal progress jusqu'à 100%.
   */
  private tickProgress() {
    let last = performance.now();
    const step = (now: number) => {
      const delta = now - last;
      last = now;
      const inc = (delta / this.intervalMs) * 100;
      const next = this.progress() + inc;
      this.progress.set(next >= 100 ? 100 : next);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Méthodes publiques: contrôles de navigation
  canPrev() { return !!this.embla && this.embla.canScrollPrev(); }
  canNext() { return !!this.embla && this.embla.canScrollNext(); }
  prev() { this.embla?.scrollPrev(); }
  next() { this.embla?.scrollNext(); }
  goTo(i: number) { this.embla?.scrollTo(i); }

  /**
   * Gestionnaire d'événements clavier pour navigation.
   * - ArrowLeft/Right: navigation horizontale standard
   * - ArrowUp/Down: navigation verticale pour variante "split"
   */
  keyHandler(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') this.prev();
    if (e.key === 'ArrowRight') this.next();
    // Navigation verticale pour variante split avec thumbnails verticales
    if (this.variant === 'split') {
      if (e.key === 'ArrowUp') this.prev();
      if (e.key === 'ArrowDown') this.next();
    }
  }

  /**
   * Retourne le texte alternatif pour une image à l'index donné.
   * Fallback sur "Image {index}" si non fourni.
   */
  altFor(i: number) {
    return this.altTexts[i] || `Image ${i + 1}`;
  }
}