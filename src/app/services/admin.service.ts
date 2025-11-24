import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SiteHistorique } from '../models/site-historique';
import { Commentaire } from '../models/commentaire';
import { NewCommentSubmission } from '../models/admin';
import { Observable } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';

/**
 * Service for admin operations including CRUD for patrimoines/monuments
 * and comment moderation
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:3000/patrimoines';

  // Signal to track if user is admin (simple auth for this app)
  readonly isAdmin = signal<boolean>(false);

  /**
   * Toggle admin mode (simple authentication for demo purposes)
   */
  toggleAdminMode() {
    this.isAdmin.set(!this.isAdmin());
  }

  /**
   * Set admin mode state
   */
  setAdminMode(value: boolean) {
    this.isAdmin.set(value);
  }

  // ============ PATRIMOINE CRUD ============

  /**
   * Create a new patrimoine
   */
  createPatrimoine(patrimoine: SiteHistorique): Observable<SiteHistorique> {
    return this.http.post<SiteHistorique>(this.baseUrl, patrimoine);
  }

  /**
   * Update an existing patrimoine
   */
  updatePatrimoine(id: string, patrimoine: SiteHistorique): Observable<SiteHistorique> {
    return this.http.put<SiteHistorique>(`${this.baseUrl}/${id}`, patrimoine);
  }

  /**
   * Delete a patrimoine
   */
  deletePatrimoine(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ============ MONUMENT CRUD ============

  /**
   * Add a new monument to a patrimoine
   */
  addMonument(patrimoineId: string, monument: SiteHistorique): Observable<SiteHistorique> {
    return this.http.get<SiteHistorique>(`${this.baseUrl}/${patrimoineId}`).pipe(
      switchMap((patrimoine) => {
        patrimoine.monuments = patrimoine.monuments || [];
        patrimoine.monuments.push(monument);
        return this.updatePatrimoine(patrimoineId, patrimoine);
      })
    );
  }

  /**
   * Update a monument within a patrimoine
   */
  updateMonument(
    patrimoineId: string,
    monumentId: string,
    monument: SiteHistorique
  ): Observable<SiteHistorique> {
    return this.http.get<SiteHistorique>(`${this.baseUrl}/${patrimoineId}`).pipe(
      switchMap((patrimoine) => {
        const index = patrimoine.monuments.findIndex((m) => m.id === monumentId);
        if (index !== -1) {
          patrimoine.monuments[index] = monument;
        }
        return this.updatePatrimoine(patrimoineId, patrimoine);
      })
    );
  }

  /**
   * Delete a monument from a patrimoine
   */
  deleteMonument(patrimoineId: string, monumentId: string): Observable<SiteHistorique> {
    return this.http.get<SiteHistorique>(`${this.baseUrl}/${patrimoineId}`).pipe(
      switchMap((patrimoine) => {
        patrimoine.monuments = patrimoine.monuments.filter((m) => m.id !== monumentId);
        return this.updatePatrimoine(patrimoineId, patrimoine);
      })
    );
  }

  // ============ COMMENT MANAGEMENT ============

  /**
   * Add a new comment with "en attente" status
   */
  addComment(submission: NewCommentSubmission): Observable<SiteHistorique> {
    return new Observable((observer) => {
      this.http.get<SiteHistorique>(`${this.baseUrl}/${submission.patrimoineId}`).subscribe({
        next: (patrimoine) => {
          const newComment: Commentaire = {
            id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            nom: submission.nom,
            message: submission.message,
            date: new Date().toISOString().split('T')[0],
            note: submission.note,
            etat: 'en attente',
          };

          if (submission.monumentId) {
            // Add comment to monument
            const monument = patrimoine.monuments.find((m) => m.id === submission.monumentId);
            if (monument) {
              monument.comments = monument.comments || [];
              monument.comments.push(newComment);
            }
          } else {
            // Add comment to patrimoine
            patrimoine.comments = patrimoine.comments || [];
            patrimoine.comments.push(newComment);
          }

          this.http
            .put<SiteHistorique>(`${this.baseUrl}/${submission.patrimoineId}`, patrimoine)
            .subscribe({
              next: (updated) => {
                observer.next(updated);
                observer.complete();
              },
              error: (err) => observer.error(err),
            });
        },
        error: (err) => observer.error(err),
      });
    });
  }

  /**
   * Update comment status (approve) or delete (reject)
   */
  updateCommentStatus(
    patrimoineId: string,
    commentId: string,
    newState: 'approuvé' | 'rejeté',
    monumentId?: string
  ): Observable<SiteHistorique> {
    return new Observable((observer) => {
      this.http.get<SiteHistorique>(`${this.baseUrl}/${patrimoineId}`).subscribe({
        next: (patrimoine) => {
          let commentFound = false;

          if (monumentId) {
            // Update or delete comment in monument
            const monument = patrimoine.monuments.find((m) => m.id === monumentId);
            if (monument && monument.comments) {
              const commentIndex = monument.comments.findIndex((c) => c.id === commentId);
              if (commentIndex !== -1) {
                if (newState === 'rejeté') {
                  // Delete rejected comment
                  monument.comments.splice(commentIndex, 1);
                } else {
                  // Approve comment
                  monument.comments[commentIndex].etat = newState;
                }
                commentFound = true;
              }
            }
          } else {
            // Update or delete comment in patrimoine
            if (patrimoine.comments) {
              const commentIndex = patrimoine.comments.findIndex((c) => c.id === commentId);
              if (commentIndex !== -1) {
                if (newState === 'rejeté') {
                  // Delete rejected comment
                  patrimoine.comments.splice(commentIndex, 1);
                } else {
                  // Approve comment
                  patrimoine.comments[commentIndex].etat = newState;
                }
                commentFound = true;
              }
            }
          }

          if (!commentFound) {
            observer.error(new Error('Comment not found'));
            return;
          }

          this.http
            .put<SiteHistorique>(`${this.baseUrl}/${patrimoineId}`, patrimoine)
            .subscribe({
              next: (updated) => {
                observer.next(updated);
                observer.complete();
              },
              error: (err) => observer.error(err),
            });
        },
        error: (err) => observer.error(err),
      });
    });
  }

  /**
   * Get all pending comments across all patrimoines
   */
  getPendingComments(): Observable<
    Array<{
      comment: Commentaire;
      patrimoineId: string;
      patrimoineName: string;
      monumentId?: string;
      monumentName?: string;
    }>
  > {
    return new Observable((observer) => {
      this.http.get<SiteHistorique[]>(this.baseUrl).subscribe({
        next: (patrimoines) => {
          const pendingComments: Array<{
            comment: Commentaire;
            patrimoineId: string;
            patrimoineName: string;
            monumentId?: string;
            monumentName?: string;
          }> = [];

          patrimoines.forEach((patrimoine) => {
            // Check patrimoine comments
            if (patrimoine.comments) {
              patrimoine.comments
                .filter((c) => c.etat === 'en attente')
                .forEach((comment) => {
                  pendingComments.push({
                    comment,
                    patrimoineId: patrimoine.id,
                    patrimoineName: patrimoine.nom,
                  });
                });
            }

            // Check monument comments
            if (patrimoine.monuments) {
              patrimoine.monuments.forEach((monument) => {
                if (monument.comments) {
                  monument.comments
                    .filter((c) => c.etat === 'en attente')
                    .forEach((comment) => {
                      pendingComments.push({
                        comment,
                        patrimoineId: patrimoine.id,
                        patrimoineName: patrimoine.nom,
                        monumentId: monument.id,
                        monumentName: monument.nom,
                      });
                    });
                }
              });
            }
          });

          observer.next(pendingComments);
          observer.complete();
        },
        error: (err) => observer.error(err),
      });
    });
  }
}
