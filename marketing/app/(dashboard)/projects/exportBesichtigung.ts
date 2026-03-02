import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export const exportBesichtigungHTML = async (projectId: string, projectData: any) => {
    try {
        // 1. Fetch the corresponding inspection from the project
        const { data: inspections, error: inspectionError } = await supabase
            .from('t_inspections')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

        if (inspectionError) throw inspectionError;

        if (!inspections || inspections.length === 0) {
            alert('Keine Besichtigung für dieses Projekt gefunden.');
            return;
        }

        const inspection = inspections[0];

        // 2. Fetch all related tables
        const [
            { data: rooms },
            { data: materials },
            { data: vehicles },
            { data: hvz },
            { data: sonstiges },
            { data: photos }
        ] = await Promise.all([
            supabase.from('t_inspection_room_items').select('*').eq('inspection_id', inspection.inspection_id).order('room_id'),
            supabase.from('t_inspection_materials').select('*').eq('inspection_id', inspection.inspection_id),
            supabase.from('t_inspection_vehicles').select('*').eq('inspection_id', inspection.inspection_id),
            supabase.from('t_inspection_hvz').select('*').eq('inspection_id', inspection.inspection_id),
            supabase.from('t_inspection_sonstiges').select('*').eq('inspection_id', inspection.inspection_id),
            supabase.from('t_inspection_photos').select('*').eq('inspection_id', inspection.inspection_id)
        ]);

        // Group rooms
        const groupedRooms: Record<number, any[]> = {};
        (rooms || []).forEach(r => {
            if (!groupedRooms[r.room_id]) groupedRooms[r.room_id] = [];
            groupedRooms[r.room_id].push(r);
        });

        // Generate HTML
        const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Arbeitsauftrag - ${projectData?.name}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: "Inter", -apple-system, sans-serif; font-size: 11px; margin: 30px; color: #1e293b; line-height: 1.4; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 24px; color: #0f172a; font-weight: 700; padding-bottom: 15px; border-bottom: 2px solid #e2e8f0; }
    h2 { font-size: 14px; font-weight: 600; color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; background: #fafafa; }
    .box-title { font-weight: 600; font-size: 12px; margin-bottom: 8px; color: #0f172a; }
    .field-row { display: flex; margin-bottom: 6px; }
    .field-row .label { font-weight: 600; width: 120px; color: #64748b; font-size: 10px; }
    .field-row .val { color: #0f172a; flex: 1; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; table-layout: fixed; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background-color: #f1f5f9; font-weight: 600; color: #334155; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .room-header { background: #e2e8f0; font-weight: bold; font-size: 11px; padding: 6px 8px; margin-top: 10px; border-radius: 4px 4px 0 0; border: 1px solid #cbd5e1; border-bottom: none;}
    .room-table { border-radius: 0 0 4px 4px; overflow: hidden; }

    .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
    .photo-item { width: calc(33.333% - 10px); break-inside: avoid; margin-bottom: 10px; }
    .photo-item img { width: 100%; height: auto; border: 1px solid #cbd5e1; border-radius: 4px; object-fit: contain; max-height: 250px; }
    .photo-caption { font-size: 9px; color: #64748b; text-align: center; margin-top: 4px; }
    
    .page-break { page-break-before: always; }
</style>
</head>
<body>
    <h1>Arbeitsauftrag (Besichtigung) - ${projectData?.anrede ? projectData.anrede + ' ' : ''}${projectData?.name || ''}</h1>

    <div class="grid-2">
        <div class="box">
            <div class="box-title">Startadresse</div>
            <div class="field-row"><div class="label">Kunde</div><div class="val">${inspection.anrede ? inspection.anrede + ' ' : ''}${inspection.name || ''}</div></div>
            <div class="field-row"><div class="label">Straße</div><div class="val">${inspection.strasse || ''} ${inspection.nr || ''}</div></div>
            <div class="field-row"><div class="label">Ort</div><div class="val">${inspection.plz || ''} ${inspection.ort || ''}</div></div>
            <div class="field-row"><div class="label">Telefon</div><div class="val">${inspection.telefon || ''}</div></div>
            <div class="field-row"><div class="label">Etage / Aufzug</div><div class="val">${inspection.etage || ''} ${inspection.aufzug_vorhanden === 'true' || inspection.aufzug_vorhanden === 'Ja' ? '(Aufzug vorhanden)' : '(Kein Aufzug)'}</div></div>
        </div>
        <div class="box">
            <div class="box-title">Zieladresse</div>
            <div class="field-row"><div class="label">Kunde</div><div class="val">${inspection.ziel_anrede ? inspection.ziel_anrede + ' ' : ''}${inspection.ziel_name || ''}</div></div>
            <div class="field-row"><div class="label">Straße</div><div class="val">${inspection.ziel_strasse || ''} ${inspection.ziel_nr || ''}</div></div>
            <div class="field-row"><div class="label">Ort</div><div class="val">${inspection.ziel_plz || ''} ${inspection.ziel_ort || ''}</div></div>
            <div class="field-row"><div class="label">Etage / Aufzug</div><div class="val">${inspection.ziel_aufzug_vorhanden === 'true' || inspection.ziel_aufzug_vorhanden === 'Ja' ? '(Aufzug vorhanden)' : '(Kein Aufzug)'}</div></div>
        </div>
    </div>

    <div class="grid-2">
        <div class="box">
            <div class="box-title">Projektdetails</div>
            <div class="field-row"><div class="label">Tournr / Code</div><div class="val">${projectData?.project_code || ''}</div></div>
            <div class="field-row"><div class="label">Arbeitsbeginn</div><div class="val">${projectData?.project_time || ''}</div></div>
            <div class="field-row"><div class="label">Datum</div><div class="val">${projectData?.project_date ? format(new Date(projectData.project_date), 'dd.MM.yyyy') : ''}</div></div>
            <div class="field-row"><div class="label">LKW</div><div class="val">${inspection.lkw_groesse || ''}</div></div>
            <div class="field-row"><div class="label">HVZ Nötig?</div><div class="val">${inspection.hvz_noetig === 'true' || inspection.hvz_noetig === 'Ja' ? 'Ja' : 'Nein'} ${inspection.hvz_location ? '(' + inspection.hvz_location + ')' : ''}</div></div>
        </div>
        <div class="box">
            <div class="box-title">Extra Informationen / Notizen</div>
            <div style="font-size: 10px; white-space: pre-wrap;">${inspection.extrainformationen || inspection.notes || 'Keine besonderen Notizen'}</div>
        </div>
    </div>

    <h2>Ressourcen & Materialien (mitnehmen!)</h2>
    <div class="grid-2">
        <div>
            ${materials && materials.length > 0 ? `
            <table class="table">
                <thead><tr><th>Material (Mitbringen)</th><th class="text-right w-[60px]">Menge</th></tr></thead>
                <tbody>
                    ${materials.map((m: any) => `
                        <tr><td>${m.material_name} ${m.notes ? `<br/><small class="text-gray-500">${m.notes}</small>` : ''}</td><td class="text-right">${m.quantity} ${m.unit || ''}</td></tr>
                    `).join('')}
                </tbody>
            </table>
            ` : '<div class="text-sm text-gray-500">Keine Materialien hinterlegt</div>'}
        </div>
        <div>
            ${hvz && hvz.length > 0 ? `
            <table class="table">
                <thead><tr><th>Halteverbotszone (HVZ)</th><th class="text-right w-[60px]">Anzahl</th></tr></thead>
                <tbody>
                    ${hvz.map((h: any) => `
                        <tr><td>${h.description} ${h.notes ? `<br/><small class="text-gray-500">${h.notes}</small>` : ''}</td><td class="text-right">${h.quantity}</td></tr>
                    `).join('')}
                </tbody>
            </table>
            ` : ''}

            ${vehicles && vehicles.length > 0 ? `
            <table class="table">
                <thead><tr><th>Fahrzeuge</th><th class="text-right w-[60px]">Anzahl</th></tr></thead>
                <tbody>
                    ${vehicles.map((v: any) => `
                        <tr><td>${v.vehicle_type} ${v.notes ? `<br/><small class="text-gray-500">${v.notes}</small>` : ''}</td><td class="text-right">${v.quantity}</td></tr>
                    `).join('')}
                </tbody>
            </table>
            ` : ''}
        </div>
    </div>

    <h2>Räume & Inventar</h2>
    ${Object.keys(groupedRooms).length === 0 ? '<div class="text-sm text-gray-500">Kein Inventar hinterlegt</div>' :
                Object.entries(groupedRooms).map(([roomId, items]) => {
                    const hasDemontage = items.some(i => i.montage_option && i.montage_option !== 'Keine');
                    return `
            <div class="room-header">Raum ${roomId}</div>
            <table class="room-table">
                <thead>
                    <tr>
                        <th>Gegenstand</th>
                        <th class="text-center w-[60px]">Menge</th>
                        ${hasDemontage ? '<th class="w-[120px]">Montage/Demontage</th>' : ''}
                        <th class="w-[150px]">Notizen</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(i => `
                        <tr>
                            <td>${i.item_name}</td>
                            <td class="text-center">${i.quantity || 1}</td>
                            ${hasDemontage ? `<td>${i.montage_option && i.montage_option !== 'Keine' ? i.montage_option : ''}</td>` : ''}
                            <td>${i.notes || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            `;
                }).join('')
            }

    ${photos && photos.length > 0 ? `
    <div class="page-break"></div>
    <h2>Fotos der Besichtigung</h2>
    <div class="photo-grid">
        ${photos.map((p: any) => `
            <div class="photo-item">
                <img src="${p.url}" />
                ${p.caption || p.category ? `<div class="photo-caption">${p.category ? p.category + ': ' : ''}${p.caption || ''}</div>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Arbeitsauftrag_${projectData?.name || 'Projekt'}.html`;
        a.click();
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Fehler beim Exportieren der Besichtigung:", error);
        alert("Es ist ein Fehler beim Exportieren aufgetreten. Bitte prüfen Sie die Konsole.");
    }
};
