/**
 * /sponsor/book — Book Appointment page
 */
import type { Metadata } from 'next';
import BookAppointmentForm from '../../../components/BookAppointmentForm';

export const metadata: Metadata = {
  title: 'Book Appointment — Preventia',
};

export default function BookAppointmentPage() {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px 32px' }}>
      <BookAppointmentForm />
    </div>
  );
}
