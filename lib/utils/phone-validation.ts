/**
 * Valide un numéro de téléphone au format international
 * Accepte les formats : +33612345678, +33 6 12 34 56 78, +1-555-123-4567, etc.
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Le numéro de téléphone est requis' };
  }

  const trimmed = phone.trim();

  // Doit commencer par +
  if (!trimmed.startsWith('+')) {
    return { 
      valid: false, 
      error: 'Le numéro doit commencer par + suivi de l\'indicatif pays (ex: +33 pour la France)' 
    };
  }

  // Retirer tous les caractères non-numériques sauf le +
  const digitsOnly = trimmed.replace(/[^\d+]/g, '');

  // Doit avoir au moins 10 chiffres (+ indicatif pays + numéro)
  // Format minimum : +33612345678 (12 caractères)
  if (digitsOnly.length < 10) {
    return { 
      valid: false, 
      error: 'Le numéro est trop court. Format attendu : +33612345678' 
    };
  }

  // Doit avoir au maximum 15 chiffres (norme E.164)
  if (digitsOnly.length > 16) { // +1 pour le +
    return { 
      valid: false, 
      error: 'Le numéro est trop long' 
    };
  }

  // Vérifier que c'est bien un format international valide
  const internationalRegex = /^\+\d{1,3}[\s\-]?(\d[\s\-]?){8,14}$/;
  if (!internationalRegex.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Format invalide. Utilisez le format international : +33612345678' 
    };
  }

  return { valid: true };
}

/**
 * Formate un numéro de téléphone pour l'affichage
 * Exemple : +33612345678 → +33 6 12 34 56 78
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  const trimmed = phone.trim();
  
  // Si c'est un numéro français (+33)
  if (trimmed.startsWith('+33')) {
    const digits = trimmed.replace(/[^\d]/g, '').substring(2); // Retirer 33
    if (digits.length === 9) {
      // Format : +33 6 12 34 56 78
      return `+33 ${digits[0]} ${digits.substring(1, 3)} ${digits.substring(3, 5)} ${digits.substring(5, 7)} ${digits.substring(7)}`;
    }
  }

  // Si c'est un numéro américain (+1)
  if (trimmed.startsWith('+1')) {
    const digits = trimmed.replace(/[^\d]/g, '').substring(1); // Retirer 1
    if (digits.length === 10) {
      // Format : +1 (555) 123-4567
      return `+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    }
  }

  // Sinon, retourner tel quel
  return trimmed;
}

/**
 * Normalise un numéro de téléphone pour l'envoi de SMS
 * Retire tous les espaces et caractères spéciaux sauf le +
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}
