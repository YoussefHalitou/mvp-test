import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { parseValidDate } from '@/lib/date-utils';

export function getSnapshotExecutionDate(snapshot: any): string | null {
    return snapshot?.executionDate
        || snapshot?.executionDates?.[0]
        || snapshot?.project?.project_date
        || null;
}

export function getSnapshotExecutionDateLabel(snapshot: any): string {
    if (snapshot?.executionDateLabel) return snapshot.executionDateLabel;

    const date = parseValidDate(getSnapshotExecutionDate(snapshot));
    return date ? format(date, 'dd.MM.yyyy', { locale: de }) : '';
}
