import { describe, it, expect } from 'vitest';

/**
 * Test: Vérifier que EXPO_PUBLIC_API_URL pointe vers le serveur Manus
 */
describe('API URL Manus Configuration', () => {
  it('should have EXPO_PUBLIC_API_URL configured to Manus server', () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    console.log('🔗 EXPO_PUBLIC_API_URL:', apiUrl);
    expect(apiUrl).toBeDefined();
    expect(apiUrl).toContain('manus.computer');
    expect(apiUrl).toContain('3000');
  });

  it('should be able to connect to Manus API server', async () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) {
      console.warn('⚠️ EXPO_PUBLIC_API_URL not configured');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📊 API Response Status:', response.status);
      expect(response.status).toBe(200);

      const data = await response.json();
      console.log('✅ API Health Check:', JSON.stringify(data, null, 2));
      expect(data.ok).toBe(true);
    } catch (error) {
      console.error('❌ Failed to connect to API:', error);
      throw error;
    }
  });
});
