import twilio from 'twilio';

// Initialiser le client Twilio avec les credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('🔑 [Twilio] Chargement des credentials...');
console.log(
  '   TWILIO_ACCOUNT_SID:',
  accountSid ? `${accountSid.substring(0, 10)}...` : 'NON DÉFINI',
);
console.log('   TWILIO_AUTH_TOKEN:', authToken ? `${authToken.substring(0, 8)}...` : 'NON DÉFINI');
console.log('   TWILIO_PHONE_NUMBER:', twilioPhoneNumber || 'NON DÉFINI');

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.warn('⚠️ Twilio credentials not configured. SMS will not be sent.');
} else {
  console.log('✅ [Twilio] Client initialisé avec succès');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Envoyer un SMS d'alerte
 */
export async function sendAlertSMS(
  phoneNumber: string,
  limitTimeStr: string,
  tolerance: number,
  location?: { latitude: number; longitude: number },
): Promise<void> {
  if (!client || !twilioPhoneNumber) {
    console.log('📱 [MOCK SMS] Alerte SMS non envoyé (Twilio non configuré)');
    console.log(`   À: ${phoneNumber}`);
    console.log(`   Message: ALERTE SafeWalk - Retour non confirmé à ${limitTimeStr}`);
    return;
  }

  try {
    const positionText = location
      ? `Position: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
      : 'Position: non disponible';

    const message = `ALERTE SafeWalk: retour non confirmé à ${limitTimeStr} (+${tolerance} min tolérance). ${positionText}`;

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    console.log(`✅ SMS ALERTE envoyé avec succès`);
    console.log(`   À: ${phoneNumber}`);
    console.log(`   De: ${twilioPhoneNumber}`);
    console.log(`   SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   ErrorCode: ${result.errorCode || 'none'}`);
    console.log(`   ErrorMessage: ${result.errorMessage || 'none'}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi du SMS à ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Envoyer un SMS de rappel check-in
 */
export async function sendCheckInReminderSMS(phoneNumber: string): Promise<void> {
  if (!client || !twilioPhoneNumber) {
    console.log('📱 [MOCK SMS] Rappel check-in non envoyé (Twilio non configuré)');
    console.log(`   À: ${phoneNumber}`);
    return;
  }

  try {
    const message = `Rappel SafeWalk: tout va bien ? Confirmez votre retour. Si pas de réponse dans 10 min, une alerte sera envoyée à vos contacts.`;

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    console.log(`✅ SMS RAPPEL envoyé avec succès`);
    console.log(`   À: ${phoneNumber}`);
    console.log(`   SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi du SMS de rappel à ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Envoyer un SMS de confirmation check-in
 */
export async function sendCheckInConfirmationSMS(phoneNumber: string): Promise<void> {
  if (!client || !twilioPhoneNumber) {
    console.log('📱 [MOCK SMS] Confirmation check-in non envoyée (Twilio non configuré)');
    console.log(`   À: ${phoneNumber}`);
    return;
  }

  try {
    const message = `Confirmation SafeWalk: tout va bien ! Alerte annulée. Bon retour !`;

    const result = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phoneNumber,
    });

    console.log(`✅ SMS CONFIRMATION envoyé avec succès`);
    console.log(`   À: ${phoneNumber}`);
    console.log(`   SID: ${result.sid}`);
    console.log(`   Status: ${result.status}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi du SMS de confirmation à ${phoneNumber}:`, error);
    throw error;
  }
}

/**
 * Envoyer un SMS à plusieurs contacts
 */
export async function sendAlertSMSToMultiple(
  phoneNumbers: string[],
  limitTimeStr: string,
  tolerance: number,
  location?: { latitude: number; longitude: number },
): Promise<void> {
  console.log('🔍 sendAlertSMSToMultiple called with:', { phoneNumbers, limitTimeStr, tolerance });
  const validPhoneNumbers = phoneNumbers.filter((phone) => phone && phone.trim().length > 0);

  if (validPhoneNumbers.length === 0) {
    console.warn('⚠️ Aucun numéro de contact valide');
    return;
  }

  console.log(
    `📤 Envoi d'alertes SMS à ${validPhoneNumbers.length} contact(s): ${validPhoneNumbers.join(', ')}`,
  );

  const results = await Promise.allSettled(
    validPhoneNumbers.map((phone) => {
      console.log(`  → Sending to ${phone}...`);
      return sendAlertSMS(phone, limitTimeStr, tolerance, location);
    }),
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`📊 Results: ${successful} succeeded, ${failed} failed`);

  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      console.error(`  ❌ ${validPhoneNumbers[idx]}: ${r.reason}`);
    }
  });
}

export default {
  sendAlertSMS,
  sendCheckInReminderSMS,
  sendCheckInConfirmationSMS,
  sendAlertSMSToMultiple,
};
