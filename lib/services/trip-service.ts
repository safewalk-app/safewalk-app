// Service: trip-service.ts
// Purpose: Client for trip management Edge Functions
// Functions: start-trip, checkin, extend, ping-location, test-sms, sos

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from '@/lib/services/api-retry-helper';
import { notify } from '@/lib/services/notification.service';

export interface StartTripInput {
  deadlineISO: string;
  shareLocation: boolean;
  destinationNote?: string;
}

export interface StartTripOutput {
  success: boolean;
  tripId?: string;
  status?: string;
  deadline?: string;
  message?: string;
  error?: string;
  errorCode?: string;
  // Error handling codes for UI
  // 'no_credits' -> show paywall
  // 'quota_reached' -> show "Limite atteinte aujourd'hui"
  // 'phone_not_verified' -> trigger OTP flow
  // 'twilio_failed' -> show "Impossible d'envoyer l'alerte"
}

export interface CheckinInput {
  tripId: string;
}

export interface CheckinOutput {
  success: boolean;
  tripId?: string;
  status?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface ExtendInput {
  tripId: string;
  addMinutes: number;
}

export interface ExtendOutput {
  success: boolean;
  tripId?: string;
  newDeadline?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface PingLocationInput {
  tripId: string;
  lat: number;
  lng: number;
}

export interface PingLocationOutput {
  success: boolean;
  tripId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

export interface TestSmsOutput {
  success: boolean;
  message?: string;
  smsSent?: boolean;
  error?: string;
  errorCode?: string;
}

export interface SosInput {
  tripId?: string;
}

export interface SosOutput {
  success: boolean;
  message?: string;
  smsSent?: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Start a new trip/session
 */
export async function startTrip(input: StartTripInput): Promise<StartTripOutput> {
  try {
    logger.info('Starting trip', { deadline: input.deadlineISO });

    // Check if user phone is verified
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.error('Start trip: No authenticated user');
      return {
        success: false,
        error: 'Not authenticated',
        errorCode: 'UNAUTHORIZED',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', user.id)
      .single();

    if (!profile?.phone_verified) {
      logger.warn('Start trip: Phone not verified', { userId: user.id });
      notify('auth.otp_required');
      return {
        success: false,
        error: 'Phone number not verified',
        errorCode: 'PHONE_NOT_VERIFIED',
      };
    }

    // Invoke start-trip with retry logic
    const retryResult = await retryWithBackoff(
      () => supabase.functions.invoke('start-trip', { body: input }),
      { maxRetries: 3, initialDelayMs: 500 },
    );

    const { data, error } = retryResult.success
      ? retryResult.data!
      : { data: null, error: retryResult.error };

    if (error) {
      // Handle rate limit error (429)
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        logger.warn('Start trip: Rate limit exceeded', { retryAfter: errorData.retryAfter });
        notify('error.rate_limited', {
          variables: { seconds: errorData.retryAfter || 60 },
        });
        return {
          success: false,
          error: errorData.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
          errorCode: 'rate_limit_exceeded',
          message: `Réessayez dans ${errorData.retryAfter || 60} secondes`,
        };
      }

      logger.error('Start trip error', { error });
      return {
        success: false,
        error: error.message,
        errorCode: 'FUNCTION_ERROR',
      };
    }

    // Handle error codes from Edge Function
    if (data && !data.success) {
      const errorCode = data.errorCode;
      logger.warn('Start trip failed', { errorCode, error: data.error });

      // Map error codes for UI handling
      if (errorCode === 'no_credits') {
        notify('credits.empty');
        return {
          success: false,
          error: 'Crédits insuffisants',
          errorCode: 'no_credits',
        };
      }
      if (errorCode === 'quota_reached') {
        notify('alert.quota_reached');
        return {
          success: false,
          error: "Limite atteinte aujourd'hui",
          errorCode: 'quota_reached',
        };
      }
      if (errorCode === 'twilio_failed') {
        notify('sms.failed_retry');
        return {
          success: false,
          error: "Impossible d'envoyer l'alerte, réessaiera",
          errorCode: 'twilio_failed',
        };
      }

      return data as StartTripOutput;
    }

    logger.info('Trip started successfully', { tripId: data?.tripId });
    notify('trip.started', {
      variables: { deadline: new Date(data?.deadline).toLocaleTimeString('fr-FR') },
    });
    return data as StartTripOutput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Start trip exception', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
      errorCode: 'EXCEPTION',
    };
  }
}

/**
 * Confirm arrival (check-in)
 */
export async function checkin(input: CheckinInput): Promise<CheckinOutput> {
  try {
    logger.info('Checking in', { tripId: input.tripId });

    // Invoke checkin with retry logic
    const retryResult = await retryWithBackoff(
      () => supabase.functions.invoke('checkin', { body: input }),
      { maxRetries: 3, initialDelayMs: 500 },
    );

    const { data, error } = retryResult.success
      ? retryResult.data!
      : { data: null, error: retryResult.error };

    if (error) {
      // Handle rate limit error (429)
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        logger.warn('Checkin: Rate limit exceeded');
        notify('error.rate_limited', {
          variables: { seconds: errorData.retryAfter || 60 },
        });
        return {
          success: false,
          error: errorData.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
          errorCode: 'rate_limit_exceeded',
        };
      }

      logger.error('Checkin error', { error });
      return {
        success: false,
        error: error.message,
        errorCode: 'FUNCTION_ERROR',
      };
    }

    logger.info('Checked in successfully', { tripId: data?.tripId });
    notify('trip.checked_in');
    return data as CheckinOutput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Checkin exception', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
      errorCode: 'EXCEPTION',
    };
  }
}

/**
 * Extend trip deadline
 */
export async function extendTrip(input: ExtendInput): Promise<ExtendOutput> {
  try {
    logger.info('Extending trip', { tripId: input.tripId, addMinutes: input.addMinutes });

    // Invoke extend with retry logic
    const retryResult = await retryWithBackoff(
      () => supabase.functions.invoke('extend', { body: input }),
      { maxRetries: 3, initialDelayMs: 500 },
    );

    const { data, error } = retryResult.success
      ? retryResult.data!
      : { data: null, error: retryResult.error };

    if (error) {
      // Handle rate limit error (429)
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        logger.warn('Extend trip: Rate limit exceeded');
        notify('error.rate_limited', {
          variables: { seconds: errorData.retryAfter || 60 },
        });
        return {
          success: false,
          error: errorData.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
          errorCode: 'rate_limit_exceeded',
        };
      }

      logger.error('Extend trip error', { error });
      return {
        success: false,
        error: error.message,
        errorCode: 'FUNCTION_ERROR',
      };
    }

    logger.info('Trip extended successfully', { tripId: data?.tripId });
    notify('trip.extended', {
      variables: { minutes: input.addMinutes },
    });
    return data as ExtendOutput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Extend trip exception', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
      errorCode: 'EXCEPTION',
    };
  }
}

/**
 * Update trip location
 */
export async function pingLocation(input: PingLocationInput): Promise<PingLocationOutput> {
  try {
    logger.info('Pinging location', { tripId: input.tripId, lat: input.lat, lng: input.lng });

    const { data, error } = await supabase.functions.invoke('ping-location', {
      body: input,
    });

    if (error) {
      // Handle rate limit error (429)
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        logger.warn('Ping location: Rate limit exceeded');
        return {
          success: false,
          error: errorData.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
          errorCode: 'rate_limit_exceeded',
        };
      }

      logger.error('Ping location error', { error });
      return {
        success: false,
        error: error.message,
        errorCode: 'FUNCTION_ERROR',
      };
    }

    logger.info('Location updated successfully', { tripId: data?.tripId });
    return data as PingLocationOutput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Ping location exception', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
      errorCode: 'EXCEPTION',
    };
  }
}

/**
 * Send test SMS to primary emergency contact
 */
export async function sendTestSms(): Promise<TestSmsOutput> {
  try {
    logger.info('Sending test SMS');

    // Check if user phone is verified
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.error('Test SMS: No authenticated user');
      return {
        success: false,
        error: 'Not authenticated',
        errorCode: 'UNAUTHORIZED',
        smsSent: false,
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', user.id)
      .single();

    if (!profile?.phone_verified) {
      logger.warn('Test SMS: Phone not verified', { userId: user.id });
      return {
        success: false,
        error: 'Phone number not verified',
        errorCode: 'PHONE_NOT_VERIFIED',
        smsSent: false,
      };
    }

    const { data, error } = await supabase.functions.invoke('test-sms', {
      body: {},
    });

    if (error) {
      // Handle rate limit error (429)
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        logger.warn('Test SMS: Rate limit exceeded');
        return {
          success: false,
          error: errorData.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
          errorCode: 'rate_limit_exceeded',
          smsSent: false,
        };
      }

      logger.error('Test SMS error', { error });
      return {
        success: false,
        error: error.message,
        errorCode: 'FUNCTION_ERROR',
        smsSent: false,
      };
    }

    // Handle error codes from Edge Function
    if (data && !data.success) {
      const errorCode = data.errorCode;
      logger.warn('Test SMS failed', { errorCode, error: data.error });

      if (errorCode === 'no_credits') {
        return {
          success: false,
          error: 'Crédits insuffisants',
          errorCode: 'no_credits',
          smsSent: false,
        };
      }
      if (errorCode === 'quota_reached') {
        return {
          success: false,
          error: "Limite atteinte aujourd'hui",
          errorCode: 'quota_reached',
          smsSent: false,
        };
      }
      if (errorCode === 'twilio_failed') {
        return {
          success: false,
          error: "Impossible d'envoyer l'alerte, réessaiera",
          errorCode: 'twilio_failed',
          smsSent: false,
        };
      }

      return data as TestSmsOutput;
    }

    logger.info('Test SMS sent successfully');
    return data as TestSmsOutput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Test SMS exception', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
      errorCode: 'EXCEPTION',
      smsSent: false,
    };
  }
}

/**
 * Trigger SOS alert
 */
export async function triggerSos(input: SosInput = {}): Promise<SosOutput> {
  try {
    logger.info('Triggering SOS alert', { tripId: input.tripId });

    // Check if user phone is verified
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.error('SOS: No authenticated user');
      return {
        success: false,
        error: 'Not authenticated',
        errorCode: 'UNAUTHORIZED',
        smsSent: false,
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', user.id)
      .single();

    if (!profile?.phone_verified) {
      logger.warn('SOS: Phone not verified', { userId: user.id });
      return {
        success: false,
        error: 'Phone number not verified',
        errorCode: 'PHONE_NOT_VERIFIED',
        smsSent: false,
      };
    }

    const { data, error } = await supabase.functions.invoke('sos', {
      body: input,
    });

    if (error) {
      // Handle rate limit error (429)
      if (error.status === 429) {
        const errorData = error.context?.json || {};
        logger.warn('SOS: Rate limit exceeded');
        return {
          success: false,
          error: errorData.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
          errorCode: 'rate_limit_exceeded',
          smsSent: false,
        };
      }

      logger.error('SOS error', { error });
      return {
        success: false,
        error: error.message,
        errorCode: 'FUNCTION_ERROR',
        smsSent: false,
      };
    }

    // Handle error codes from Edge Function
    if (data && !data.success) {
      const errorCode = data.errorCode;
      logger.warn('SOS failed', { errorCode, error: data.error });

      if (errorCode === 'no_credits') {
        return {
          success: false,
          error: 'Crédits insuffisants',
          errorCode: 'no_credits',
          smsSent: false,
        };
      }
      if (errorCode === 'quota_reached') {
        return {
          success: false,
          error: "Limite atteinte aujourd'hui",
          errorCode: 'quota_reached',
          smsSent: false,
        };
      }
      if (errorCode === 'twilio_failed') {
        return {
          success: false,
          error: "Impossible d'envoyer l'alerte, réessaiera",
          errorCode: 'twilio_failed',
          smsSent: false,
        };
      }

      return data as SosOutput;
    }

    logger.info('SOS alert sent successfully');
    return data as SosOutput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SOS exception', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
      errorCode: 'EXCEPTION',
      smsSent: false,
    };
  }
}

/**
 * Cancel an active trip
 */
export async function cancelTrip(
  tripId: string,
): Promise<{ success: boolean; error?: string; errorCode?: string }> {
  try {
    logger.info('Cancelling trip', { tripId });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.error('Cancel trip: No authenticated user');
      return {
        success: false,
        error: 'Not authenticated',
        errorCode: 'UNAUTHORIZED',
      };
    }

    // Update trip status to 'cancelled'
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'cancelled' })
      .eq('id', tripId)
      .eq('user_id', user.id);

    if (error) {
      logger.error('Cancel trip error', { error, tripId });
      return {
        success: false,
        error: error.message,
        errorCode: 'DB_ERROR',
      };
    }

    logger.info('Trip cancelled successfully', { tripId });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Cancel trip exception', { error: errorMessage });
    return {
      success: false,
      error: errorMessage,
      errorCode: 'EXCEPTION',
    };
  }
}
