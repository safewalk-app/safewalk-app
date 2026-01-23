import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valide le format d'un numéro de téléphone français
 * Format accepté : +33 suivi de 9 chiffres (ex: +33612345678)
 * 
 * @param phone - Le numéro de téléphone à valider
 * @returns true si le format est valide, false sinon
 * 
 * Usage:
 * ```tsx
 * if (!validatePhoneNumber(phone)) {
 *   alert('Format invalide. Utilisez +33 suivi de 9 chiffres.');
 * }
 * ```
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || phone.trim() === '') {
    return false;
  }
  const phoneRegex = /^\+33[0-9]{9}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Formate un numéro de téléphone pour l'affichage
 * Transforme +33612345678 en +33 6 12 34 56 78
 * 
 * @param phone - Le numéro de téléphone à formater
 * @returns Le numéro formaté
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || !validatePhoneNumber(phone)) {
    return phone;
  }
  const cleaned = phone.trim();
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
}

/**
 * Formate l'entrée utilisateur pour un numéro de téléphone français
 * - Auto-préfixe +33 si l'utilisateur tape 0 ou commence par un chiffre
 * - Formate avec des espaces : +33 6 12 34 56 78
 * - Limite à 17 caractères (avec espaces)
 * 
 * @param input - La saisie brute de l'utilisateur
 * @returns Le numéro formaté avec espaces
 * 
 * Usage:
 * ```tsx
 * <TextInput
 *   value={phone}
 *   onChangeText={(text) => setPhone(formatPhoneInput(text))}
 * />
 * ```
 */
export function formatPhoneInput(input: string): string {
  // Supprimer tous les caractères non numériques sauf le +
  let cleaned = input.replace(/[^\d+]/g, '');
  
  // Si l'utilisateur tape 0 au début, remplacer par +33
  if (cleaned.startsWith('0')) {
    cleaned = '+33' + cleaned.slice(1);
  }
  
  // Si l'utilisateur tape un chiffre sans +, ajouter +33
  if (cleaned.length > 0 && !cleaned.startsWith('+')) {
    cleaned = '+33' + cleaned;
  }
  
  // Limiter à +33 + 9 chiffres
  if (cleaned.startsWith('+33')) {
    cleaned = '+33' + cleaned.slice(3).replace(/\D/g, '').slice(0, 9);
  }
  
  // Formater avec des espaces : +33 6 12 34 56 78
  if (cleaned.length >= 3) {
    let formatted = cleaned.slice(0, 3); // +33
    const digits = cleaned.slice(3);
    
    if (digits.length > 0) {
      formatted += ' ' + digits.slice(0, 1); // premier chiffre
    }
    if (digits.length > 1) {
      formatted += ' ' + digits.slice(1, 3); // 2 chiffres
    }
    if (digits.length > 3) {
      formatted += ' ' + digits.slice(3, 5); // 2 chiffres
    }
    if (digits.length > 5) {
      formatted += ' ' + digits.slice(5, 7); // 2 chiffres
    }
    if (digits.length > 7) {
      formatted += ' ' + digits.slice(7, 9); // 2 derniers chiffres
    }
    
    return formatted;
  }
  
  return cleaned;
}

/**
 * Nettoie un numéro formaté pour le stockage
 * Transforme "+33 6 12 34 56 78" en "+33612345678"
 * 
 * @param formatted - Le numéro formaté avec espaces
 * @returns Le numéro sans espaces
 */
export function cleanPhoneNumber(formatted: string): string {
  return formatted.replace(/\s/g, '');
}

/**
 * Système anti-spam SMS basé sur des timestamps
 * Empêche l'envoi de SMS en double en trackant le dernier envoi par clé
 */
const smsTimestamps: Record<string, number> = {};

/**
 * Vérifie si un SMS peut être envoyé (anti-spam)
 * 
 * @param key - Clé unique identifiant le type de SMS (ex: 'alert', 'followup', 'sos')
 * @param minIntervalSeconds - Intervalle minimum en secondes entre deux envois (défaut: 60s)
 * @returns true si le SMS peut être envoyé, false sinon
 * 
 * Usage:
 * ```tsx
 * if (!canSendSMS('alert', 60)) {
 *   console.warn('SMS bloqué par anti-spam');
 *   return;
 * }
 * // Envoyer le SMS...
 * ```
 */
export function canSendSMS(key: string, minIntervalSeconds: number = 60): boolean {
  const now = Date.now();
  const lastSent = smsTimestamps[key];
  
  if (!lastSent) {
    // Premier envoi pour cette clé
    smsTimestamps[key] = now;
    return true;
  }
  
  const elapsedSeconds = (now - lastSent) / 1000;
  
  if (elapsedSeconds >= minIntervalSeconds) {
    // Intervalle respecté, autoriser l'envoi
    smsTimestamps[key] = now;
    return true;
  }
  
  // Bloquer l'envoi (spam détecté)
  console.warn(
    `🚫 [Anti-spam] SMS bloqué pour "${key}". ` +
    `Dernier envoi il y a ${elapsedSeconds.toFixed(0)}s (min: ${minIntervalSeconds}s)`
  );
  return false;
}

/**
 * Réinitialise le timestamp pour une clé donnée
 * Utile pour les tests ou pour forcer un nouvel envoi
 * 
 * @param key - Clé à réinitialiser
 */
export function resetSMSTimestamp(key: string): void {
  delete smsTimestamps[key];
}

/**
 * Réinitialise tous les timestamps SMS
 * Utile pour les tests
 */
export function resetAllSMSTimestamps(): void {
  Object.keys(smsTimestamps).forEach(key => delete smsTimestamps[key]);
}
