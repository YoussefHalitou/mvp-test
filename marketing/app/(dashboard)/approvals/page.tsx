import { Metadata } from 'next';
import ApprovalsClient from './ApprovalsClient';

export const metadata: Metadata = {
    title: 'Freigaben | Land in Sicht',
};

export default function ApprovalsPage() {
    return <ApprovalsClient />;
}
