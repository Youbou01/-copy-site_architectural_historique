export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'editor';
  dernierLogin?: Date;
}
