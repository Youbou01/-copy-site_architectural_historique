import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatrimoineService } from '../../../services/patrimoine.service';
import { PatrimoineCardComponent } from '../patrimoine-card/patrimoine-card.component';

@Component({
  selector: 'app-patrimoine-list',
  standalone: true,
  imports: [CommonModule, PatrimoineCardComponent],
  templateUrl: './patrimoine-list.component.html',
  styleUrls: ['./patrimoine-list.component.css'],
})
export class PatrimoineListComponent implements OnInit {
  private service = inject(PatrimoineService);

  patrimoines = computed(() => this.service.patrimoines());
  loading = computed(() => this.service.loading());
  error = computed(() => this.service.error());

  ngOnInit(): void {
    this.service.loadAll();
  }
}
