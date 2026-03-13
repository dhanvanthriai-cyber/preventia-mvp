/**
 * /sponsor/book — Book Appointment page
 */
import type { Metadata } from 'next';
import BookAppointmentForm from '../../../components/BookAppointmentForm';

export const metadata: Metadata = {
  title: 'Book Appointment — Dhanvanthri',
};

export default function BookAppointmentPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 0' }}>
      <BookAppointmentForm />
    </div>
  );
}
