import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationService } from './notification.service';
import { Toast } from 'react-native-toast-notifications';

vi.mock('react-native-toast-notifications');

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notify', () => {
    it('should show success notification', () => {
      vi.mocked(Toast.show).mockImplementationOnce(() => {});

      notificationService.notify('trip_started', {
        duration: 60,
      });

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
        })
      );
    });

    it('should show error notification', () => {
      vi.mocked(Toast.show).mockImplementationOnce(() => {});

      notificationService.notify('insufficient_credits', {
        creditsNeeded: 5,
      });

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });

    it('should show warning notification', () => {
      vi.mocked(Toast.show).mockImplementationOnce(() => {});

      notificationService.notify('battery_low', {
        level: 15,
      });

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
        })
      );
    });

    it('should use fallback message if notification not found', () => {
      vi.mocked(Toast.show).mockImplementationOnce(() => {});

      notificationService.notify('unknown_notification', {});

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: 'Notification',
        })
      );
    });

    it('should interpolate variables in message', () => {
      vi.mocked(Toast.show).mockImplementationOnce(() => {});

      notificationService.notify('rate_limit_exceeded', {
        retryAfter: 60,
      });

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: expect.stringContaining('60'),
        })
      );
    });

    it('should respect duration setting', () => {
      vi.mocked(Toast.show).mockImplementationOnce(() => {});

      notificationService.notify('trip_started', {
        duration: 60,
      }, 5000);

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 5000,
        })
      );
    });
  });

  describe('notifyBlocked', () => {
    it('should show blocked notification with action', () => {
      vi.mocked(Toast.show).mockImplementationOnce(() => {});

      notificationService.notifyBlocked(
        'phone_not_configured',
        () => console.log('Navigate to settings'),
        { phone: '+33612345678' }
      );

      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });
  });
});
