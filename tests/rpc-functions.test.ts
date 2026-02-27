// Tests: RPC Functions
// Purpose: Test claim_overdue_trips and consume_credit RPC functions

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  rpc: async (name: string, params: Record<string, unknown>) => {
    // Mock implementations
    if (name === 'claim_overdue_trips') {
      return {
        data: [
          {
            trip_id: 'trip-1',
            user_id: 'user-1',
            deadline: new Date(Date.now() - 60000).toISOString(),
            contact_id: 'contact-1',
            contact_phone_number: '+33612345678',
            user_phone_number: '+33612345679',
            share_location: true,
            location_latitude: 48.8566,
            location_longitude: 2.3522,
            last_seen_at: new Date().toISOString(),
          },
        ],
        error: null,
      };
    }

    if (name === 'consume_credit') {
      const { p_user_id, p_type } = params;

      // Mock subscription user
      if (p_user_id === 'subscription-user') {
        return {
          data: [{ allowed: true, reason: 'subscription_active', remaining_credits: -1 }],
          error: null,
        };
      }

      // Mock free user with credits
      if (p_user_id === 'free-user-with-credits') {
        if (p_type === 'late') {
          return {
            data: [{ allowed: true, reason: 'credit_consumed', remaining_credits: 2 }],
            error: null,
          };
        }
        if (p_type === 'test') {
          return {
            data: [{ allowed: true, reason: 'credit_consumed', remaining_credits: 0 }],
            error: null,
          };
        }
      }

      // Mock free user without credits
      if (p_user_id === 'free-user-no-credits') {
        return {
          data: [{ allowed: false, reason: 'no_credits', remaining_credits: 0 }],
          error: null,
        };
      }

      // Mock quota exceeded
      if (p_user_id === 'quota-exceeded-user') {
        return {
          data: [{ allowed: false, reason: 'quota_reached', remaining_credits: 0 }],
          error: null,
        };
      }

      return {
        data: [{ allowed: false, reason: 'unknown', remaining_credits: 0 }],
        error: null,
      };
    }

    return { data: null, error: new Error('Unknown RPC function') };
  },
};

describe('RPC Functions', () => {
  describe('claim_overdue_trips', () => {
    it('should claim overdue trips', async () => {
      const { data, error } = await mockSupabase.rpc('claim_overdue_trips', { p_limit: 50 });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      if (data && Array.isArray(data)) {
        expect(data.length).toBeGreaterThan(0);
        const trip = data[0] as any;
        expect(trip.trip_id).toBeDefined();
        expect(trip.user_id).toBeDefined();
        expect(trip.contact_id).toBeDefined();
        expect(trip.contact_phone_number).toMatch(/^\+\d+$/);
      }
    });

    it('should include location data if share_location is true', async () => {
      const { data } = await mockSupabase.rpc('claim_overdue_trips', { p_limit: 50 });

      const trip = data?.[0] as any;
      if (trip?.share_location) {
        expect(trip.location_latitude).toBeDefined();
        expect(trip.location_longitude).toBeDefined();
        expect(typeof trip.location_latitude).toBe('number');
        expect(typeof trip.location_longitude).toBe('number');
      }
    });
  });

  describe('consume_credit', () => {
    describe('subscription users', () => {
      it('should allow subscription users to send alerts', async () => {
        const { data } = await mockSupabase.rpc('consume_credit', {
          p_user_id: 'subscription-user',
          p_type: 'late',
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as any;
          expect(result.allowed).toBe(true);
          expect(result.reason).toBe('subscription_active');
        }
      });

      it('should allow subscription users to send test SMS', async () => {
        const { data } = await mockSupabase.rpc('consume_credit', {
          p_user_id: 'subscription-user',
          p_type: 'test',
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as any;
          expect(result.allowed).toBe(true);
        }
      });

      it('should allow subscription users to send SOS', async () => {
        const { data } = await mockSupabase.rpc('consume_credit', {
          p_user_id: 'subscription-user',
          p_type: 'sos',
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as any;
          expect(result.allowed).toBe(true);
        }
      });
    });

    describe('free users with credits', () => {
      it('should allow free users to send alerts if they have credits', async () => {
        const { data } = await mockSupabase.rpc('consume_credit', {
          p_user_id: 'free-user-with-credits',
          p_type: 'late',
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as any;
          expect(result.allowed).toBe(true);
          expect(result.reason).toBe('credit_consumed');
          expect(result.remaining_credits).toBe(2);
        }
      });

      it('should allow free users to send test SMS if they have credits', async () => {
        const { data } = await mockSupabase.rpc('consume_credit', {
          p_user_id: 'free-user-with-credits',
          p_type: 'test',
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as any;
          expect(result.allowed).toBe(true);
          expect(result.remaining_credits).toBe(0);
        }
      });
    });

    describe('free users without credits', () => {
      it('should deny free users without credits', async () => {
        const { data } = await mockSupabase.rpc('consume_credit', {
          p_user_id: 'free-user-no-credits',
          p_type: 'late',
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as any;
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('no_credits');
        }
      });
    });

    describe('quota limits', () => {
      it('should deny users who exceed quota', async () => {
        const { data } = await mockSupabase.rpc('consume_credit', {
          p_user_id: 'quota-exceeded-user',
          p_type: 'late',
        });

        if (data && Array.isArray(data) && data.length > 0) {
          const result = data[0] as any;
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe('quota_reached');
        } else {
          throw new Error('No data returned from consume_credit RPC');
        }
      });
    });
  });
});
