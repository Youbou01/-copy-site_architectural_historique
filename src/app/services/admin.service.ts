import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SiteHistorique } from '../models/site-historique';
import { Commentaire } from '../models/commentaire';
import { NewCommentSubmission } from '../models/admin';
import { Observable, tap } from 'rxjs';

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
      tap((patrimoine) => {
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
      tap((patrimoine) => {
        const index = patrimoine.monuments.findIndex((m) => m.id === monumentId);
        if (index !== -1) {
          patrimoine.monuments[index] = monument;
          return this.updatePatrimoine(patrimoineId, patrimoine);
        }
      })
    );
  }

  /**
   * Delete a monument from a patrimoine
   */
  deleteMonument(patrimoineId: string, monumentId: string): Observable<SiteHistorique> {
    return this.http.get<SiteHistorique>(`${this.baseUrl}/${patrimoineId}`).pipe(
      tap((patrimoine) => {
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
            id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
   * Update comment status (approve or reject)
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
            // Update comment in monument
            const monument = patrimoine.monuments.find((m) => m.id === monumentId);
            if (monument && monument.comments) {
              const comment = monument.comments.find((c) => c.id === commentId);
              if (comment) {
                comment.etat = newState;
                commentFound = true;
              }
            }
          } else {
            // Update comment in patrimoine
            if (patrimoine.comments) {
              const comment = patrimoine.comments.find((c) => c.id === commentId);
              if (comment) {
                comment.etat = newState;
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
