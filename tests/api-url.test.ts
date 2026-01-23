import { describe, it, expect } from 'vitest';

describe('EXPO_PUBLIC_API_URL', () => {
  it('should be defined and accessible', async () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    
    expect(apiUrl).toBeDefined();
    expect(apiUrl).toContain('https://');
    
    // Tester l'endpoint /api/sms/health
    const response = await fetch(`${apiUrl}/api/sms/health`);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.service).toBe('SMS API');
    expect(data.twilioConfigured).toBe(true);
  });
});
