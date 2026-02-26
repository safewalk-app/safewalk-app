import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as tripService from './trip-service';
import * as apiClient from './api-client';
import { notificationService } from './notification.service';

// Mock dependencies
vi.mock('./api-client');
vi.mock('./notification.service');

describe('TripService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startTrip', () => {
    it('should start a trip successfully', async () => {
      const mockResponse = {
        id: '123',
        userId: 'user-1',
        startTime: new Date(),
        status: 'active',
        deadline: new Date(Date.now() + 3600000),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await tripService.startTrip({
        userId: 'user-1',
        duration: 60,
        contactId: 'contact-1',
      });

      expect(result).toEqual(mockResponse);
      expect(apiClient.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: '/start-trip',
        })
      );
    });

    it('should handle insufficient credits error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'INSUFFICIENT_CREDITS',
        message: 'Not enough credits',
      });

      await expect(
        tripService.startTrip({
          userId: 'user-1',
          duration: 60,
          contactId: 'contact-1',
        })
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'insufficient_credits',
        expect.any(Object)
      );
    });

    it('should handle invalid phone number error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'INVALID_PHONE',
        message: 'Phone number not configured',
      });

      await expect(
        tripService.startTrip({
          userId: 'user-1',
          duration: 60,
          contactId: 'contact-1',
        })
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'phone_not_configured',
        expect.any(Object)
      );
    });

    it('should handle rate limit error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'RATE_LIMIT',
        message: 'Too many requests',
        retryAfter: 60,
      });

      await expect(
        tripService.startTrip({
          userId: 'user-1',
          duration: 60,
          contactId: 'contact-1',
        })
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'rate_limit_exceeded',
        expect.objectContaining({
          retryAfter: 60,
        })
      );
    });
  });

  describe('checkin', () => {
    it('should check in successfully', async () => {
      const mockResponse = {
        id: '123',
        status: 'checked_in',
        checkinTime: new Date(),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await tripService.checkin('trip-123', {
        latitude: 48.8566,
        longitude: 2.3522,
      });

      expect(result).toEqual(mockResponse);
      expect(apiClient.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: '/checkin',
        })
      );
    });

    it('should handle invalid trip error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'INVALID_TRIP',
        message: 'Trip not found',
      });

      await expect(
        tripService.checkin('invalid-trip', {
          latitude: 48.8566,
          longitude: 2.3522,
        })
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'checkin_failed',
        expect.any(Object)
      );
    });

    it('should handle location permission error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'LOCATION_DENIED',
        message: 'Location permission denied',
      });

      await expect(
        tripService.checkin('trip-123', {
          latitude: 48.8566,
          longitude: 2.3522,
        })
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'location_permission_denied',
        expect.any(Object)
      );
    });
  });

  describe('extendTrip', () => {
    it('should extend trip successfully', async () => {
      const mockResponse = {
        id: '123',
        status: 'extended',
        newDeadline: new Date(Date.now() + 7200000),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await tripService.extendTrip('trip-123', 60);

      expect(result).toEqual(mockResponse);
      expect(apiClient.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: '/extend-trip',
        })
      );
    });

    it('should handle insufficient credits on extend', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'INSUFFICIENT_CREDITS',
        message: 'Not enough credits to extend',
      });

      await expect(tripService.extendTrip('trip-123', 60)).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'insufficient_credits',
        expect.any(Object)
      );
    });

    it('should handle max duration exceeded error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'MAX_DURATION_EXCEEDED',
        message: 'Cannot extend beyond max duration',
      });

      await expect(tripService.extendTrip('trip-123', 600)).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'max_duration_exceeded',
        expect.any(Object)
      );
    });
  });

  describe('cancelTrip', () => {
    it('should cancel trip successfully', async () => {
      const mockResponse = {
        id: '123',
        status: 'cancelled',
        cancelTime: new Date(),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await tripService.cancelTrip('trip-123');

      expect(result).toEqual(mockResponse);
      expect(apiClient.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: '/cancel-trip',
        })
      );
    });

    it('should handle invalid trip on cancel', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'INVALID_TRIP',
        message: 'Trip not found',
      });

      await expect(tripService.cancelTrip('invalid-trip')).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'cancel_failed',
        expect.any(Object)
      );
    });
  });

  describe('getActiveTrip', () => {
    it('should get active trip', async () => {
      const mockResponse = {
        id: '123',
        userId: 'user-1',
        status: 'active',
        startTime: new Date(),
        deadline: new Date(Date.now() + 3600000),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await tripService.getActiveTrip('user-1');

      expect(result).toEqual(mockResponse);
      expect(apiClient.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          endpoint: '/active-trip',
        })
      );
    });

    it('should return null if no active trip', async () => {
      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(null);

      const result = await tripService.getActiveTrip('user-1');

      expect(result).toBeNull();
    });

    it('should handle network error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(tripService.getActiveTrip('user-1')).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith(
        'network_error',
        expect.any(Object)
      );
    });
  });
});
