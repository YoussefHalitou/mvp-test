/**
 * Shared HTML generator for Auftragsnachkalkulation PDF export.
 * Used by: CalculationClient (export button), ApprovalsClient (accept), Mobile Approvals (accept).
 *
 * The snapshot parameter follows the same structure as stored in t_nachkalkulation_submissions.snapshot_data.
 */

const numFormat = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
const toNumber = (value: any) => Number(value) || 0;
const escapeHtml = (value: any) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, char => map[char]);
};
const getExtraCostLisTotal = (e: any) => {
    const menge = e.menge === undefined || e.menge === null ? 1 : toNumber(e.menge);
    const legacyCost = toNumber(e.cost);
    const rawEkPreis = toNumber(e.ek_preis);
    const ekPreis = (e.ek_preis === undefined || e.ek_preis === null || (rawEkPreis === 0 && legacyCost > 0))
        ? legacyCost / (menge || 1)
        : rawEkPreis;
    return menge * ekPreis;
};
const getExtraCostCustomerTotal = (e: any) => toNumber(e.menge ?? 1) * toNumber(e.vk_preis);

export function generateAuftragsnachkalkulationHTML(snapshot: any): string {
    const s = snapshot;
    const project = s.project || {};
    const adjustedPersonnel = s.adjustedPersonnel || [];
    const materials = s.materials || [];
    const vehicles = s.vehicles || [];
    const services = s.services || [];
    const hvzCosts = s.hvzCosts || [];
    const bnkCosts = s.bnkCosts || [];
    const extraCosts = s.extraCosts || [];
    const discounts = s.discounts || [];
    const revenue = s.revenue || [];
    const isKvMode = s.isKvMode || false;
    const kvValues = s.kvValues || {};
    const costBasis = s.costBasis || 'lis';

    // Personnel rate grouping — LiS Std always = costs, Kd Std always = revenue
    const rateMap = new Map<number, { names: string[], std: number, satz: number, kosten: number, erloes: number }>();
    let gesamtStd = 0;
    let gesamtKdStd = 0;
    adjustedPersonnel.forEach((p: any) => {
        gesamtStd += p.lis_stunden;
        gesamtKdStd += p.kunden_stunden;
        const existing = rateMap.get(p.satz) || { names: [] as string[], std: 0, satz: p.satz, kosten: 0, erloes: 0 };
        if (!existing.names.includes(p.mitarbeiter)) existing.names.push(p.mitarbeiter);
        existing.std += p.lis_stunden;
        existing.kosten += p.lis_stunden * p.satz;
        existing.erloes += p.kunden_stunden * p.satz;
        rateMap.set(p.satz, existing);
    });

    const materialKosten = materials.reduce((a: number, m: any) => a + (m.total_cost || 0), 0);
    const materialErloes = materials.reduce((a: number, m: any) => a + (m.total_price || 0), 0);
    const vehicleErloes = vehicles.reduce((a: number, v: any) => a + (v.total_cost || 0), 0);
    const serviceKosten = services.reduce((a: number, sv: any) => a + (sv.total_cost || 0), 0);
    const serviceErloes = services.reduce((a: number, sv: any) => a + (sv.total_price || sv.total_cost || 0), 0);
    const hvzKosten = hvzCosts.reduce((a: number, h: any) => a + ((h.tage || 0) * (h.ek_preis || 0)), 0);
    const hvzErloes = hvzCosts.reduce((a: number, h: any) => a + ((h.tage || 0) * (h.vk_preis || 0)), 0);
    const bnkKosten = bnkCosts.reduce((a: number, b: any) => a + ((b.menge || 0) * (b.ek_preis || 0)), 0);
    const bnkErloes = bnkCosts.reduce((a: number, b: any) => a + ((b.menge || 0) * (b.vk_preis || 0)), 0);
    const extraKosten = extraCosts.length > 0
        ? extraCosts.reduce((a: number, e: any) => a + getExtraCostLisTotal(e), 0)
        : toNumber(s.extraKosten);
    const extraErloes = extraCosts.length > 0
        ? extraCosts.reduce((a: number, e: any) => a + getExtraCostCustomerTotal(e), 0)
        : toNumber(s.extraErloes);
    const revenueTotal = revenue.reduce((a: number, r: any) => a + (r.line_total || 0), 0);
    const personalKosten = adjustedPersonnel.reduce((a: number, p: any) => a + p.kosten, 0);
    const personalErloes = Array.from(rateMap.values()).reduce((a, d) => a + d.erloes, 0);
    const totalCosts = personalKosten + materialKosten + serviceKosten + extraKosten + hvzKosten + bnkKosten;
    const baseRevenue = revenueTotal + personalErloes + materialErloes + vehicleErloes + serviceErloes + hvzErloes + bnkErloes + extraErloes;
    const discountTotal = discounts.reduce((a: number, d: any) => {
        if ((d.mode || 'flat') === 'percent') return a + (baseRevenue * ((d.value || 0) / 100));
        return a + (d.value || 0);
    }, 0);
    const totalRevenue = baseRevenue - discountTotal;
    const margin = totalRevenue - totalCosts;
    const marginPct = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    let lkwErloes = 0;
    vehicles.forEach((v: any) => { lkwErloes += v.total_cost || 0; });

    // EVD tables (services grouped by supplier)
    const evdLisMap = new Map<string, { service: string, qty: number, cost: number }[]>();
    const evdKundeMap = new Map<string, { service: string, qty: number, cost: number }[]>();
    services.forEach((s: any) => {
        const supplier = s.supplier || 'Sonstige';
        if (!evdLisMap.has(supplier)) evdLisMap.set(supplier, []);
        evdLisMap.get(supplier)!.push({ service: s.service_name, qty: s.quantity || 1, cost: s.total_cost });
        if (!evdKundeMap.has(supplier)) evdKundeMap.set(supplier, []);
        evdKundeMap.get(supplier)!.push({ service: s.service_name, qty: s.quantity || 1, cost: s.total_price || s.total_cost });
    });

    return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Auftragsnachkalkulation – ${project.name || ''}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: "Inter", -apple-system, sans-serif; font-size: 11px; margin: 20px; color: #1e293b; background: white; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 25px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .header-grid { display: flex; gap: 30px; margin-bottom: 25px; }
    .header-grid > div:first-child { flex: 3; }
    .header-grid > div:last-child { flex: 2; }
    .field-row { display: flex; margin-bottom: 12px; align-items: flex-end; }
    .field-row .label { font-size: 10px; font-weight: 600; width: 130px; color: #475569; }
    .field-row .value { flex: 1; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; min-height: 18px; font-size: 12px; font-weight: 500; }
    .box { border: 1px solid #94a3b8; border-radius: 4px; padding: 10px; height: 90px; font-size: 10px; font-weight: 600; color: #475569; background: #f8fafc; }
    .box-content { font-weight: 400; font-size: 11px; color: #1e293b; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; border-radius: 4px; overflow: hidden; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; }
    th { text-align: center; font-weight: 600; color: #334155; background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
    .bg-green { background-color: #86efac; color: #166534; border-color: #4ade80; }
    .text-orange { color: #ea580c; font-weight: 600; }
    .right { text-align: right; }
    .center { text-align: center; }
    .val-container { display: flex; justify-content: space-between; width: 100%; }
    .val-container .cur { color: #94a3b8; }
    .summary-table { width: 320px; margin-left: auto; margin-top: 30px; border-collapse: separate; border-spacing: 0 4px; }
    .summary-table td { border: none; padding: 6px 10px; background: #f8fafc; }
    .summary-table tr:last-child td { background: none; }
    .summary-table td.label { font-weight: 600; width: 60%; color: #475569; border-radius: 4px 0 0 4px; }
    .summary-table td.val { text-align: right; font-weight: 500; border-radius: 0 4px 4px 0; }
    .summary-table tr.total td.val { font-weight: 700; border-bottom: 2px solid #334155; border-radius: 0; background: transparent; }
    .flex-tables { display: flex; gap: 30px; margin-top: 25px; }
    .half-table { flex: 1; }
    .half-table-title { font-weight: 600; font-size: 11px; margin-bottom: 6px; color: #334155; text-transform: uppercase; letter-spacing: 0.03em; }
    .half-table table { width: 100%; }
    .half-table td { padding: 4px 8px; border-color: #e2e8f0; }
    .half-table td.label { color: #475569; font-weight: 500; }
    /* Page break rules */
    .header-grid, table, .flex-tables, .summary-table { page-break-inside: avoid; break-inside: avoid; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .flex-tables { page-break-before: auto; }
    .summary-table { page-break-before: auto; }
</style>
</head><body>
    <h1>Auftragsnachkalkulation</h1>
    <div class="header-grid">
        <div>
            <div class="field-row"><div class="label">Rechnungsadresse</div><div class="value" style="border:none;"></div></div>
            <div class="field-row"><div class="value">${project.anrede || ''} ${project.name || ''}</div></div>
            <div class="field-row"><div class="value">${project.strasse || ''} ${project.nr || ''}</div></div>
            <div class="field-row"><div class="value">${project.plz || ''} ${project.ort || ''}</div></div>
        </div>
        <div class="box">Sonstige Bemerkungen<div class="box-content">${project.notes || ''}</div></div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
        <div class="field-row" style="width: 50%;"><div class="label">Telefonnummer Kunde:</div><div class="value">${project.telefon || ''}</div></div>
        <div style="width: 40%; display:flex; align-items: flex-end;">
            <div style="font-size:10px; font-weight:600; margin-right:12px; color: #475569;">KV oder FP</div>
            <div style="flex:1; background-color:${isKvMode ? '#86efac' : '#fde68a'}; height:18px; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:${isKvMode ? '#166534' : '#92400e'};">${isKvMode ? 'KV' : 'FP'}</div>
            <div style="font-size:10px; font-weight:600; margin-left:15px; margin-right:12px; color: #475569;">Kunden Nr.</div>
            <div class="value" style="flex:1;"></div>
        </div>
    </div>
    <div class="field-row"><div class="label">Auftragsdatum</div><div class="value">${project.project_date ? new Date(project.project_date).toLocaleDateString('de-DE') : ''}</div></div>
    <div class="field-row"><div class="label">Aufgaben</div><div class="value">${project.dienstleistungen || ''}</div></div>
    <div class="field-row"><div class="label">Sonstige Infos</div><div class="value"></div></div>

    <table>
        <tr>
            <th style="text-align:left;">Kosten:</th>
            <th style="width:28%;">Land in Sicht</th>
            <th style="width:28%;">Kunde</th>
            ${isKvMode ? '<th class="bg-green" style="width:18%;">KV</th>' : ''}
        </tr>
        <tr>
            <td class="text-orange" style="background:#fff7ed;">Gesamt Std</td>
            <td class="center text-orange" style="background:#fff7ed;">${gesamtStd.toFixed(2)}</td>
            <td class="center" style="background:#fff7ed; color:#15803d; font-weight:600;">${gesamtKdStd.toFixed(2)}</td>
            ${isKvMode ? '<td style="background:#fff7ed;"></td>' : ''}
        </tr>
        ${(() => {
            const rateEntries = Array.from(rateMap.values());
            let personnelKvShown = false;
            return rateEntries.map(data => {
                const kvCell = isKvMode ? (personnelKvShown ? '<td></td>' : `<td class="right">${kvValues['personalkosten'] ? numFormat(kvValues['personalkosten']) : ''}</td>`) : '';
                personnelKvShown = true;
                return `<tr>
            <td style="font-weight:600; color:#475569;">Stunden ${data.names.join(', ')} <span style="color:#94a3b8; font-weight:400;">(${data.std.toFixed(2)} Std.)</span></td>
            <td class="center"><div class="val-container"><span>${data.std.toFixed(2)} x ${numFormat(data.satz)} =</span><span>${numFormat(data.kosten)}</span></div></td>
            <td class="center"><div class="val-container"><span></span><span style="color:#15803d;">${numFormat(data.erloes)}</span></div></td>
            ${kvCell}
        </tr>`;
            }).join('');
        })()}
        ${rateMap.size === 0 ? `<tr><td style="font-weight:600; color:#475569;">Stunden LiS</td><td class="center"><div class="val-container"><span>x 0,00 € =</span><span class="cur">- €</span></div></td><td class="center"><div class="val-container"><span></span><span class="cur">- €</span></div></td>${isKvMode ? `<td class="right">${kvValues['personalkosten'] ? numFormat(kvValues['personalkosten']) : ''}</td>` : ''}</tr>` : ''}
        ${(() => {
            const totalServiceKosten = services.reduce((s: number, x: any) => s + x.total_cost, 0);
            const totalServiceErloes = services.reduce((s: number, x: any) => s + ((x as any).total_price || x.total_cost), 0);
            const kvServiceCell = isKvMode ? `<td class="right">${kvValues['service_total'] ? numFormat(kvValues['service_total']) : ''}</td>` : '';
            if (services.length > 0) return `<tr>
            <td style="font-weight:600; color:#475569;">Entsorgungen</td>
            <td><div class="val-container"><span></span><span>${numFormat(totalServiceKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(totalServiceErloes)}</span></div></td>
            ${kvServiceCell}
        </tr>`;
            return `<tr>
            <td style="font-weight:600; color:#475569; height:28px;">Entsorgungen</td>
            <td><div class="val-container"><span></span><span class="cur">- €</span></div></td>
            <td><div class="val-container"><span></span><span class="cur">- €</span></div></td>
            ${kvServiceCell}
        </tr>`;
        })()}
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">LKW</td>
            <td></td><td><div class="val-container"><span></span><span>${numFormat(lkwErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['lkw'] ? numFormat(kvValues['lkw']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">HVZ</td>
            <td><div class="val-container"><span></span><span>${numFormat(hvzKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(hvzErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['hvz'] ? numFormat(kvValues['hvz']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">Diesel / BNK</td>
            <td><div class="val-container"><span></span><span>${numFormat(bnkKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(bnkErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['diesel'] ? numFormat(kvValues['diesel']) : ''}</td>` : ''}
        </tr>
        ${(() => {
            if (extraCosts.length === 0) return `<tr>
            <td style="font-weight:600; color:#475569; height:28px;">Sonstige Kosten</td>
            <td><div class="val-container"><span></span><span>${numFormat(extraKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(extraErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['extra'] ? numFormat(kvValues['extra']) : ''}</td>` : ''}
        </tr>`;
            return extraCosts.map((extraCost: any, index: number) => {
                const label = escapeHtml(extraCost.beschreibung || extraCost.description || extraCost.cost_type || `Position ${index + 1}`);
                return `<tr>
            <td style="font-weight:600; color:#475569; height:28px;">Sonstige Kosten: ${label}</td>
            <td><div class="val-container"><span></span><span>${numFormat(getExtraCostLisTotal(extraCost))}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(getExtraCostCustomerTotal(extraCost))}</span></div></td>
            ${isKvMode ? `<td class="right">${index === 0 && kvValues['extra'] ? numFormat(kvValues['extra']) : ''}</td>` : ''}
        </tr>`;
            }).join('');
        })()}
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">Material</td>
            <td><div class="val-container"><span></span><span>${numFormat(materialKosten)}</span></div></td>
            <td><div class="val-container"><span></span><span>${numFormat(materialErloes)}</span></div></td>
            ${isKvMode ? `<td class="right">${kvValues['material'] ? numFormat(kvValues['material']) : ''}</td>` : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">Erlöse</td>
            <td></td>
            <td><div class="val-container"><span></span><span>${numFormat(revenueTotal)}</span></div></td>
            ${isKvMode ? '<td></td>' : ''}
        </tr>
        <tr>
            <td style="font-weight:600; color:#475569; height:28px;">Rabatt / Nachlässe</td>
            <td></td>
            <td><div class="val-container"><span></span><span>${numFormat(discountTotal)}</span></div></td>
            ${isKvMode ? '<td></td>' : ''}
        </tr>
        <tr style="border-top:3px double #334155; background:#f1f5f9;">
            <td style="font-weight:700; color:#0f172a;">Summe</td>
            <td style="font-weight:700; text-align:right; color:#0f172a;">${numFormat(totalCosts)}</td>
            <td style="font-weight:700; text-align:right; color:#0f172a;">${numFormat(totalRevenue)}</td>
            ${isKvMode ? `<td style="font-weight:700; text-align:right; color:#166534;">${numFormat((Object.values(kvValues) as number[]).reduce((a: number, b: number) => a + b, 0))}</td>` : ''}
        </tr>
    </table>

    <div class="flex-tables">
        <div class="half-table">
            <div class="half-table-title">EVD LiS</div>
            <table>
                ${evdLisMap.size > 0 ? Array.from(evdLisMap.entries()).map(([supplier, items]) =>
            items.map(item => `<tr><td class="label" style="width:60%;">${item.qty.toFixed(2)} x ${item.service} (${supplier}):</td><td class="right">${numFormat(item.cost)}</td></tr>`).join('')
        ).join('') : `<tr><td class="label" style="width:60%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
        <div class="half-table">
            <div class="half-table-title">EVD Kunde</div>
            <table>
                ${evdKundeMap.size > 0 ? Array.from(evdKundeMap.entries()).map(([supplier, items]) =>
            items.map(item => `<tr><td class="label" style="width:60%;">${item.qty.toFixed(2)} x ${item.service} (${supplier}):</td><td class="right">${numFormat(item.cost)}</td></tr>`).join('')
        ).join('') : `<tr><td class="label" style="width:60%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
    </div>

    <div class="flex-tables">
        <div class="half-table">
            <div class="half-table-title">Material LiS</div>
            <table>
                ${materials.length > 0 ? materials.map((m: any) => `<tr><td class="label" style="width:50%;">${m.material_name}:</td><td class="right font-medium">${numFormat(m.total_cost)}</td></tr>`).join('') : `
                <tr><td class="label" style="width:50%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
        <div class="half-table">
            <div class="half-table-title">Material Kunde</div>
            <table>
                ${materials.length > 0 ? materials.map((m: any) => `<tr><td class="label" style="width:50%;">${m.material_name}:</td><td class="right font-medium">${numFormat(m.total_price)}</td></tr>`).join('') : `
                <tr><td class="label" style="width:50%;">&nbsp;</td><td class="right cur">- €</td></tr>`}
            </table>
        </div>
    </div>

    <table class="summary-table">
        <tr><td class="label">KV vorher</td><td class="val${isKvMode ? '' : ' cur'}">${isKvMode ? numFormat((Object.values(kvValues) as number[]).reduce((a: number, b: number) => a + b, 0)) : '- €'}</td></tr>
        <tr><td class="label">Nettoumsatz</td><td class="val">${numFormat(totalRevenue)}</td></tr>
        <tr class="total"><td class="label">Bruttoumsatz</td><td class="val">${numFormat(totalRevenue * 1.19)}</td></tr>
        <tr><td class="label">Gesamtkosten netto</td><td class="val">${numFormat(totalCosts)}</td></tr>
        <tr class="total"><td class="label">Nettoeinnahme</td><td class="val">${numFormat(margin)}</td></tr>
        <tr><td class="label">Prozent</td><td class="val" style="padding-top: 12px;"><span style="background-color:#86efac; color:#166534; padding:6px 12px; border-radius:4px; font-weight:700; font-size:14px; border:1px solid #4ade80;">${marginPct >= 0 || marginPct < 0 ? marginPct.toFixed(1) + '%' : '#DIV/0!'}</span></td></tr>
    </table>
</body></html>`;
}
