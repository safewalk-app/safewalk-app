// En développement: localhost:3000
// En production: URL du serveur déployé
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface FriendlyAlertParams {
  contacts: Array<{ name: string; phone: string }>;
  userName: string;
  limitTimeStr: string;
  note?: string;
  location?: { latitude: number; longitude: number };
}

export async function sendFriendlyAlertSMS(params: FriendlyAlertParams): Promise<void> {
  try {
    console.log('📤 Appel API SMS friendly avec:', params);
    const url = `${API_BASE_URL}/api/friendly-sms/alert`;
    console.log('🔗 URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    console.log('📊 Réponse API:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Réponse API:', errorBody);
      throw new Error(`SMS API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ SMS friendly envoyés avec succès:', data);
  } catch (error) {
    console.error('❌ Erreur SMS friendly:', error);
    throw error;
  }
}
