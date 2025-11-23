/**
 * Interface représentant les statistiques d'usage et de popularité d'un site historique.
 * Ces données peuvent être utilisées pour afficher des indicateurs de popularité.
 */
export interface Stats {
    /** Nombre total de vues/consultations du site */
    vues: number;
    
    /** Nombre d'utilisateurs ayant ajouté ce site à leurs favoris */
    favoris: number;
    
    /** Note moyenne calculée à partir de tous les commentaires notés (de 1 à 5) */
    noteMoyenne: number;
}
