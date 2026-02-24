/**
 * Configuration API pour SafeWalk
 * 
 * Cette configuration garantit que l'URL de l'API est correctement définie
 * en développement et en production.
 */

// Fonction pour obtenir l'URL de l'API
export function getApiUrl(): string {
  // 1. Essayer d'utiliser EXPO_PUBLIC_API_URL (définie dans les secrets Manus)
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  if (envApiUrl) {
    logger.info('✅ API URL depuis EXPO_PUBLIC_API_URL:', envApiUrl);
    return envApiUrl;
  }
  
  // 2. Fallback: utiliser l'URL publique Manus exposée
  const manusPublicUrl = 'https://3000-i97kkuvwkekymxd119cln-297f2a9c.us2.manus.computer';
  logger.warn('⚠️ EXPO_PUBLIC_API_URL non définie, utilisation du fallback:', manusPublicUrl);
  
  return manusPublicUrl;
}

// Exporter l'URL de l'API
export const API_BASE_URL = getApiUrl();

// Fonction pour tester la connexion à l'API
export async function testApiConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      logger.info('✅ API Health Check OK:', data);
      return true;
    } else {
      logger.error('❌ API Health Check Failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    logger.error('❌ API Connection Error:', error);
    return false;
  }
}
