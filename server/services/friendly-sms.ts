import twilio from 'twilio';

// Initialiser le client Twilio avec les credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface AlertSMSParams {
  phoneNumber: string;
  userName: string; // Prénom de l'utilisateur (ex: "Ben")
  limitTimeStr: string; // Heure limite (ex: "02:30")
  note?: string; // Note optionnelle (ex: "Soirée chez Karim")
  location?: { latitude: number; longitude: number };
}

/**
 * Envoyer un SMS d'alerte friendly avec personnalisation
 * Format: SafeWalk 🫶\n{userName} n'a pas encore confirmé qu'il est bien rentré (limite {limitTime} + 15 min).\n"{note}"\n📍 {location}\nTu peux lui passer un petit appel ?
 */
export async function sendFriendlyAlertSMS(params: AlertSMSParams): Promise<string> {
  if (!client || !twilioPhoneNumber) {
    console.log('📱 [MOCK SMS] Alerte SMS non envoyée (Twilio non configuré)');
    console.log(`   À: ${params.phoneNumber}`);
    console.log(`   Utilisateur: ${params.userName}`);
    console.log(`   Limite: ${params.limitTimeStr}`);
    return 'mock-sms-id';
  }

  try {
    // Construire le message friendly
    let message = `SafeWalk 🫶\n`;
    message += `${params.userName} n'a pas encore confirmé qu'il est bien rentré (limite ${params.limitTimeStr} + 15 min).\n`;
    
    if (params.note) {
      message += `"${params.note}"\n`;
    }
    
    if (params.location) {
      message += `📍 https://maps.google.com/?q=${params.location.latitude},${params.location.longitude}\n`;
    } else {
      message += `📍 Position indisponible\n`;
    }
    
    message += `Tu peux lui passer un petit appel ?`;

    console.log(`📤 Envoi SMS friendly à ${params.phoneNumber}:`);
    console.log(message);

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: params.phoneNumber,
    });

    console.log(`✅ SMS envoyé avec succès à ${params.phoneNumber} (SID: ${result.sid})`);
    return result.sid;
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi du SMS à ${params.phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Envoyer des SMS d'alerte friendly à plusieurs contacts
 */
export async function sendFriendlyAlertSMSToMultiple(
  contacts: Array<{ name: string; phone: string }>,
  userName: string,
  limitTimeStr: string,
  note?: string,
  location?: { latitude: number; longitude: number }
): Promise<Array<{ phone: string; messageSid: string; status: string }>> {
  const results: Array<{ phone: string; messageSid: string; status: string }> = [];

  for (const contact of contacts) {
    try {
      const messageSid = await sendFriendlyAlertSMS({
        phoneNumber: contact.phone,
        userName,
        limitTimeStr,
        note,
        location,
      });

      results.push({
        phone: contact.phone,
        messageSid,
        status: 'sent',
      });
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi à ${contact.phone}:`, error);
      results.push({
        phone: contact.phone,
        messageSid: '',
        status: 'failed',
      });
    }
  }

  return results;
}

export default {
  sendFriendlyAlertSMS,
  sendFriendlyAlertSMSToMultiple,
};
