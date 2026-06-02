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

export interface CareerCustomerReplyProps {
  applicantName: string;
  positionTitle: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const base = '#0E0E0F';
const copper = '#C97B4A';
const cream = '#F5EFE6';
const muted = '#6B6B6B';

// ─── Component ────────────────────────────────────────────────────────────────

export function CareerCustomerReply({
  applicantName,
  positionTitle,
}: CareerCustomerReplyProps) {
  const firstName = applicantName.split(' ')[0] ?? applicantName;

  return (
    <Html lang="en">
      <Head />
      <Preview>
        We received your application for {positionTitle} — thanks for reaching
        out.
      </Preview>
      <Body
        style={{
          backgroundColor: '#F8F5F0',
          margin: '0',
          padding: '0',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '32px auto',
            backgroundColor: base,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Section style={{ backgroundColor: copper, padding: '20px 32px' }}>
            <Heading
              style={{
                color: cream,
                fontSize: '18px',
                margin: '0',
                fontWeight: '700',
                letterSpacing: '0.02em',
              }}
            >
              District Pour Haus
            </Heading>
            <Text
              style={{
                color: cream,
                fontSize: '13px',
                margin: '4px 0 0',
                opacity: 0.85,
              }}
            >
              Our Haus is Your Haus
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '32px 32px 24px' }}>
            <Heading
              as="h2"
              style={{
                color: cream,
                fontSize: '20px',
                margin: '0 0 16px',
                fontWeight: '600',
              }}
            >
              Hey {firstName}, we got your application.
            </Heading>

            <Text
              style={{
                color: cream,
                fontSize: '15px',
                lineHeight: '1.7',
                margin: '0 0 16px',
              }}
            >
              Thanks for applying for the{' '}
              <span style={{ color: copper, fontWeight: '600' }}>
                {positionTitle}
              </span>{' '}
              position. We received your application and our team will review it
              shortly.
            </Text>

            <Text
              style={{
                color: cream,
                fontSize: '15px',
                lineHeight: '1.7',
                margin: '0 0 24px',
              }}
            >
              If there&apos;s a good fit, we&apos;ll be in touch. In the
              meantime, feel free to come in and say hello — the haus is always
              open.
            </Text>

            <Hr style={{ borderColor: '#2A2A2B', margin: '0 0 24px' }} />

            <Text
              style={{
                color: muted,
                fontSize: '13px',
                lineHeight: '1.6',
                margin: '0',
              }}
            >
              District Pour Haus · 2331 University Blvd W, Wheaton, MD 20902
            </Text>
            <Text
              style={{ color: muted, fontSize: '13px', margin: '4px 0 0' }}
            >
              Questions? Just reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default CareerCustomerReply;
