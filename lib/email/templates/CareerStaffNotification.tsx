import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CareerStaffNotificationProps {
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string | null;
  positionTitle: string;
  message: string;
  /** Signed download URL for the resume (7-day TTL). */
  resumeDownloadUrl?: string | null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const base = '#0E0E0F';
const copper = '#C97B4A';
const cream = '#F5EFE6';
const muted = '#6B6B6B';

// ─── Component ────────────────────────────────────────────────────────────────

export function CareerStaffNotification({
  applicantName,
  applicantEmail,
  applicantPhone,
  positionTitle,
  message,
  resumeDownloadUrl,
}: CareerStaffNotificationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        New application for {positionTitle} from {applicantName}
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
              New Career Application
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '24px 32px' }}>
            <Heading
              as="h2"
              style={{
                color: cream,
                fontSize: '20px',
                margin: '0 0 20px',
                fontWeight: '600',
              }}
            >
              {applicantName} applied for {positionTitle}
            </Heading>

            {/* Applicant details */}
            <Section
              style={{
                backgroundColor: '#1A1A1B',
                borderRadius: '6px',
                padding: '16px 20px',
                marginBottom: '20px',
              }}
            >
              <DetailRow label="Name" value={applicantName} />
              <DetailRow label="Email" value={applicantEmail} />
              {applicantPhone && (
                <DetailRow label="Phone" value={applicantPhone} />
              )}
              <DetailRow label="Position" value={positionTitle} />
            </Section>

            {/* Message / cover letter */}
            <Text
              style={{
                color: muted,
                fontSize: '12px',
                margin: '0 0 6px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Application Details
            </Text>
            <Section
              style={{
                backgroundColor: '#1A1A1B',
                borderRadius: '6px',
                padding: '16px 20px',
                marginBottom: '24px',
              }}
            >
              <Text
                style={{
                  color: cream,
                  fontSize: '14px',
                  lineHeight: '1.6',
                  margin: '0',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message}
              </Text>
            </Section>

            {/* Resume download */}
            {resumeDownloadUrl && (
              <Section style={{ marginBottom: '24px' }}>
                <Link
                  href={resumeDownloadUrl}
                  style={{
                    display: 'inline-block',
                    backgroundColor: copper,
                    color: cream,
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                >
                  Download Resume
                </Link>
                <Text
                  style={{
                    color: muted,
                    fontSize: '12px',
                    margin: '8px 0 0',
                  }}
                >
                  This link expires in 7 days.
                </Text>
              </Section>
            )}

            <Hr style={{ borderColor: '#2A2A2B', margin: '0 0 16px' }} />

            <Text
              style={{ color: muted, fontSize: '12px', margin: '0', textAlign: 'center' }}
            >
              Reply to this email to respond directly to {applicantName}.
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
        <Text
          style={{
            color: muted,
            fontSize: '12px',
            margin: '0',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
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

export default CareerStaffNotification;
