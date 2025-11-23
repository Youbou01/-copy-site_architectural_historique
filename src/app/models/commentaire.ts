/**
 * Type énumérant les états possibles d'un commentaire après modération
 */
export type EtatCommentaire = 'approuvé' | 'en attente' | 'rejeté';

/**
 * Interface représentant un commentaire ou avis laissé par un visiteur sur un site/monument
 */
export interface Commentaire {
  /** Identifiant unique du commentaire */
  id: string;
  
  /** Nom ou pseudo de l'auteur du commentaire */
  nom: string;
  
  /** Contenu textuel du commentaire ou avis */
  message: string;
  
  /** Date de publication au format ISO string (sera converti en Date si nécessaire) */
  date: string;
  
  /** Note attribuée par le visiteur (optionnelle, généralement de 1 à 5) */
  note?: number;
  
  /** État de modération du commentaire, utilisé pour le filtrage côté back-office */
  etat: EtatCommentaire;
}
