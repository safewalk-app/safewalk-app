import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as smsService from './sms-service';
import * as apiClient from './api-client';
import { notificationService } from './notification.service';

vi.mock('./api-client');
vi.mock('./notification.service');

describe('SMSService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmergencySMS', () => {
    it('should send emergency SMS successfully', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-123',
        sentAt: new Date(),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await smsService.sendEmergencySMS('+33612345678', 'Emergency alert');

      expect(result).toEqual(mockResponse);
      expect(apiClient.apiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          endpoint: '/send-emergency-sms',
        }),
      );
    });

    it('should handle invalid phone number', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'INVALID_PHONE',
        message: 'Invalid phone number format',
      });

      await expect(smsService.sendEmergencySMS('invalid', 'Emergency alert')).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith('sms_failed', expect.any(Object));
    });

    it('should handle Twilio error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'TWILIO_ERROR',
        message: 'Twilio service unavailable',
      });

      await expect(
        smsService.sendEmergencySMS('+33612345678', 'Emergency alert'),
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith('sms_failed', expect.any(Object));
    });

    it('should handle rate limit on SMS', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'RATE_LIMIT',
        message: 'Too many SMS requests',
        retryAfter: 300,
      });

      await expect(
        smsService.sendEmergencySMS('+33612345678', 'Emergency alert'),
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith('sms_rate_limit', expect.any(Object));
    });
  });

  describe('sendFriendlyAlertSMS', () => {
    it('should send friendly alert SMS', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-456',
        sentAt: new Date(),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await smsService.sendFriendlyAlertSMS('+33612345678', 'Check-in reminder');

      expect(result).toEqual(mockResponse);
      expect(apiClient.apiCall).toHaveBeenCalled();
    });

    it('should handle SMS service error', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(
        smsService.sendFriendlyAlertSMS('+33612345678', 'Check-in reminder'),
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalled();
    });
  });

  describe('sendFollowUpAlertSMS', () => {
    it('should send follow-up alert SMS', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-789',
        sentAt: new Date(),
      };

      vi.mocked(apiClient.apiCall).mockResolvedValueOnce(mockResponse);

      const result = await smsService.sendFollowUpAlertSMS('+33612345678', 'Follow-up message');

      expect(result).toEqual(mockResponse);
    });

    it('should handle network error on follow-up', async () => {
      vi.mocked(apiClient.apiCall).mockRejectedValueOnce({
        code: 'NETWORK_ERROR',
        message: 'Network timeout',
      });

      await expect(
        smsService.sendFollowUpAlertSMS('+33612345678', 'Follow-up message'),
      ).rejects.toThrow();

      expect(notificationService.notify).toHaveBeenCalledWith('network_error', expect.any(Object));
    });
  });
});
