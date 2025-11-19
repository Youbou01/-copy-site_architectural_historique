import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  effect
} from '@angular/core';
import EmblaCarousel, { type EmblaCarouselType, type EmblaOptionsType } from 'embla-carousel';
import { NgClass, NgFor } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [NgClass, NgFor],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  @Input() images: string[] = [];
  @Input() height = '320px';
  @Input() loop = true;
  @Input() options: EmblaOptionsType = {};
  @Input() autoplay = true;
  @Input() intervalMs = 4200;
  @Input() showThumbnails = true;

  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLDivElement>;
  private embla?: EmblaCarouselType;
  private host = inject(ElementRef<HTMLElement>);
  private timer: any;

  activeIndex = signal(0);
  progress = signal(0);

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
    this.tickProgress();
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
      if (next >= 100) {
        this.progress.set(100);
      } else {
        this.progress.set(next);
      }
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
  }
}