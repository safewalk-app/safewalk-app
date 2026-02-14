import { describe, it, expect, beforeAll } from "vitest";

/**
 * Test de validation des credentials Twilio
 * Vérifie que les variables d'environnement sont correctement définies
 * et que le format des credentials est valide
 */

describe("Twilio Credentials Validation", () => {
  let accountSid: string | undefined;
  let authToken: string | undefined;
  let phoneNumber: string | undefined;

  beforeAll(() => {
    accountSid = process.env.TWILIO_ACCOUNT_SID;
    authToken = process.env.TWILIO_AUTH_TOKEN;
    phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  });

  it("should have TWILIO_ACCOUNT_SID defined", () => {
    expect(accountSid).toBeDefined();
    expect(accountSid).not.toBe("");
  });

  it("should have TWILIO_AUTH_TOKEN defined", () => {
    expect(authToken).toBeDefined();
    expect(authToken).not.toBe("");
  });

  it("should have TWILIO_PHONE_NUMBER defined", () => {
    expect(phoneNumber).toBeDefined();
    expect(phoneNumber).not.toBe("");
  });

  it("should have valid Account SID format (starts with AC)", () => {
    expect(accountSid).toMatch(/^AC[a-z0-9]{32}$/i);
  });

  it("should have valid Auth Token format (32 hex characters)", () => {
    expect(authToken).toMatch(/^[a-f0-9]{32}$/i);
  });

  it("should have valid phone number format (E.164)", () => {
    expect(phoneNumber).toMatch(/^\+\d{1,15}$/);
  });

  it("should have French phone number", () => {
    expect(phoneNumber).toMatch(/^\+33/);
  });

  it("should have correct phone number length for France", () => {
    // France: +33 + 9 digits = 12 characters total
    expect(phoneNumber?.length).toBe(12);
  });

  it("should have all credentials non-empty", () => {
    expect(accountSid?.trim().length).toBeGreaterThan(0);
    expect(authToken?.trim().length).toBeGreaterThan(0);
    expect(phoneNumber?.trim().length).toBeGreaterThan(0);
  });
});
