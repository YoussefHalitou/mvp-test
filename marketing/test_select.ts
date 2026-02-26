import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if (!supabaseUrl || !supabaseKey) { 
  console.log("No env"); 
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  supabase.from('t_project_material_usage').select('*, material:t_materials(name, unit, prices:t_material_prices(cost_per_unit, price_per_unit))').limit(1).then(res => console.log(JSON.stringify(res, null, 2)));
}
