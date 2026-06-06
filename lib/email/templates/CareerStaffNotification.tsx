import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from 'react-email';
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

// ─── Tokens ───────────────────────────────────────────────────────────────────

const base = '#0E0E0F';
const surface = '#161617';
const copper = '#C97B4A';
const cream = '#F5EFE6';
const muted = '#8A8A8A';
const hairline = '#2A2A2B';
const page = '#F8F5F0';

const serif = 'Fraunces, Georgia, "Times New Roman", serif';
const sans = 'Inter, Helvetica, Arial, sans-serif';

// ─── Component ────────────────────────────────────────────────────────────────

export function CareerStaffNotification({
  applicantName,
  applicantEmail,
  applicantPhone,
  positionTitle,
  message,
  resumeDownloadUrl,
}: CareerStaffNotificationProps) {
  const firstName = applicantName.split(' ')[0] ?? applicantName;

  const details: { label: string; value: string }[] = [
    { label: 'Name', value: applicantName },
    { label: 'Email', value: applicantEmail },
    ...(applicantPhone ? [{ label: 'Phone', value: applicantPhone }] : []),
    { label: 'Position', value: positionTitle },
  ];

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Fraunces"
          fallbackFontFamily={['Georgia', 'Times New Roman', 'serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/fraunces/v31/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9thS9zKlA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        New application for {positionTitle} from {applicantName}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Copper top-accent bar */}
          <Section style={{ backgroundColor: copper, height: '4px', lineHeight: '4px', fontSize: '1px' }}>
            <Text style={{ margin: '0', fontSize: '1px', lineHeight: '4px' }}>&nbsp;</Text>
          </Section>

          <BrandHeader tagline="New Career Application" />

          {/* Body */}
          <Section style={{ padding: '34px 40px 8px' }}>
            <Text style={eyebrowStyle}>Inbound</Text>
            <Heading as="h2" style={displayHeadingStyle}>
              {applicantName} applied for {positionTitle}.
            </Heading>
          </Section>

          {/* Detail block */}
          <Section style={{ padding: '0 40px' }}>
            <Section style={detailCardStyle}>
              {details.map((d, i) => (
                <DetailRow
                  key={d.label}
                  label={d.label}
                  value={d.value}
                  last={i === details.length - 1}
                />
              ))}
            </Section>
          </Section>

          {/* Message / cover letter */}
          <Section style={{ padding: '26px 40px 0' }}>
            <Text style={sectionLabelStyle}>Application Details</Text>
            <Section style={messageCardStyle}>
              <Text style={messageTextStyle}>{message}</Text>
            </Section>
          </Section>

          {/* Resume download */}
          {resumeDownloadUrl && (
            <Section style={{ padding: '24px 40px 0', textAlign: 'center' }}>
              <Button href={resumeDownloadUrl} style={primaryButtonStyle}>
                Download resume →
              </Button>
              <Text style={resumeNoteStyle}>This secure link expires in 7 days.</Text>
            </Section>
          )}

          {/* Reply note */}
          <Section style={{ padding: '24px 40px 0' }}>
            <Hr style={hrStyle} />
            <Text style={replyNoteStyle}>
              Want to reach out? Just reply to this email — it goes straight to {firstName}.
            </Text>
          </Section>

          <BrandFooter />
        </Container>
      </Body>
    </Html>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <Row>
      <Column style={{ width: '128px', verticalAlign: 'top', padding: last ? '0' : '0 0 12px' }}>
        <Text style={detailLabelStyle}>{label}</Text>
      </Column>
      <Column style={{ verticalAlign: 'top', padding: last ? '0' : '0 0 12px' }}>
        <Text style={detailValueStyle}>{value}</Text>
      </Column>
    </Row>
  );
}

// ─── Shared partials ────────────────────────────────────────────────────────

function BrandHeader({ tagline }: { tagline: string }) {
  const logoUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://districtpourhaus.com').replace(/\/$/, '')}/brand/logo.png`;

  return (
    <Section style={{ padding: '34px 40px 22px', textAlign: 'center' }}>
      <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={logoChipTableStyle}>
        <tbody>
          <tr>
            <td style={logoChipCellStyle}>
              <Img
                src={logoUrl}
                alt="District Pour Haus"
                width={140}
                height={110}
                style={{ display: 'block', margin: '0 auto' }}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <Section style={{ margin: '16px auto 0', width: '40px' }}>
        <Section style={{ backgroundColor: copper, height: '2px', lineHeight: '2px', fontSize: '1px' }}>
          <Text style={{ margin: '0', fontSize: '1px', lineHeight: '2px' }}>&nbsp;</Text>
        </Section>
      </Section>
      <Text style={taglineStyle}>{tagline}</Text>
    </Section>
  );
}

function BrandFooter() {
  return (
    <Section style={{ padding: '0 40px 36px' }}>
      <Hr style={hrStyle} />
      <Text style={footerBrandStyle}>District Pour Haus</Text>
      <Text style={footerTextStyle}>2331 University Blvd W, Wheaton, MD 20902</Text>
      <Text style={footerMutedStyle}>Our Haus is Your Haus</Text>
    </Section>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: page,
  margin: '0',
  padding: '0',
  fontFamily: sans,
};

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '40px auto',
  backgroundColor: base,
  borderRadius: '14px',
  overflow: 'hidden',
};

const logoChipTableStyle: React.CSSProperties = {
  margin: '0 auto',
  borderCollapse: 'separate',
};

const logoChipCellStyle: React.CSSProperties = {
  backgroundColor: cream,
  borderRadius: '10px',
  padding: '14px 20px',
  textAlign: 'center',
};

const taglineStyle: React.CSSProperties = {
  color: copper,
  fontFamily: sans,
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  margin: '14px 0 0',
};

const eyebrowStyle: React.CSSProperties = {
  color: copper,
  fontFamily: sans,
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  margin: '0 0 12px',
};

const displayHeadingStyle: React.CSSProperties = {
  color: cream,
  fontFamily: serif,
  fontSize: '25px',
  lineHeight: '1.3',
  fontWeight: 500,
  margin: '0',
};

const detailCardStyle: React.CSSProperties = {
  backgroundColor: surface,
  border: `1px solid ${hairline}`,
  borderRadius: '10px',
  padding: '20px 22px',
};

const detailLabelStyle: React.CSSProperties = {
  color: muted,
  fontFamily: sans,
  fontSize: '11px',
  fontWeight: 600,
  margin: '0',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
};

const detailValueStyle: React.CSSProperties = {
  color: cream,
  fontFamily: sans,
  fontSize: '15px',
  lineHeight: '1.4',
  margin: '0',
};

const sectionLabelStyle: React.CSSProperties = {
  color: muted,
  fontFamily: sans,
  fontSize: '11px',
  fontWeight: 600,
  margin: '0 0 10px',
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
};

const messageCardStyle: React.CSSProperties = {
  backgroundColor: surface,
  border: `1px solid ${hairline}`,
  borderRadius: '10px',
  padding: '20px 22px',
};

const messageTextStyle: React.CSSProperties = {
  color: cream,
  fontFamily: sans,
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0',
  whiteSpace: 'pre-wrap',
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: copper,
  color: '#1A1208',
  borderRadius: '8px',
  padding: '14px 30px',
  fontFamily: sans,
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
};

const resumeNoteStyle: React.CSSProperties = {
  color: muted,
  fontFamily: sans,
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '12px 0 0',
};

const hrStyle: React.CSSProperties = {
  borderColor: hairline,
  borderTopWidth: '1px',
  margin: '0 0 18px',
};

const replyNoteStyle: React.CSSProperties = {
  color: muted,
  fontFamily: sans,
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
  textAlign: 'center',
};

const footerBrandStyle: React.CSSProperties = {
  color: cream,
  fontFamily: serif,
  fontSize: '15px',
  fontWeight: 500,
  letterSpacing: '0.01em',
  margin: '0 0 4px',
};

const footerTextStyle: React.CSSProperties = {
  color: muted,
  fontFamily: sans,
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0 0 10px',
};

const footerMutedStyle: React.CSSProperties = {
  color: copper,
  fontFamily: sans,
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  margin: '0',
};

export default CareerStaffNotification;
