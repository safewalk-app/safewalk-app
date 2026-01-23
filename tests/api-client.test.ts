import { describe, it, expect } from 'vitest';
import { checkHealth, getAPIUrl } from '../lib/services/api-client';

describe('API Client', () => {
  it('should have EXPO_PUBLIC_API_URL configured', () => {
    const apiUrl = getAPIUrl();
    expect(apiUrl).toBeDefined();
    expect(apiUrl).toContain('https://');
    console.log('✅ API URL configurée:', apiUrl);
  });

  it('should successfully call /api/sms/health', async () => {
    const result = await checkHealth();
    
    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
    expect(result.service).toBe('SMS API');
    expect(result.twilioConfigured).toBe(true);
    
    console.log('✅ Health check réussi:', result);
  }, 10000); // Timeout de 10s pour l'appel réseau
});
