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
import { NgClass, NgFor } from '@angular/common';

type CarouselVariant = 'default' | 'focus' | 'filmstrip' | 'split';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgClass, NgFor],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  @Input() images: string[] = [];
  @Input() altTexts: string[] = [];              // parallel alt array (fallback to monument name in usage site)
  @Input() height?: string;                      // optional override
  @Input() loop = true;
  @Input() options: EmblaOptionsType = {};
  @Input() autoplay = true;
  @Input() intervalMs = 4800;
  @Input() showThumbnails = true;
  @Input() kenBurns = false;                     // enable subtle zoom animation
  @Input() variant: CarouselVariant = 'default';
  @Input() framed = false;                       // independent aesthetic flag
  @Input() objectFit: 'cover' | 'contain' = 'cover';
  @Input() disableProgress = false;

  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLDivElement>;

  private embla?: EmblaCarouselType;
  private timer: any;
  private host = inject(ElementRef<HTMLElement>);

  activeIndex = signal(0);
  progress = signal(0);

  // Dynamically derive computed height when not specified
  autoHeight = computed(() => {
    if (this.height) return this.height;
    // Use a clamp for responsiveness
    return 'clamp(300px, 55vh, 560px)';
  });

  ngAfterViewInit(): void {
    if (!this.viewportRef?.nativeElement) return;
    const opts: EmblaOptionsType = {
      loop: this.loop,
      align: 'start',
      skipSnaps: false,
      ...this.options,
    };
    this.embla = EmblaCarousel(this.viewportRef.nativeElement, opts);
    this.embla.on('select', () => {
      this.activeIndex.set(this.embla!.selectedScrollSnap());
      this.progress.set(0);
      this.restartAutoplay();
    });
    this.restartAutoplay();
    if (!this.disableProgress) {
      this.tickProgress();
    }
  }

  ngOnDestroy(): void {
    this.embla?.destroy();
    clearTimeout(this.timer);
  }

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

  canPrev() { return !!this.embla && this.embla.canScrollPrev(); }
  canNext() { return !!this.embla && this.embla.canScrollNext(); }
  prev() { this.embla?.scrollPrev(); }
  next() { this.embla?.scrollNext(); }
  goTo(i: number) { this.embla?.scrollTo(i); }

  keyHandler(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') this.prev();
    if (e.key === 'ArrowRight') this.next();
    // Vertical navigation for split variant thumbnails
    if (this.variant === 'split') {
      if (e.key === 'ArrowUp') this.prev();
      if (e.key === 'ArrowDown') this.next();
    }
  }

  altFor(i: number) {
    return this.altTexts[i] || `Image ${i + 1}`;
  }
}