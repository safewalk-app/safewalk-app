const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;
const toNumber = '+33763458273';

console.log('🔍 Configuration Twilio:');
console.log('- Account SID:', accountSid ? '✅' : '❌');
console.log('- Auth Token:', authToken ? '✅' : '❌');
console.log('- From Number:', fromNumber);
console.log('- To Number:', toNumber);

if (!accountSid || !authToken) {
  console.error('❌ Credentials manquants!');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testSMS() {
  try {
    console.log('\n📤 Envoi d\'un SMS de test...');
    const message = await client.messages.create({
      body: '🚨 TEST SafeWalk - Ceci est un message de test',
      from: fromNumber,
      to: toNumber,
    });
    console.log('✅ SMS envoyé avec succès!');
    console.log('- SID:', message.sid);
    console.log('- Status:', message.status);
    console.log('- To:', message.to);
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi:', error.message);
    process.exit(1);
  }
}

testSMS();
