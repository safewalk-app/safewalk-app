export async function sendAlertSMSToMultiple(
  phoneNumbers: string[],
  limitTimeStr: string,
  tolerance: number,
  location?: { latitude: number; longitude: number }
): Promise<void> {
  try {
    const response = await fetch('/api/sms/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers, limitTimeStr, tolerance, location }),
    });
    if (!response.ok) throw new Error(`SMS API error: ${response.statusText}`);
    console.log('✅ SMS envoyés avec succès');
  } catch (error) {
    console.error('❌ Erreur SMS:', error);
    throw error;
  }
}
