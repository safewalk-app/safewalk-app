import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProfileData {
  free_alerts_remaining: number;
  free_test_sms_remaining: number;
  subscription_active: boolean;
  phone_verified: boolean;
  loading: boolean;
  error: string | null;
}

export function useProfileData(): ProfileData {
  const [data, setData] = useState<ProfileData>({
    free_alerts_remaining: 0,
    free_test_sms_remaining: 0,
    subscription_active: false,
    phone_verified: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setData((prev) => ({
          ...prev,
          loading: false,
          error: 'No user found',
        }));
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(
          'free_alerts_remaining, free_test_sms_remaining, subscription_active, phone_verified',
        )
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setData((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return;
      }

      setData({
        free_alerts_remaining: profile?.free_alerts_remaining || 0,
        free_test_sms_remaining: profile?.free_test_sms_remaining || 0,
        subscription_active: profile?.subscription_active || false,
        phone_verified: profile?.phone_verified || false,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Unexpected error loading profile:', error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load profile',
      }));
    }
  };

  return data;
}
