import { OtpErrorCode } from "../types/otp-errors";

/**
 * Service de validation et formatage de numéro de téléphone
 * Supporte les formats français et internationaux
 */

interface PhoneValidationResult {
  isValid: boolean;
  formatted?: string;
  errorCode?: OtpErrorCode;
  message?: string;
  displayFormat?: string;
  feedback?: string;
  isE164Valid?: boolean;
}

/**
 * Valide un numéro de téléphone au format E.164
 * @param phone Numéro de téléphone à valider
 * @returns true si le numéro est valide au format E.164
 */
export function isValidE164(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Valide un numéro de téléphone français
 * @param phone Numéro de téléphone à valider
 * @returns true si le numéro est valide (9 chiffres après le 0 ou 33)
 */
export function isValidFrenchPhone(phone: string): boolean {
  // Accepte: 0612345678, +33612345678, 33612345678
  const frenchRegex = /^(?:0|\+33|33)[1-9]\d{8}$/;
  return frenchRegex.test(phone);
}

/**
 * Formate un numéro de téléphone en E.164
 * @param input Numéro brut (peut être avec espaces, tirets, etc.)
 * @returns Numéro formaté en E.164 ou string vide si invalide
 */
export function formatToE164(input: string): string {
  if (!input) return "";

  // Supprimer tous les caractères non-numériques
  const digits = input.replace(/\D/g, "");

  if (!digits) return "";

  // Cas français: commence par 0
  if (digits.startsWith("0")) {
    if (digits.length !== 10) return "";
    return `+33${digits.slice(1)}`;
  }

  // Cas français: commence par 33
  if (digits.startsWith("33")) {
    if (digits.length !== 12) return "";
    return `+${digits}`;
  }

  // Autres pays: au moins 10 chiffres
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return "";
}

/**
 * Formate un numéro pour l'affichage lisible
 * @param phone Numéro au format E.164
 * @returns Numéro formaté pour l'affichage (ex: +33 6 12 34 56 78)
 */
export function formatForDisplay(phone: string): string {
  if (!isValidE164(phone)) return phone;

  // Numéro français
  if (phone.startsWith("+33")) {
    const digits = phone.slice(3); // Enlever +33
    return `+33 ${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }

  // Autres formats: +XX XXX XXX XXX XXX
  const digits = phone.slice(1); // Enlever le +
  const countryCode = digits.slice(0, -10);
  const remaining = digits.slice(-10);

  if (remaining.length === 10) {
    return `+${countryCode} ${remaining.slice(0, 3)} ${remaining.slice(3, 6)} ${remaining.slice(6, 8)} ${remaining.slice(8, 10)}`;
  }

  return phone;
}

/**
 * Valide un numéro de téléphone et retourne un résultat détaillé
 * @param input Numéro brut
 * @returns Résultat de validation avec code d'erreur si invalide
 */
export function validatePhoneNumber(input: string): PhoneValidationResult {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      errorCode: OtpErrorCode.EMPTY_PHONE,
      message: "Numéro de téléphone requis",
      feedback: "Veuillez entrer un numéro de téléphone",
      isE164Valid: false,
    };
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return {
      isValid: false,
      errorCode: OtpErrorCode.EMPTY_PHONE,
      message: "Numéro de téléphone requis",
      feedback: "Veuillez entrer un numéro de téléphone",
      isE164Valid: false,
    };
  }

  // Compter les chiffres
  const digits = extractDigits(trimmed);
  
  // Vérifier si c'est un numéro français
  if (!isValidFrenchPhone(trimmed)) {
    let feedback = "Format invalide. ";
    
    if (digits.length === 0) {
      feedback += "Entrez au moins 9 chiffres.";
    } else if (digits.length < 9) {
      feedback += (9 - digits.length) + " chiffre(s) manquant(s).";
    } else if (digits.length > 9) {
      feedback += "Trop de chiffres (maximum 9).";
    } else if (!trimmed.match(/^[0+]/)) {
      feedback += "Commencez par 0 ou +33.";
    } else {
      feedback += "Utilisez le format: 06 12 34 56 78 ou +33 6 12 34 56 78";
    }
    
    return {
      isValid: false,
      errorCode: OtpErrorCode.INVALID_PHONE_FORMAT,
      message: "Format invalide. Utilisez +33... ou 06...",
      feedback: feedback,
      isE164Valid: false,
    };
  }

  // Formater en E.164
  const formatted = formatToE164(trimmed);

  if (!formatted || !isValidE164(formatted)) {
    return {
      isValid: false,
      errorCode: OtpErrorCode.INVALID_PHONE_FORMAT,
      message: "Format invalide. Utilisez +33... ou 06...",
      feedback: "Le numéro n'a pas pu être formaté au format E.164. Vérifiez le format.",
      isE164Valid: false,
    };
  }

  return {
    isValid: true,
    formatted,
    displayFormat: formatForDisplay(formatted),
    feedback: "Numéro valide: " + formatForDisplay(formatted),
    isE164Valid: true,
  };
}

/**
 * Extrait les chiffres d'un numéro de téléphone
 * @param input Numéro avec possibles espaces, tirets, etc.
 * @returns Chaîne de chiffres uniquement
 */
export function extractDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Formate un numéro français pour l'affichage (sans +33)
 * @param input Numéro brut (ex: 612345678)
 * @returns Numéro formaté (ex: 6 12 34 56 78)
 */
export function formatFrenchPhoneForInput(input: string): string {
  const digits = extractDigits(input);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;

  // Format: X XX XX XX XX (9 chiffres)
  return `${digits[0]} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

/**
 * Vérifie si un numéro est complet (9 chiffres pour la France)
 * @param input Numéro brut
 * @returns true si le numéro a 9 chiffres
 */
export function isCompletePhoneNumber(input: string): boolean {
  const digits = extractDigits(input);
  return digits.length === 9;
}

/**
 * Obtient le nombre de chiffres manquants
 * @param input Numéro brut
 * @returns Nombre de chiffres manquants (0 si complet)
 */
export function getMissingDigits(input: string): number {
  const digits = extractDigits(input);
  return Math.max(0, 9 - digits.length);
}

/**
 * Valide strictement au format E.164
 * @param phone Numéro au format E.164
 * @returns true si valide au format E.164
 */
export function isStrictE164(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  return isValidE164(phone);
}

/**
 * Obtient un message de feedback détaillé pour la validation
 * @param input Numéro brut
 * @returns Message de feedback pour l'utilisateur
 */
export function getValidationFeedback(input: string): string {
  const result = validatePhoneNumber(input);
  return result.feedback || result.message || '';
}

/**
 * Valide un numéro de téléphone au format E.164 avec message d'erreur détaillé
 * @param phone Numéro au format E.164
 * @returns { isValid, message }
 */
export function validateE164Strict(phone: string): { isValid: boolean; message?: string } {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      message: 'Numéro de téléphone requis',
    };
  }

  if (!isValidE164(phone)) {
    return {
      isValid: false,
      message: 'Format E.164 invalide. Attendu: +[1-9]XXX... (ex: +33612345678)',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Formate un numéro pour l'affichage dans un TextInput
 * @param input Numéro brut
 * @returns Numéro formaté avec espaces
 */
export function formatPhoneForInput(input: string): string {
  const digits = extractDigits(input);

  if (digits.length === 0) return "";

  // Format français: X XX XX XX XX
  // Toujours formatter, même si > 9 chiffres (prendre seulement les 9 premiers)
  const first9 = digits.slice(0, 9);
  return formatFrenchPhoneForInput(first9);
}
