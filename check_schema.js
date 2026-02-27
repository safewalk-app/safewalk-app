import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kycuteffcbqizyqlhczc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Get table schema
const { data, error } = await supabase.from('sessions').select('*').limit(0);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Table columns:', Object.keys(data[0] || {}));
}

// Also try to get the table info via information_schema
const { data: columns, error: colError } = await supabase
  .rpc('get_columns', {
    table_name: 'sessions',
  })
  .catch(() => ({ data: null, error: 'RPC not available' }));

if (colError) {
  console.log('RPC error (expected):', colError);
}
