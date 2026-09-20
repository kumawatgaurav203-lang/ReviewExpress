const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ytoinlgxzvykhcfajjiv.supabase.co';
const supabaseKey = 'sb_publishable_p4ykfgNF22_YqrPrX3ffSg_s2g28YvW';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Testing Supabase tables...');
  
  // Test businesses
  const { data: bizData, error: bizErr } = await supabase.from('businesses').select('*').limit(1);
  console.log('businesses:', { error: bizErr?.message, count: bizData?.length });

  // Test users
  const { data: userData, error: userErr } = await supabase.from('users').select('*').limit(1);
  console.log('users:', { error: userErr?.message, count: userData?.length });

  // Test business_members
  const { data: memData, error: memErr } = await supabase.from('business_members').select('*').limit(1);
  console.log('business_members:', { error: memErr?.message, count: memData?.length });

  // Test review_logs
  const { data: revData, error: revErr } = await supabase.from('review_logs').select('*').limit(1);
  console.log('review_logs:', { error: revErr?.message, count: revData?.length });

  // Test audit_logs
  const { data: auditData, error: auditErr } = await supabase.from('audit_logs').select('*').limit(1);
  console.log('audit_logs:', { error: auditErr?.message, count: auditData?.length });
}

checkTables();
