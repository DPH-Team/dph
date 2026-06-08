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
  Link,
  Preview,
  Section,
  Text,
} from 'react-email';
import * as React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewsletterConfirmProps {
  /** ${siteUrl}/newsletter/confirm?token=${confirmToken} */
  confirmUrl: string;
  /** ${siteUrl}/newsletter/unsubscribe?token=${unsubscribeToken} */
  unsubscribeUrl: string;
  /** Base URL of the public site (no trailing slash). */
  siteUrl: string;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

const base = '#0E0E0F';
const copper = '#C97B4A';
const cream = '#F5EFE6';
const muted = '#8A8A8A';
const hairline = '#2A2A2B';
const page = '#F8F5F0';

const serif = 'Georgia, "Times New Roman", serif';
const sans = 'Inter, Helvetica, Arial, sans-serif';

// ─── Component ────────────────────────────────────────────────────────────────

export function NewsletterConfirm({ confirmUrl, unsubscribeUrl, siteUrl }: NewsletterConfirmProps) {
  return (
    <Html lang="en">
      <Head>
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
      <Preview>One more tap to pull — confirm your subscription to District Pour Haus.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Copper top-accent bar */}
          <Section style={{ backgroundColor: copper, height: '4px', lineHeight: '4px', fontSize: '1px' }}>
            <Text style={{ margin: '0', fontSize: '1px', lineHeight: '4px' }}>&nbsp;</Text>
          </Section>

          <BrandHeader tagline="Our Haus is Your Haus" siteUrl={siteUrl} />

          {/* Body */}
          <Section style={{ padding: '36px 40px 8px' }}>
            <Text style={eyebrowStyle}>Almost there</Text>

            <Heading as="h2" style={displayHeadingStyle}>
              One more tap to pull.
            </Heading>

            <Text style={leadStyle}>
              You signed up to hear from District Pour Haus — tap rotations, upcoming
              events, and whatever else is happening at the Haus. We just need you to
              confirm your email before we add you to the list.
            </Text>

            <Text style={bodyTextStyle}>
              Hit the button below and you&apos;re in. It takes about two seconds.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={{ padding: '8px 40px 32px' }}>
            <Button href={confirmUrl} style={primaryButtonStyle}>
              Confirm my subscription
            </Button>
          </Section>

          {/* Ignore note */}
          <Section style={{ padding: '0 40px 12px' }}>
            <Text style={ignoreTextStyle}>
              If you didn&apos;t sign up, just ignore this — you won&apos;t hear from us again.
            </Text>
          </Section>

          <BrandFooter unsubscribeUrl={unsubscribeUrl} />
        </Container>
      </Body>
    </Html>
  );
}

// ─── Shared partials ──────────────────────────────────────────────────────────

function BrandHeader({ tagline, siteUrl }: { tagline: string; siteUrl: string }) {
  const logoUrl = `${siteUrl}/brand/logo.png`;

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

function BrandFooter({ unsubscribeUrl }: { unsubscribeUrl: string }) {
  return (
    <Section style={{ padding: '0 40px 36px' }}>
      <Hr style={hrStyle} />
      <Text style={footerBrandStyle}>District Pour Haus</Text>
      <Text style={footerTextStyle}>2331 University Blvd W, Wheaton, MD 20902</Text>
      <Text style={footerMutedStyle}>
        You&apos;re receiving this because you signed up at districtpourhaus.com.{' '}
        <Link href={unsubscribeUrl} style={unsubscribeLinkStyle}>
          Unsubscribe
        </Link>
        .
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
  padding: '14px 28px',
  fontFamily: sans,
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  textAlign: 'center',
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
};

const ignoreTextStyle: React.CSSProperties = {
  color: muted,
  fontFamily: sans,
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
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

const unsubscribeLinkStyle: React.CSSProperties = {
  color: copper,
  textDecoration: 'underline',
};

export default NewsletterConfirm;
