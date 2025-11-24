import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../../../services/admin.service';
import { NewCommentSubmission } from '../../../../models/admin';

/**
 * Comment submission form component
 * Allows users to submit comments that will be pending approval
 */
@Component({
  selector: 'app-comment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comment-form.component.html',
  styleUrl: './comment-form.component.css',
})
export class CommentFormComponent {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);

  // Inputs
  patrimoineId = input.required<string>();
  monumentId = input<string>();
  showModal = input<boolean>(false);

  // Outputs
  closeModal = output<void>();
  commentSubmitted = output<void>();

  submitting = signal(false);
  error = signal<string | null>(null);

  commentForm = this.fb.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
    note: [5, [Validators.min(1), Validators.max(5)]],
  });

  submitComment() {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const formValue = this.commentForm.value;
    const submission: NewCommentSubmission = {
      nom: formValue.nom!,
      message: formValue.message!,
      note: formValue.note!,
      patrimoineId: this.patrimoineId(),
      monumentId: this.monumentId(),
    };

    this.adminService.addComment(submission).subscribe({
      next: () => {
        this.submitting.set(false);
        this.commentForm.reset({ note: 5 });
        this.commentSubmitted.emit();
        this.close();
      },
      error: (err) => {
        console.error('Error submitting comment:', err);
        this.error.set('Erreur lors de l\'envoi du commentaire. Veuillez réessayer.');
        this.submitting.set(false);
      },
    });
  }

  close() {
    this.commentForm.reset({ note: 5 });
    this.error.set(null);
    this.closeModal.emit();
  }

  getFieldError(fieldName: string): string | null {
    const field = this.commentForm.get(fieldName);
    if (!field || !field.touched || !field.errors) return null;

    if (field.errors['required']) return 'Ce champ est requis';
    if (field.errors['minlength'])
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    if (field.errors['min']) return `Note minimum: ${field.errors['min'].min}`;
    if (field.errors['max']) return `Note maximum: ${field.errors['max'].max}`;

    return null;
  }
}
