import { describe, it, expect } from 'vitest';

describe('Supabase Credentials Validation', () => {
  it('should have valid Supabase URL', () => {
    const url = process.env.SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it('should have valid Supabase anon key', () => {
    // Note: SUPABASE_ANON_KEY is optional for backend
    // Only SUPABASE_SERVICE_ROLE_KEY is required
    const key = process.env.SUPABASE_ANON_KEY;
    if (key) {
      expect(key).toMatch(/^sb_publishable_/);
      expect(key.length).toBeGreaterThan(20);
    }
  });

  it('should have valid Supabase service role key', () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(key).toBeDefined();
    if (key) {
      expect(key).toMatch(/^sb_secret_/);
      expect(key.length).toBeGreaterThan(20);
    }
  });

  it('should be able to connect to Supabase', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    
    // Use service role key for backend connection
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Test basic connection by querying users table
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    // Connection should work
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
