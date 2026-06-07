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

export interface InquiryCustomerReplyProps {
  name: string;
  type: string;
  /** Base URL of the public site, used for CTA links. */
  siteUrl: string;
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

const typeLabels: Record<string, string> = {
  reservation: 'reservation',
  private_event: 'private event',
  press: 'press inquiry',
  general: 'message',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function InquiryCustomerReply({ name, type, siteUrl }: InquiryCustomerReplyProps) {
  const typeLabel = typeLabels[type] ?? 'inquiry';
  const firstName = name.split(' ')[0] ?? name;

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
      <Preview>We got your {typeLabel} — we&apos;ll be in touch within one business day.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Copper top-accent bar */}
          <Section style={{ backgroundColor: copper, height: '4px', lineHeight: '4px', fontSize: '1px' }}>
            <Text style={{ margin: '0', fontSize: '1px', lineHeight: '4px' }}>&nbsp;</Text>
          </Section>

          <BrandHeader tagline="Our Haus is Your Haus" />

          {/* Body */}
          <Section style={{ padding: '36px 40px 8px' }}>
            <Text style={eyebrowStyle}>We got it</Text>

            <Heading as="h2" style={displayHeadingStyle}>
              Hey {firstName}, thanks for reaching out.
            </Heading>

            <Text style={leadStyle}>
              Your {typeLabel} just landed in our inbox. A real person on our team will
              read it and email you back within one business day to sort out the details —
              no automated runaround.
            </Text>

            <Text style={bodyTextStyle}>
              While you wait, pull up a stool. Take a peek at what&apos;s pouring or see what
              we&apos;ve got coming up. We&apos;d love to see you at the haus.
            </Text>
          </Section>

          {/* CTA buttons */}
          <Section style={{ padding: '8px 40px 28px' }}>
            <Row>
              <Column style={{ paddingRight: '6px' }}>
                <Button href={`${siteUrl}/taps`} style={primaryButtonStyle}>
                  View the tap list
                </Button>
              </Column>
              <Column style={{ paddingLeft: '6px' }}>
                <Button href={`${siteUrl}/events`} style={secondaryButtonStyle}>
                  See what&apos;s on
                </Button>
              </Column>
            </Row>
          </Section>

          <BrandFooter />
        </Container>
      </Body>
    </Html>
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
      <Text style={footerMutedStyle}>
        Questions? Just reply to this email — it goes straight to us.
      </Text>
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
  margin: '0 0 14px',
};

const displayHeadingStyle: React.CSSProperties = {
  color: cream,
  fontFamily: serif,
  fontSize: '27px',
  lineHeight: '1.25',
  fontWeight: 500,
  margin: '0 0 18px',
};

const leadStyle: React.CSSProperties = {
  color: cream,
  fontFamily: sans,
  fontSize: '16px',
  lineHeight: '1.7',
  margin: '0 0 16px',
};

const bodyTextStyle: React.CSSProperties = {
  color: '#CFC9BF',
  fontFamily: sans,
  fontSize: '15px',
  lineHeight: '1.7',
  margin: '0 0 8px',
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: copper,
  color: '#1A1208',
  borderRadius: '8px',
  padding: '13px 18px',
  fontFamily: sans,
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: surface,
  color: cream,
  border: `1px solid ${hairline}`,
  borderRadius: '8px',
  padding: '12px 18px',
  fontFamily: sans,
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
};

const hrStyle: React.CSSProperties = {
  borderColor: hairline,
  borderTopWidth: '1px',
  margin: '0 0 22px',
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
  color: muted,
  fontFamily: sans,
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
};

export default InquiryCustomerReply;
