import { Metadata } from 'next';
import LeavePlannerClient from './LeavePlannerClient';

export const metadata: Metadata = {
    title: 'Urlaubs-/Terminplaner | Ars Mechanica',
    description: 'Urlaubs- und Terminverwaltung für Mitarbeiter.',
};

export default function LeavePlannerPage() {
    return <LeavePlannerClient />;
}
