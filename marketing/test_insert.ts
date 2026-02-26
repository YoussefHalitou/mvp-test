import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
(async () => {
    const { data: proj } = await supabase.from('t_projects').select('project_id').limit(1);
    const { data: svc } = await supabase.from('t_services').select('service_id').limit(1);
    if (proj?.length && svc?.length) {
        const { error } = await supabase.from('t_project_service_usage').insert({
            project_id: proj[0].project_id,
            service_id: svc[0].service_id,
            quantity: 1,
            supplier: null
        });
        console.log("Insert result:", error);
    }
})();
