/**
 * Interface représentant un lieu d'intérêt situé à proximité d'un site historique.
 * Utilisée pour suggérer des visites complémentaires aux visiteurs.
 */
export interface LieuProche {
  /** Nom du lieu d'intérêt proche */
  nom: string;
  
  /** Type ou catégorie du lieu (ex: "Restaurant", "Musée", "Parc", "Hôtel") */
  type: string;
  
  /** Distance en kilomètres entre le site principal et ce lieu (optionnelle) */
  distanceKm?: number;
}
