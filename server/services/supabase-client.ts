import { createClient } from '@supabase/supabase-js';

// Simple logger
const log = {
  error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
  info: (msg: string) => console.log(`[INFO] ${msg}`),
};

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  log.error('❌ Supabase credentials not configured');
  log.error(`SUPABASE_URL: ${supabaseUrl ? '✅' : '❌'}`);
  log.error(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? '✅' : '❌'}`);
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseServiceRoleKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function getOrCreateUser(firstName: string, phoneNumber?: string) {
  try {
    // For now, we'll create a new user each time
    // In production, you'd want to link to an authenticated user
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          first_name: firstName,
          phone_number: phoneNumber,
        },
      ])
      .select()
      .single();

    if (error) {
      log.error('Error creating user:', error);
      return null;
    }

    return data;
  } catch (error) {
    log.error('Error in getOrCreateUser:', error);
    return null;
  }
}

export async function getEmergencyContacts(userId: string) {
  try {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      log.error('Error fetching emergency contacts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    log.error('Error in getEmergencyContacts:', error);
    return [];
  }
}

export async function createSession(
  userId: string,
  startTime: Date,
  deadline: Date,
  latitude?: number,
  longitude?: number
) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          user_id: userId,
          start_time: startTime.toISOString(),
          deadline: deadline.toISOString(),
          status: 'active',
          location_latitude: latitude,
          location_longitude: longitude,
        },
      ])
      .select()
      .single();

    if (error) {
      log.error('Error creating session:', error);
      return null;
    }

    return data;
  } catch (error) {
    log.error('Error in createSession:', error);
    return null;
  }
}

export async function logSMS(
  sessionId: string,
  contactId: string,
  messageSid: string,
  status: 'sent' | 'failed' | 'pending',
  errorMessage?: string
) {
  try {
    const { data, error } = await supabase
      .from('sms_logs')
      .insert([
        {
          session_id: sessionId,
          contact_id: contactId,
          message_sid: messageSid,
          status,
          error_message: errorMessage,
        },
      ])
      .select()
      .single();

    if (error) {
      log.error('Error logging SMS:', error);
      return null;
    }

    return data;
  } catch (error) {
    log.error('Error in logSMS:', error);
    return null;
  }
}
