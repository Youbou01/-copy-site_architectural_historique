import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { Commentaire } from '../../../models/commentaire';

interface PendingCommentItem {
  comment: Commentaire;
  patrimoineId: string;
  patrimoineName: string;
  monumentId?: string;
  monumentName?: string;
}

/**
 * Comment moderation component for admin
 * Allows approving or rejecting pending comments in real-time
 */
@Component({
  selector: 'app-comment-moderation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comment-moderation.component.html',
  styleUrl: './comment-moderation.component.css',
})
export class CommentModerationComponent implements OnInit {
  private adminService = inject(AdminService);

  pendingComments = signal<PendingCommentItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  processingCommentId = signal<string | null>(null);

  ngOnInit() {
    this.loadPendingComments();
  }

  loadPendingComments() {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getPendingComments().subscribe({
      next: (comments) => {
        this.pendingComments.set(comments);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading pending comments:', err);
        this.error.set('Erreur lors du chargement des commentaires');
        this.loading.set(false);
      },
    });
  }

  approveComment(item: PendingCommentItem) {
    this.processingCommentId.set(item.comment.id);

    this.adminService
      .updateCommentStatus(item.patrimoineId, item.comment.id, 'approuvé', item.monumentId)
      .subscribe({
        next: () => {
          // Remove from pending list
          const updated = this.pendingComments().filter((c) => c.comment.id !== item.comment.id);
          this.pendingComments.set(updated);
          this.processingCommentId.set(null);
        },
        error: (err) => {
          console.error('Error approving comment:', err);
          alert('Erreur lors de l\'approbation du commentaire');
          this.processingCommentId.set(null);
        },
      });
  }

  rejectComment(item: PendingCommentItem) {
    this.processingCommentId.set(item.comment.id);

    this.adminService
      .updateCommentStatus(item.patrimoineId, item.comment.id, 'rejeté', item.monumentId)
      .subscribe({
        next: () => {
          // Remove from pending list
          const updated = this.pendingComments().filter((c) => c.comment.id !== item.comment.id);
          this.pendingComments.set(updated);
          this.processingCommentId.set(null);
        },
        error: (err) => {
          console.error('Error rejecting comment:', err);
          alert('Erreur lors du rejet du commentaire');
          this.processingCommentId.set(null);
        },
      });
  }

  isProcessing(commentId: string): boolean {
    return this.processingCommentId() === commentId;
  }
}
