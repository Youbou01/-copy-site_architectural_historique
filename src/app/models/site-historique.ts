import { Commentaire } from './commentaire';
import { LieuProche } from './lieu-proche';
import { Stats } from './stats';

export interface SiteHistorique {
  id: string;
  nom: string;
  localisation?: string;
  adresse?: string;
  description: string;
  origineHistorique?: string; // ajout pour refléter db.json
  photoCarousel: string[]; //make link in images(clicked) that correspond to monuments
  latitude: number;
  longitude: number;
  categories: string[];
  dateConstruction: string | null;
  estClasse: boolean;
  prixEntree: number;
  ouvert: boolean;
  horaires: string[];
  visitesGuideesDisponibles: boolean;
  lieuxProches: LieuProche[];
  comments: Commentaire[];
  monuments: SiteHistorique[];
  stats?: Stats;
}
