const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
for (const l of env.split('\n')) {
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim().replace(/^["']|["']$/g, '');
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = l.split('=')[1].trim().replace(/^["']|["']$/g, '');
}
const supabase = createClient(url, key);

async function inspectReviewLogs() {
  const { data: sample, error } = await supabase.from('review_logs').select('*').limit(3);
  console.log('Sample row from review_logs:', sample ? sample[0] : null);
  console.log('Columns in review_logs:', sample && sample[0] ? Object.keys(sample[0]) : 'None');

  // Let's test what happens if we insert source
  console.log('Does source column exist?', sample && sample[0] ? ('source' in sample[0]) : false);

  // Let's test if is_resolved exists
  console.log('Does is_resolved column exist?', sample && sample[0] ? ('is_resolved' in sample[0]) : false);
}

inspectReviewLogs().catch(console.error);
