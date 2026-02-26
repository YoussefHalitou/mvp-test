import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

(async () => {
    const { data: proj } = await supabase.from('t_projects').select('project_id').limit(1);
    const { data: svc } = await supabase.from('t_services').select('service_id').limit(1);
    
    if (proj?.length && svc?.length) {
        console.log("Proj", proj[0].project_id, "Svc", svc[0].service_id);
        const { data, error } = await supabase.from('t_project_service_usage').insert({
            project_id: proj[0].project_id,
            service_id: svc[0].service_id,
            quantity: 1,
            supplier: null
        }).select();
        console.log('Insert result error:', error);
        console.log('Insert data:', data);
    } else {
        console.log('No data');
    }
})();
