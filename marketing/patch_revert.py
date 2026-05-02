import re

file_path = '/Users/youssef/mvp-test/marketing/app/(dashboard)/tracking/TrackingClient.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Revert the value changes to restore the `=== 0 ? '' : ` behavior for initial 0s
content = content.replace("value={row.pause_min ?? ''}", "value={row.pause_min === 0 ? '' : (row.pause_min ?? '')}")
content = content.replace("value={row.quantity ?? ''}", "value={row.quantity === 0 ? '' : (row.quantity ?? '')}")
content = content.replace("value={row.cost ?? ''}", "value={row.cost === 0 ? '' : (row.cost ?? '')}")
content = content.replace("value={waForm.break_minutes ?? ''}", "value={waForm.break_minutes === 0 ? '' : (waForm.break_minutes ?? '')}")
content = content.replace("value={waForm.hours_estimated ?? ''}", "value={waForm.hours_estimated === 0 ? '' : (waForm.hours_estimated ?? '')}")

with open(file_path, 'w') as f:
    f.write(content)

