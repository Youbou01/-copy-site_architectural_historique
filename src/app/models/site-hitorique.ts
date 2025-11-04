import { Commentaire } from "./commentaire";
import { LieuProche } from "./lieu-proche";

export interface SiteHistorique {
  id: string;
  nom: string;
  localisation: string;
  description: string;
  photoCarousel: string[]; //make link in images(clicked) that correspond to monuments
  latitude: number;
  longitude: number;
  categories: string[];
  dateConstruction: Date;
  estClasse: boolean;
  prixEntree: number;
  ouvert:boolean;
  horaires: string[];
  visitesGuideesDisponibles: boolean;
  lieuxProches: LieuProche[];
  comments: Commentaire[];
  monuments:SiteHistorique[];
  
  
  
  
  
  

  
  
  
  
}
