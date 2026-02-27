import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface AnomalyResult {
  endpoint: string;
  error_count: number;
  affected_users: number;
  affected_ips: number;
  severity: string;
}

interface AlertConfig {
  SLACK_WEBHOOK_URL?: string;
  EMAIL_ALERT_TO?: string;
  SMS_ALERT_TO?: string;
}

/**
 * Monitor Rate Limit Errors
 * Runs every 5 minutes to check for anomalies and create alerts
 */
serve(async (req) => {
  // Verify request is from Supabase cron
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');

  if (!token || token !== Deno.env.get('SUPABASE_AUTH_TOKEN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check for anomalies in the last 5 minutes
    const { data: anomalies, error: anomalyError } = await supabase.rpc(
      'check_rate_limit_anomalies',
      {
        p_time_window_minutes: 5,
        p_error_threshold: 10,
      },
    );

    if (anomalyError) {
      console.error('Error checking anomalies:', anomalyError);
      return new Response(JSON.stringify({ error: anomalyError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process each anomaly
    const alerts: string[] = [];

    if (anomalies && Array.isArray(anomalies)) {
      for (const anomaly of anomalies as AnomalyResult[]) {
        const alertMessage = `
🚨 Rate Limit Alert - ${anomaly.severity}
Endpoint: ${anomaly.endpoint}
Errors: ${anomaly.error_count}
Affected Users: ${anomaly.affected_users}
Affected IPs: ${anomaly.affected_ips}
Time: ${new Date().toISOString()}
        `.trim();

        // Create alert in database
        const { error: alertError } = await supabase.rpc('create_rate_limit_alert', {
          p_endpoint: anomaly.endpoint,
          p_severity: anomaly.severity,
          p_message: alertMessage,
          p_error_count: anomaly.error_count,
          p_affected_users: anomaly.affected_users,
        });

        if (alertError) {
          console.error('Error creating alert:', alertError);
        } else {
          alerts.push(alertMessage);
        }

        // Send notifications based on severity
        if (anomaly.severity === 'CRITICAL') {
          await sendCriticalAlert(anomaly, supabase);
        } else if (anomaly.severity === 'WARNING') {
          await sendWarningAlert(anomaly, supabase);
        }

        // Track abuse patterns
        await trackAbusePatterns(anomaly, supabase);
      }
    }

    // Clean up old errors (older than 7 days)
    const { error: cleanupError } = await supabase.rpc('cleanup_old_rate_limit_errors', {
      p_days: 7,
    });

    if (cleanupError) {
      console.error('Error cleaning up old errors:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        anomalies_found: anomalies?.length ?? 0,
        alerts_created: alerts.length,
        alerts: alerts,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Monitor rate limit error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Send critical alert via Slack, Email, and SMS
 */
async function sendCriticalAlert(
  anomaly: AnomalyResult,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const config: AlertConfig = {
    SLACK_WEBHOOK_URL: Deno.env.get('SLACK_WEBHOOK_URL'),
    EMAIL_ALERT_TO: Deno.env.get('EMAIL_ALERT_TO'),
    SMS_ALERT_TO: Deno.env.get('SMS_ALERT_TO'),
  };

  const alertText = `
🚨 CRITICAL RATE LIMIT ALERT
Endpoint: ${anomaly.endpoint}
Errors: ${anomaly.error_count}
Affected Users: ${anomaly.affected_users}
Affected IPs: ${anomaly.affected_ips}
  `.trim();

  // Send to Slack
  if (config.SLACK_WEBHOOK_URL) {
    try {
      await fetch(config.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: alertText,
          attachments: [
            {
              color: 'danger',
              fields: [
                { title: 'Endpoint', value: anomaly.endpoint, short: true },
                { title: 'Errors', value: anomaly.error_count.toString(), short: true },
                { title: 'Affected Users', value: anomaly.affected_users.toString(), short: true },
                { title: 'Affected IPs', value: anomaly.affected_ips.toString(), short: true },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      console.error('Error sending Slack alert:', error);
    }
  }

  // Send to Email (via Supabase Edge Function or external service)
  if (config.EMAIL_ALERT_TO) {
    try {
      // You can integrate with SendGrid, Mailgun, or any email service
      console.log(`Email alert would be sent to: ${config.EMAIL_ALERT_TO}`);
    } catch (error) {
      console.error('Error sending email alert:', error);
    }
  }

  // Send to SMS (via Twilio)
  if (config.SMS_ALERT_TO) {
    try {
      // You can integrate with Twilio for SMS alerts
      console.log(`SMS alert would be sent to: ${config.SMS_ALERT_TO}`);
    } catch (error) {
      console.error('Error sending SMS alert:', error);
    }
  }
}

/**
 * Send warning alert via Slack
 */
async function sendWarningAlert(
  anomaly: AnomalyResult,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const slackWebhook = Deno.env.get('SLACK_WEBHOOK_URL');

  if (!slackWebhook) return;

  try {
    await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `⚠️ Rate Limit Warning - ${anomaly.endpoint}`,
        attachments: [
          {
            color: 'warning',
            fields: [
              { title: 'Endpoint', value: anomaly.endpoint, short: true },
              { title: 'Errors', value: anomaly.error_count.toString(), short: true },
              { title: 'Affected Users', value: anomaly.affected_users.toString(), short: true },
              { title: 'Affected IPs', value: anomaly.affected_ips.toString(), short: true },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    console.error('Error sending warning alert:', error);
  }
}

/**
 * Track abuse patterns for future blocking
 */
async function trackAbusePatterns(
  anomaly: AnomalyResult,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  try {
    // Get the top abusers for this endpoint
    const { data: topAbusers, error } = await supabase
      .from('rate_limit_errors')
      .select('user_id, ip_address, COUNT(*) as count')
      .eq('endpoint', anomaly.endpoint)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .group_by('user_id, ip_address')
      .order('count', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error getting top abusers:', error);
      return;
    }

    // Track each abuser pattern
    if (topAbusers && Array.isArray(topAbusers)) {
      for (const abuser of topAbusers) {
        if (abuser.user_id) {
          await supabase.rpc('track_abuse_pattern', {
            p_endpoint: anomaly.endpoint,
            p_pattern_type: 'user_id',
            p_pattern_value: abuser.user_id,
          });
        }

        if (abuser.ip_address) {
          await supabase.rpc('track_abuse_pattern', {
            p_endpoint: anomaly.endpoint,
            p_pattern_type: 'ip_address',
            p_pattern_value: abuser.ip_address,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error tracking abuse patterns:', error);
  }
}
