import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InquiryCustomerReplyProps {
  name: string;
  type: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const base = '#0E0E0F';
const copper = '#C97B4A';
const cream = '#F5EFE6';
const muted = '#6B6B6B';

const typeLabels: Record<string, string> = {
  reservation: 'reservation',
  private_event: 'private event',
  press: 'press inquiry',
  general: 'message',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InquiryCustomerReply({ name, type }: InquiryCustomerReplyProps) {
  const typeLabel = typeLabels[type] ?? 'inquiry';
  const firstName = name.split(' ')[0] ?? name;

  return (
    <Html lang="en">
      <Head />
      <Preview>We received your {typeLabel} — we&apos;ll be in touch soon.</Preview>
      <Body style={{ backgroundColor: '#F8F5F0', margin: '0', padding: '0', fontFamily: 'Inter, Arial, sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '32px auto', backgroundColor: base, borderRadius: '8px', overflow: 'hidden' }}>
          {/* Header */}
          <Section style={{ backgroundColor: copper, padding: '20px 32px' }}>
            <Heading style={{ color: cream, fontSize: '18px', margin: '0', fontWeight: '700', letterSpacing: '0.02em' }}>
              District Pour Haus
            </Heading>
            <Text style={{ color: cream, fontSize: '13px', margin: '4px 0 0', opacity: 0.85 }}>
              Our Haus is Your Haus
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '32px 32px 24px' }}>
            <Heading as="h2" style={{ color: cream, fontSize: '20px', margin: '0 0 16px', fontWeight: '600' }}>
              Hey {firstName}, we got it.
            </Heading>

            <Text style={{ color: cream, fontSize: '15px', lineHeight: '1.7', margin: '0 0 16px' }}>
              Thanks for reaching out about your {typeLabel}. We received your request and we&apos;ll email you back within one business day to confirm the details.
            </Text>

            <Text style={{ color: cream, fontSize: '15px', lineHeight: '1.7', margin: '0 0 24px' }}>
              In the meantime, feel free to check out our tap list or take a look at what&apos;s coming up — we&apos;d love to see you at the haus.
            </Text>

            <Hr style={{ borderColor: '#2A2A2B', margin: '0 0 24px' }} />

            <Text style={{ color: muted, fontSize: '13px', lineHeight: '1.6', margin: '0' }}>
              District Pour Haus · 2331 University Blvd W, Wheaton, MD 20902
            </Text>
            <Text style={{ color: muted, fontSize: '13px', margin: '4px 0 0' }}>
              Questions? Just reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default InquiryCustomerReply;
