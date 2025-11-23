import { Commentaire } from './commentaire';
import { LieuProche } from './lieu-proche';
import { Stats } from './stats';

/**
 * Interface représentant un site historique ou un monument.
 * Utilisée à la fois pour les patrimoines (sites racine) et les monuments (sous-sites).
 * Structure récursive: un patrimoine peut contenir plusieurs monuments.
 */
export interface SiteHistorique {
  /** Identifiant unique du site, utilisé dans les routes et les requêtes API */
  id: string;
  
  /** Nom complet du site historique ou du monument */
  nom: string;
  
  /** Ville ou région où se situe le site (optionnel) */
  localisation?: string;
  
  /** Adresse postale complète du site (optionnelle) */
  adresse?: string;
  
  /** Description détaillée du site, affichée dans la vue détail */
  description: string;
  
  /** Historique et origine du site, utilisé pour enrichir la section "À propos" */
  origineHistorique?: string;
  
  /** Tableau d'URLs des photos pour le carousel, affichées dans l'ordre défini */
  photoCarousel: string[];
  
  /** Coordonnée géographique - latitude, utilisée pour la carte interactive */
  latitude: number;
  
  /** Coordonnée géographique - longitude, utilisée pour la carte interactive */
  longitude: number;
  
  /** Liste des catégories associées (ex: "Château", "Monument", "UNESCO"), utilisées pour le filtrage */
  categories: string[];
  
  /** Date de construction au format texte (ex: "1789" ou "XIIe siècle"), peut être null si inconnue */
  dateConstruction: string | null;
  
  /** Indique si le site est classé monument historique ou UNESCO */
  estClasse: boolean;
  
  /** Prix d'entrée en euros (0 si gratuit) */
  prixEntree: number;
  
  /** Indique si le site est actuellement ouvert au public */
  ouvert: boolean;
  
  /** Horaires d'ouverture sous forme de tableau de chaînes (ex: ["Lundi: 9h-17h", "Mardi: fermé"]) */
  horaires: string[];
  
  /** Indique si des visites guidées sont disponibles pour ce site */
  visitesGuideesDisponibles: boolean;
  
  /** Liste des lieux d'intérêt à proximité du site */
  lieuxProches: LieuProche[];
  
  /** Commentaires et avis laissés par les visiteurs */
  comments: Commentaire[];
  
  /** Liste des monuments appartenant à ce patrimoine (structure récursive) */
  monuments: SiteHistorique[];
  
  /** Statistiques d'utilisation (vues, favoris, note moyenne) - optionnelles */
  stats?: Stats;
}
