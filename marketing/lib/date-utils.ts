import { isValid, parseISO } from 'date-fns';

export function parseValidDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;

    const date = value instanceof Date
        ? value
        : /^\d{4}-\d{2}-\d{2}$/.test(value)
            ? parseISO(value)
            : new Date(value);

    return isValid(date) ? date : null;
}
