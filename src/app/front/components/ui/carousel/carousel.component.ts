import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import EmblaCarousel, { type EmblaCarouselType, type EmblaOptionsType } from 'embla-carousel';
import { NgClass, } from '@angular/common';

@Component({
  selector: 'app-carousel',
  standalone: true,
  imports: [ NgClass],
  templateUrl: './carousel.component.html',
  styleUrls: ['./carousel.component.css'],
})
export class CarouselComponent implements AfterViewInit, OnDestroy {
  @Input() images: string[] = [];
  @Input() height = '320px';
  @Input() loop = true;
  @Input() options: EmblaOptionsType = {};

  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLDivElement>;
  private embla?: EmblaCarouselType;
  private host = inject(ElementRef<HTMLElement>);

  ngAfterViewInit(): void {
    if (!this.viewportRef?.nativeElement) return;
    const opts: EmblaOptionsType = {
      loop: this.loop,
      align: 'start',
      skipSnaps: false,
      ...this.options,
    };
    this.embla = EmblaCarousel(this.viewportRef.nativeElement, opts);
  }

  ngOnDestroy(): void {
    this.embla?.destroy();
  }

  canPrev() {
    return !!this.embla && this.embla.canScrollPrev();
  }
  canNext() {
    return !!this.embla && this.embla.canScrollNext();
  }
  prev() {
    this.embla?.scrollPrev();
  }
  next() {
    this.embla?.scrollNext();
  }
}
