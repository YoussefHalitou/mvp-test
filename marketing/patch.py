import re

file_path = '/Users/youssef/mvp-test/marketing/app/(dashboard)/tracking/TrackingClient.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace values
content = content.replace("value={row.pause_min === 0 ? '' : (row.pause_min ?? '')}", "value={row.pause_min ?? ''}")
content = content.replace("value={row.quantity === 0 ? '' : (row.quantity ?? '')}", "value={row.quantity ?? ''}")
content = content.replace("value={row.cost === 0 ? '' : (row.cost ?? '')}", "value={row.cost ?? ''}")
content = content.replace("value={waForm.break_minutes === 0 ? '' : (waForm.break_minutes ?? '')}", "value={waForm.break_minutes ?? ''}")
content = content.replace("value={waForm.hours_estimated === 0 ? '' : (waForm.hours_estimated ?? '')}", "value={waForm.hours_estimated ?? ''}")

# Replace onChanges
content = content.replace("e.target.value === '' ? 0 : parseInt(e.target.value)", "e.target.value")
content = content.replace("e.target.value === '' ? 0 : parseFloat(e.target.value)", "e.target.value")

# DB payload replacements
content = content.replace(
    "project_id: projectId, material_id: r.material_id, quantity: r.quantity,",
    "project_id: projectId, material_id: r.material_id, quantity: Number(r.quantity) || 0,"
)
content = content.replace(
    "update({ quantity: r.quantity }).eq('id', r.id)",
    "update({ quantity: Number(r.quantity) || 0 }).eq('id', r.id)"
)
content = content.replace(
    "project_id: projectId, service_id: r.service_id, quantity: r.quantity,",
    "project_id: projectId, service_id: r.service_id, quantity: Number(r.quantity) || 0,"
)
content = content.replace(
    "update({ quantity: r.quantity, supplier: r.supplier || null }).eq('id', r.id)",
    "update({ quantity: Number(r.quantity) || 0, supplier: r.supplier || null }).eq('id', r.id)"
)
content = content.replace(
    "cost_type: r.cost_type, description: r.description, cost: r.cost,",
    "cost_type: r.cost_type, description: r.description, cost: Number(r.cost) || 0,"
)
content = content.replace(
    "update({ cost_type: r.cost_type, description: r.description, cost: r.cost }).eq('id', r.id)",
    "update({ cost_type: r.cost_type, description: r.description, cost: Number(r.cost) || 0 }).eq('id', r.id)"
)
content = content.replace(
    "break_minutes: waForm.break_minutes,",
    "break_minutes: Number(waForm.break_minutes) || 0,"
)
content = content.replace(
    "hours_estimated: waForm.hours_estimated,",
    "hours_estimated: Number(waForm.hours_estimated) || 0,"
)

# Replace pause_min in handleSave
content = re.sub(
    r"pause_min: row\.pause_min,",
    r"pause_min: Number(row.pause_min) || 0,",
    content
)


with open(file_path, 'w') as f:
    f.write(content)

