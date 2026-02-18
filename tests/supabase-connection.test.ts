import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Supabase Connection', () => {
  let supabase: any;

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(supabaseUrl).toBeDefined();
    expect(supabaseServiceRoleKey).toBeDefined();

    supabase = createClient(
      supabaseUrl || '',
      supabaseServiceRoleKey || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  });

  it('should have SUPABASE_URL configured', () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_URL).toMatch(/^https:\/\//);
  });

  it('should have SUPABASE_SERVICE_ROLE_KEY configured', () => {
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY?.length).toBeGreaterThan(20);
  });

  it('should be able to query users table', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    // We just want to verify the connection works
    // It's OK if there are no users yet
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should be able to query emergency_contacts table', async () => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should be able to query sessions table', async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should be able to query sms_logs table', async () => {
    const { data, error } = await supabase
      .from('sms_logs')
      .select('id')
      .limit(1);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
