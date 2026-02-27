import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { buildLateSms, buildSosSms, buildTestSms } from './sms-templates.ts';

Deno.test('buildLateSms - with all parameters', () => {
  const result = buildLateSms({
    firstName: 'Jean',
    deadline: '2026-02-25T20:00:00Z',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  assertStringIncludes(result, 'Jean');
  assertStringIncludes(result, '+33612345678');
  assertStringIncludes(result, 'maps.google.com');
  assertStringIncludes(result, '48.8566');
  assertStringIncludes(result, '2.3522');
});

Deno.test('buildLateSms - without location', () => {
  const result = buildLateSms({
    firstName: 'Marie',
    deadline: '2026-02-25T20:00:00Z',
    lat: undefined,
    lng: undefined,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  assertStringIncludes(result, 'Marie');
  assertStringIncludes(result, '+33612345678');
  assertEquals(result.includes('maps.google.com'), false);
});

Deno.test('buildLateSms - without user phone', () => {
  const result = buildLateSms({
    firstName: 'Pierre',
    deadline: '2026-02-25T20:00:00Z',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: undefined,
    shareUserPhoneInAlerts: false,
  });

  assertStringIncludes(result, 'Pierre');
  assertEquals(result.includes('+33'), false);
  assertStringIncludes(result, 'maps.google.com');
});

Deno.test('buildLateSms - without first name', () => {
  const result = buildLateSms({
    firstName: undefined,
    deadline: '2026-02-25T20:00:00Z',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  assertStringIncludes(result, 'Utilisateur');
  assertStringIncludes(result, '+33612345678');
});

Deno.test('buildLateSms - no double spaces', () => {
  const result = buildLateSms({
    firstName: undefined,
    deadline: '2026-02-25T20:00:00Z',
    lat: undefined,
    lng: undefined,
    userPhone: undefined,
    shareUserPhoneInAlerts: false,
  });

  assertEquals(result.includes('  '), false);
});

Deno.test('buildSosSms - with all parameters', () => {
  const result = buildSosSms({
    firstName: 'Sophie',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  assertStringIncludes(result, 'Sophie');
  assertStringIncludes(result, 'SOS');
  assertStringIncludes(result, '+33612345678');
  assertStringIncludes(result, 'maps.google.com');
});

Deno.test('buildSosSms - without location', () => {
  const result = buildSosSms({
    firstName: 'Thomas',
    lat: undefined,
    lng: undefined,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  assertStringIncludes(result, 'Thomas');
  assertStringIncludes(result, 'SOS');
  assertStringIncludes(result, '+33612345678');
  assertEquals(result.includes('maps.google.com'), false);
});

Deno.test('buildSosSms - without user phone', () => {
  const result = buildSosSms({
    firstName: 'Claire',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: undefined,
    shareUserPhoneInAlerts: false,
  });

  assertStringIncludes(result, 'Claire');
  assertStringIncludes(result, 'SOS');
  assertEquals(result.includes('+33'), false);
  assertStringIncludes(result, 'maps.google.com');
});

Deno.test('buildSosSms - without first name', () => {
  const result = buildSosSms({
    firstName: undefined,
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  assertStringIncludes(result, 'Utilisateur');
  assertStringIncludes(result, 'SOS');
});

Deno.test('buildSosSms - no double spaces', () => {
  const result = buildSosSms({
    firstName: undefined,
    lat: undefined,
    lng: undefined,
    userPhone: undefined,
    shareUserPhoneInAlerts: false,
  });

  assertEquals(result.includes('  '), false);
});

Deno.test('buildTestSms - with first name', () => {
  const result = buildTestSms({
    firstName: 'Luc',
  });

  assertStringIncludes(result, 'Luc');
  assertStringIncludes(result, 'test');
});

Deno.test('buildTestSms - without first name', () => {
  const result = buildTestSms({
    firstName: undefined,
  });

  assertStringIncludes(result, 'Utilisateur');
  assertStringIncludes(result, 'test');
});

Deno.test('buildTestSms - no double spaces', () => {
  const result = buildTestSms({
    firstName: undefined,
  });

  assertEquals(result.includes('  '), false);
});

Deno.test('buildLateSms - valid phone format E.164', () => {
  const result = buildLateSms({
    firstName: 'Alice',
    deadline: '2026-02-25T20:00:00Z',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  // Verify E.164 format is preserved
  assertStringIncludes(result, '+33612345678');
});

Deno.test('buildLateSms - Google Maps URL format', () => {
  const result = buildLateSms({
    firstName: 'Bob',
    deadline: '2026-02-25T20:00:00Z',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  // Verify Google Maps URL format
  assertStringIncludes(result, 'https://maps.google.com/maps?q=48.8566,2.3522');
});

Deno.test('buildSosSms - Google Maps URL format', () => {
  const result = buildSosSms({
    firstName: 'Eve',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  // Verify Google Maps URL format
  assertStringIncludes(result, 'https://maps.google.com/maps?q=48.8566,2.3522');
});

Deno.test('buildLateSms - message length reasonable', () => {
  const result = buildLateSms({
    firstName: 'Frank',
    deadline: '2026-02-25T20:00:00Z',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  // SMS should be between 50 and 500 characters
  assertEquals(result.length > 50 && result.length < 500, true);
});

Deno.test('buildSosSms - message length reasonable', () => {
  const result = buildSosSms({
    firstName: 'Grace',
    lat: 48.8566,
    lng: 2.3522,
    userPhone: '+33612345678',
    shareUserPhoneInAlerts: true,
  });

  // SMS should be between 50 and 500 characters
  assertEquals(result.length > 50 && result.length < 500, true);
});

Deno.test('buildTestSms - message length reasonable', () => {
  const result = buildTestSms({
    firstName: 'Henry',
  });

  // SMS should be between 20 and 200 characters
  assertEquals(result.length > 20 && result.length < 200, true);
});
