/**
 * Shared utility functions used across components
 */

/**
 * Generates initials from a person's name (first 2 words)
 * @param nom The full name
 * @returns A string with uppercase initials (e.g., "John Doe" -> "JD")
 */
export function getInitials(nom: string): string {
  const parts = nom.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}

/**
 * Returns the appropriate CSS class for a comment status
 * @param etat The comment status (e.g., 'approuvé', 'en attente', 'rejeté')
 * @returns The corresponding CSS class name
 */
export function getCommentStatusClass(etat: string): string {
  switch (etat) {
    case 'approuvé':
      return 'approved';
    case 'en attente':
      return 'pending';
    case 'rejeté':
      return 'rejected';
    default:
      return '';
  }
}
