// En développement: localhost:3000
// En production: URL du serveur déployé
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export async function sendAlertSMSToMultiple(
  phoneNumbers: string[],
  limitTimeStr: string,
  tolerance: number,
  location?: { latitude: number; longitude: number }
): Promise<void> {
  try {
    console.log('📤 Appel API SMS avec:', { phoneNumbers, limitTimeStr, tolerance, location });
    const url = `${API_BASE_URL}/api/sms/alert`;
    console.log('🔗 URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, limitTimeStr, tolerance, location }),
    });
    
    console.log('📊 Réponse API:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Réponse API:', errorBody);
      throw new Error(`SMS API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ SMS envoyés avec succès:', data);
  } catch (error) {
    console.error('❌ Erreur SMS:', error);
    throw error;
  }
}
