import twilio from 'twilio';

// Initialiser le client Twilio avec les credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Types séparés pour chaque type de SMS (cohérence backend/frontend)
export interface AlertSMSParams {
  phoneNumber: string;
  userName: string;
  limitTimeStr: string;
  note?: string;
  location?: { latitude: number; longitude: number };
}

export interface FollowUpSMSParams {
  phoneNumber: string;
  userName: string;
  location?: { latitude: number; longitude: number };
}

export interface ConfirmationSMSParams {
  phoneNumber: string;
  userName: string;
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
  } catch (error: any) {
    console.error(`❌ Erreur lors de l'envoi du SMS à ${params.phoneNumber}:`);
    console.error('   Code:', error?.code);
    console.error('   Message:', error?.message);
    console.error('   Status:', error?.status);
    console.error('   Details:', error?.details || error);
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
  location?: { latitude: number; longitude: number },
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
    } catch (error: any) {
      console.error(`❌ Erreur lors de l'envoi à ${contact.phone}:`);
      console.error('   Code:', error?.code);
      console.error('   Message:', error?.message);
      console.error('   Status:', error?.status);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      results.push({
        phone: contact.phone,
        messageSid: '',
        status: 'failed',
      });
    }
  }

  return results;
}

/**
 * Envoyer un SMS de relance friendly
 * Format: SafeWalk 🫶\nToujours pas de confirmation de {userName}.\nSi tu peux, réessaye de l'appeler 🙏\n📍 {location}
 */
export async function sendFollowUpAlertSMS(params: FollowUpSMSParams): Promise<string> {
  if (!client || !twilioPhoneNumber) {
    console.log('📱 [MOCK SMS] Relance SMS non envoyée (Twilio non configuré)');
    console.log(`   À: ${params.phoneNumber}`);
    console.log(`   Utilisateur: ${params.userName}`);
    return 'mock-sms-id';
  }

  try {
    let message = `SafeWalk 🫶\n`;
    message += `Toujours pas de confirmation de ${params.userName}.\n`;
    message += `Si tu peux, réessaye de l'appeler 🙏\n`;

    if (params.location) {
      message += `📍 https://maps.google.com/?q=${params.location.latitude},${params.location.longitude}`;
    } else {
      message += `📍 Position indisponible`;
    }

    console.log(`📤 Envoi SMS de relance à ${params.phoneNumber}:`);
    console.log(message);

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: params.phoneNumber,
    });

    console.log(
      `✅ SMS de relance envoyé avec succès à ${params.phoneNumber} (SID: ${result.sid})`,
    );
    return result.sid;
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi du SMS de relance à ${params.phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Envoyer un SMS de confirmation friendly
 * Format: SafeWalk ✅\n{userName} vient de confirmer que tout va bien 🙂\nDésolé pour l'inquiétude !
 */
export async function sendConfirmationSMS(params: ConfirmationSMSParams): Promise<string> {
  if (!client || !twilioPhoneNumber) {
    console.log('📱 [MOCK SMS] SMS de confirmation non envoyé (Twilio non configuré)');
    console.log(`   À: ${params.phoneNumber}`);
    console.log(`   Utilisateur: ${params.userName}`);
    return 'mock-sms-id';
  }

  try {
    const message = `SafeWalk ✅\n${params.userName} vient de confirmer que tout va bien 🙂\nDésolé pour l'inquiétude !`;

    console.log(`📤 Envoi SMS de confirmation à ${params.phoneNumber}:`);
    console.log(message);

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: params.phoneNumber,
    });

    console.log(
      `✅ SMS de confirmation envoyé avec succès à ${params.phoneNumber} (SID: ${result.sid})`,
    );
    return result.sid;
  } catch (error) {
    console.error(
      `❌ Erreur lors de l'envoi du SMS de confirmation à ${params.phoneNumber}:`,
      error,
    );
    throw error;
  }
}

/**
 * Envoyer des SMS de relance à plusieurs contacts
 */
export async function sendFollowUpAlertSMSToMultiple(
  contacts: Array<{ name: string; phone: string }>,
  userName: string,
  location?: { latitude: number; longitude: number },
): Promise<Array<{ phone: string; messageSid: string; status: string }>> {
  const results: Array<{ phone: string; messageSid: string; status: string }> = [];

  for (const contact of contacts) {
    try {
      const messageSid = await sendFollowUpAlertSMS({
        phoneNumber: contact.phone,
        userName,
        location,
      });

      results.push({
        phone: contact.phone,
        messageSid,
        status: 'sent',
      });
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de relance à ${contact.phone}:`, error);
      results.push({
        phone: contact.phone,
        messageSid: '',
        status: 'failed',
      });
    }
  }

  return results;
}

/**
 * Envoyer des SMS de confirmation à plusieurs contacts
 */
export async function sendConfirmationSMSToMultiple(
  contacts: Array<{ name: string; phone: string }>,
  userName: string,
): Promise<Array<{ phone: string; messageSid: string; status: string }>> {
  const results: Array<{ phone: string; messageSid: string; status: string }> = [];

  for (const contact of contacts) {
    try {
      const messageSid = await sendConfirmationSMS({
        phoneNumber: contact.phone,
        userName,
      });

      results.push({
        phone: contact.phone,
        messageSid,
        status: 'sent',
      });
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de confirmation à ${contact.phone}:`, error);
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
  sendFollowUpAlertSMS,
  sendFollowUpAlertSMSToMultiple,
  sendConfirmationSMS,
  sendConfirmationSMSToMultiple,
};
