import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import * as auth from './auth';

vi.mock('expo-secure-store');

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('saveSessionToken', () => {
    it('should save session token securely', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      vi.mocked(SecureStore.setItemAsync).mockResolvedValueOnce(undefined);

      await auth.saveSessionToken(token);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('SESSION_TOKEN_KEY', token);
    });

    it('should handle save error', async () => {
      const token = 'token123';

      vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('SecureStore error'));

      await expect(auth.saveSessionToken(token)).rejects.toThrow();
    });
  });

  describe('getSessionToken', () => {
    it('should retrieve session token', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

      vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(token);

      const result = await auth.getSessionToken();

      expect(result).toBe(token);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('SESSION_TOKEN_KEY');
    });

    it('should return null if no token', async () => {
      vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(null);

      const result = await auth.getSessionToken();

      expect(result).toBeNull();
    });

    it('should handle retrieval error', async () => {
      vi.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('SecureStore error'));

      await expect(auth.getSessionToken()).rejects.toThrow();
    });
  });

  describe('deleteSessionToken', () => {
    it('should delete session token', async () => {
      vi.mocked(SecureStore.deleteItemAsync).mockResolvedValueOnce(undefined);

      await auth.deleteSessionToken();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('SESSION_TOKEN_KEY');
    });

    it('should handle delete error', async () => {
      vi.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('SecureStore error'));

      await expect(auth.deleteSessionToken()).rejects.toThrow();
    });
  });

  describe('isTokenValid', () => {
    it('should validate non-expired token', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const token = {
        exp: Math.floor(futureDate.getTime() / 1000),
      };

      const result = auth.isTokenValid(token);

      expect(result).toBe(true);
    });

    it('should invalidate expired token', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const token = {
        exp: Math.floor(pastDate.getTime() / 1000),
      };

      const result = auth.isTokenValid(token);

      expect(result).toBe(false);
    });

    it('should handle missing expiry', () => {
      const token = {};

      const result = auth.isTokenValid(token);

      expect(result).toBe(false);
    });
  });
});
