/** Médecins correspondants (mappés depuis GET /api/medecins). */

export type Referent = {
  id: string;
  nom: string;
  specialite: string;
  ville: string;
  quartier: string;
  adresse: string;
  telephone: string;
  email: string;
};
