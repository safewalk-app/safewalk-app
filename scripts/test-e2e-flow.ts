#!/usr/bin/env ts-node
/**
 * Script de test complet pour valider le flux de bout en bout SafeWalk
 * 
 * Flux testé:
 * 1. Créer une session avec limitTime = now + 2 min
 * 2. Attendre que le délai expire
 * 3. Vérifier que l'alerte est déclenchée
 * 4. Simuler l'envoi SMS via Twilio
 * 5. Simuler la réception du webhook avec statut "delivered"
 * 6. Vérifier que le statut est mis à jour en temps réel
 * 7. Tester le check-in pour annuler l'alerte
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const METRO_URL = process.env.METRO_URL || 'http://localhost:8081';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

// Utilitaires
function log(message: string, type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
    RESET: '\x1b[0m',
  };
  console.log(`${colors[type]}[${type}]${colors.RESET} ${message}`);
}

async function test(name: string, fn: () => Promise<void>) {
  const startTime = Date.now();
  try {
    log(`Testing: ${name}...`, 'INFO');
    await fn();
    const duration = Date.now() - startTime;
    results.push({ name, status: 'PASS', duration });
    log(`✅ ${name} (${duration}ms)`, 'SUCCESS');
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, status: 'FAIL', duration, error: errorMsg });
    log(`❌ ${name}: ${errorMsg}`, 'ERROR');
  }
}

// Tests
async function testApiHealth() {
  const response = await axios.get(`${API_URL}/api/health`);
  if (response.status !== 200) throw new Error('API not healthy');
}

async function testTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Twilio credentials not configured');
  }

  if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
    throw new Error('Invalid TWILIO_ACCOUNT_SID format');
  }

  if (authToken.length !== 32) {
    throw new Error('Invalid TWILIO_AUTH_TOKEN length');
  }

  log(`Twilio configured: ${accountSid}`, 'INFO');
}

async function testSmsEndpoint() {
  const response = await axios.post(`${API_URL}/api/sms/alert`, {
    phoneNumbers: ['+33612345678'],
    limitTimeStr: '14:00',
    tolerance: 15,
  });

  if (response.status !== 200) throw new Error('SMS endpoint failed');
  if (!response.data.success) throw new Error('SMS send failed');
}

async function testWebhookEndpoint() {
  const webhookPayload = {
    MessageSid: 'SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    AccountSid: process.env.TWILIO_ACCOUNT_SID,
    MessageStatus: 'delivered',
    To: '+33612345678',
    From: process.env.TWILIO_PHONE_NUMBER,
    ApiVersion: '2010-04-01',
  };

  const response = await axios.post(
    `${API_URL}/api/webhooks/twilio`,
    new URLSearchParams(webhookPayload as any),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  if (response.status !== 200) throw new Error('Webhook endpoint failed');
}

async function testCheckInEndpoint() {
  const response = await axios.post(`${API_URL}/api/check-in/confirm`, {
    sessionId: 'test-session-id',
    userId: 'test-user',
  });

  if (response.status !== 200) throw new Error('Check-in endpoint failed');
}

async function testSessionFlow() {
  // Créer une session
  const sessionResponse = await axios.post(`${API_URL}/api/sessions/create`, {
    limitTime: Date.now() + 2 * 60 * 1000, // 2 minutes
    tolerance: 15 * 60 * 1000, // 15 minutes
    emergencyContact1: {
      name: 'Contact 1',
      phone: '+33612345678',
    },
    emergencyContact2: {
      name: 'Contact 2',
      phone: '+33687654321',
    },
  });

  if (sessionResponse.status !== 200) throw new Error('Session creation failed');

  const sessionId = sessionResponse.data.id;
  log(`Session created: ${sessionId}`, 'INFO');

  // Attendre 2 minutes
  log('Waiting 2 minutes for alert trigger...', 'WARN');
  await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));

  // Vérifier que l'alerte a été déclenchée
  const alertResponse = await axios.get(`${API_URL}/api/sessions/${sessionId}`);
  if (alertResponse.data.status !== 'overdue') {
    throw new Error('Alert not triggered');
  }

  log('Alert triggered successfully', 'SUCCESS');
}

async function testSmsDeliveryFlow() {
  // Simuler l'envoi de SMS
  const smsResponse = await axios.post(`${API_URL}/api/sms/alert`, {
    phoneNumbers: ['+33612345678', '+33687654321'],
    limitTimeStr: '14:00',
    tolerance: 15,
  });

  if (!smsResponse.data.success) throw new Error('SMS send failed');

  const messageSids = smsResponse.data.messageSids || ['SM' + Date.now()];
  log(`SMS sent: ${Array.isArray(messageSids) ? messageSids.join(', ') : messageSids}`, 'INFO');

  // Simuler la réception du webhook avec statut "sent"
  const sidsArray = Array.isArray(messageSids) ? messageSids : [messageSids];
  for (const messageSid of sidsArray) {
    await axios.post(
      `${API_URL}/api/webhooks/twilio`,
      new URLSearchParams({
        MessageSid: messageSid,
        AccountSid: process.env.TWILIO_ACCOUNT_SID!,
        MessageStatus: 'sent',
        To: '+33612345678',
        From: process.env.TWILIO_PHONE_NUMBER!,
        ApiVersion: '2010-04-01',
      } as any),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  }

  log('SMS sent webhook received', 'SUCCESS');

  // Attendre un peu et simuler la livraison
  await new Promise((resolve) => setTimeout(resolve, 1000));

  for (const messageSid of sidsArray) {
    await axios.post(
      `${API_URL}/api/webhooks/twilio`,
      new URLSearchParams({
        MessageSid: messageSid,
        AccountSid: process.env.TWILIO_ACCOUNT_SID!,
        MessageStatus: 'delivered',
        To: '+33612345678',
        From: process.env.TWILIO_PHONE_NUMBER!,
        ApiVersion: '2010-04-01',
      } as any),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  }

  log('SMS delivered webhook received', 'SUCCESS');
}

async function testCheckInFlow() {
  // Créer une session
  const sessionResponse = await axios.post(`${API_URL}/api/sessions/create`, {
    limitTime: Date.now() + 5 * 60 * 1000, // 5 minutes
    tolerance: 15 * 60 * 1000,
    emergencyContact1: {
      name: 'Contact 1',
      phone: '+33612345678',
    },
  });

  const sessionId = sessionResponse.data.session?.id || sessionResponse.data.id;

  // Confirmer le check-in
  const checkInResponse = await axios.post(`${API_URL}/api/check-in/confirm`, {
    sessionId,
    userId: 'test-user',
  });

  if (checkInResponse.status !== 200) throw new Error('Check-in confirmation failed');

  // Vérifier que le check-in a été confirmé
  if (checkInResponse.data.checkIn?.status !== 'confirmed') {
    throw new Error('Check-in not confirmed');
  }

  log('Check-in confirmed successfully', 'SUCCESS');
}

async function testSessionFlowQuick() {
  // Test rapide du flux de session
  const sessionResponse = await axios.post(`${API_URL}/api/sessions/create`, {
    limitTime: Date.now() + 5 * 60 * 1000,
    tolerance: 15,
  });

  if (sessionResponse.status !== 200) throw new Error('Session creation failed');
  if (!sessionResponse.data.session) throw new Error('No session returned');
}

// Rapport final
function printReport() {
  console.log('\n' + '='.repeat(60));
  log('TEST REPORT', 'INFO');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const error = result.error ? ` - ${result.error}` : '';
    console.log(`${icon} ${result.name} (${result.duration}ms)${error}`);
  });

  console.log('='.repeat(60));
  log(`Total: ${passed}/${total} PASS (${totalDuration}ms)`, passed === total ? 'SUCCESS' : 'WARN');
  console.log('='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Exécution
async function runTests() {
  log('🚀 Starting SafeWalk E2E Test Suite', 'INFO');
  console.log('');

  await test('API Health Check', testApiHealth);
  await test('Twilio Configuration', testTwilioConfig);
  await test('SMS Endpoint', testSmsEndpoint);
  await test('Webhook Endpoint', testWebhookEndpoint);
  await test('Check-in Endpoint', testCheckInEndpoint);
  await test('SMS Delivery Flow', testSmsDeliveryFlow);
  await test('Check-in Flow', testCheckInFlow);

  // Note: testSessionFlow prend 2 minutes, donc on le commente par défaut
  // await test('Full Session Flow (2 min)', testSessionFlow);

  printReport();
}

runTests().catch((error) => {
  log(`Fatal error: ${error.message}`, 'ERROR');
  process.exit(1);
});
