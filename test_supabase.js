import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kycuteffcbqizyqlhczc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '✓' : '✗');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test 1: Simple insert
const { data, error } = await supabase.from('sessions').insert({
  id: 'test-' + Date.now(),
  user_id: '550e8400-e29b-41d4-a716-446655440000',
  limit_time: new Date().toISOString(),
  tolerance: 900000,
  deadline: new Date(Date.now() + 900000).toISOString(),
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success! Data:', data);
}
