import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InquiryStaffNotificationProps {
  name: string;
  email: string;
  phone?: string | null;
  type: string;
  partySize?: number | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  message: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const base = '#0E0E0F';
const copper = '#C97B4A';
const cream = '#F5EFE6';
const muted = '#6B6B6B';

const typeLabels: Record<string, string> = {
  reservation: 'Reservation',
  private_event: 'Private Event',
  press: 'Press',
  general: 'General',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InquiryStaffNotification({
  name,
  email,
  phone,
  type,
  partySize,
  preferredDate,
  preferredTime,
  message,
}: InquiryStaffNotificationProps) {
  const typeLabel = typeLabels[type] ?? type;

  return (
    <Html lang="en">
      <Head />
      <Preview>New {typeLabel} inquiry from {name}</Preview>
      <Body style={{ backgroundColor: '#F8F5F0', margin: '0', padding: '0', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: base, borderRadius: '8px', overflow: 'hidden' }}>
          {/* Header */}
          <Section style={{ backgroundColor: copper, padding: '20px 32px' }}>
            <Heading style={{ color: cream, fontSize: '18px', margin: '0', fontWeight: '700', letterSpacing: '0.02em' }}>
              District Pour Haus
            </Heading>
            <Text style={{ color: cream, fontSize: '13px', margin: '4px 0 0', opacity: 0.85 }}>
              New {typeLabel} Inquiry
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '24px 32px' }}>
            <Heading as="h2" style={{ color: cream, fontSize: '20px', margin: '0 0 20px', fontWeight: '600' }}>
              {name} sent a {typeLabel.toLowerCase()} inquiry
            </Heading>

            {/* Detail rows */}
            <Section style={{ backgroundColor: '#1A1A1B', borderRadius: '6px', padding: '16px 20px', marginBottom: '20px' }}>
              <DetailRow label="Name" value={name} />
              <DetailRow label="Email" value={email} />
              {phone && <DetailRow label="Phone" value={phone} />}
              <DetailRow label="Type" value={typeLabel} />
              {partySize != null && <DetailRow label="Party Size" value={String(partySize)} />}
              {preferredDate && <DetailRow label="Preferred Date" value={preferredDate} />}
              {preferredTime && <DetailRow label="Preferred Time" value={preferredTime} />}
            </Section>

            {/* Message */}
            <Text style={{ color: muted, fontSize: '12px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Message
            </Text>
            <Section style={{ backgroundColor: '#1A1A1B', borderRadius: '6px', padding: '16px 20px', marginBottom: '24px' }}>
              <Text style={{ color: cream, fontSize: '14px', lineHeight: '1.6', margin: '0', whiteSpace: 'pre-wrap' }}>
                {message}
              </Text>
            </Section>

            <Hr style={{ borderColor: '#2A2A2B', margin: '0 0 16px' }} />

            <Text style={{ color: muted, fontSize: '12px', margin: '0', textAlign: 'center' }}>
              Reply to this email to respond directly to {name}.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ marginBottom: '10px' }}>
      <Column style={{ width: '120px', verticalAlign: 'top' }}>
        <Text style={{ color: muted, fontSize: '12px', margin: '0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Text>
      </Column>
      <Column style={{ verticalAlign: 'top' }}>
        <Text style={{ color: cream, fontSize: '14px', margin: '0' }}>
          {value}
        </Text>
      </Column>
    </Row>
  );
}

export default InquiryStaffNotification;
