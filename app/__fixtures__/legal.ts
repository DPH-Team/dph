import type { LegalDoc } from "@/lib/fixtures/types"

const privacyParagraphs: string[] = [
  "District Pour Haus, LLC ('District Pour Haus,' 'we,' 'us,' or 'our') respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at districtpourhaus.com, use our online reservation and inquiry forms, or otherwise interact with us digitally.",
  "We may collect information you provide directly to us, including your name, email address, phone number, party size, preferred dates and times, and any other information you choose to include in inquiry or reservation forms. We do not collect payment information directly — payments processed through our self-pour RFID system are handled by our payment processor.",
  "We use the information we collect to respond to your inquiries and reservation requests, communicate updates about your reservation or event, send our monthly newsletter if you have opted in, and improve our services.",
  "We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. We may share information with service providers who assist us in operating our website and conducting our business, so long as those parties agree to keep this information confidential.",
  "We implement a variety of security measures to maintain the safety of your personal information. All supplied information is transmitted via Secure Socket Layer (SSL) technology.",
  "Our website may contain links to third-party sites including our Printify store, Untappd, and social media platforms. These sites have their own privacy policies and we bear no responsibility for their content or practices.",
  "You may opt out of receiving newsletter emails at any time by clicking the unsubscribe link in any email we send, or by contacting us directly at info@districtpourhaus.com. You may also contact us to request access to, correction of, or deletion of any personal data we hold about you.",
  "We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the 'Last Updated' date at the top of this page. Your continued use of our website following any changes constitutes your acceptance of the revised policy.",
  "If you have questions about this Privacy Policy, please contact us at: District Pour Haus, LLC · 686 Mike McCarthy Way, Green Bay, WI 54304 · info@districtpourhaus.com · (920) 278-2669.",
]

const termsParagraphs: string[] = [
  "By accessing and using the District Pour Haus website at districtpourhaus.com, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use this website.",
  "The content on this site — including text, graphics, logos, and images — is the property of District Pour Haus, LLC and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.",
  "All reservation and inquiry submissions are subject to availability and confirmation by our staff. A submission does not guarantee a confirmed reservation. We will contact you within one business day to confirm or propose alternatives.",
  "District Pour Haus reserves the right to refuse service to any person. Consumption of alcoholic beverages requires valid government-issued photo identification confirming age 21 or older. We enforce responsible consumption policies and may decline to serve any guest who appears intoxicated.",
  "The self-pour RFID system charges by the ounce as poured. All sales are final once a pour is initiated. Unused card balances at the end of a visit are refunded in full. We are not responsible for over-pouring by guests.",
  "Our website and its contents are provided 'as is' without warranty of any kind. We make no representations about the accuracy or completeness of the information on the site. Menu items, tap list, hours, and events are subject to change without notice.",
  "District Pour Haus shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of this website or our services. Our liability for any claim arising out of your use of our services shall not exceed the amount paid by you for the specific service giving rise to the claim.",
  "These terms shall be governed by the laws of the State of Wisconsin. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the state and federal courts located in Brown County, Wisconsin.",
  "We reserve the right to modify these Terms at any time. Material changes will be noted by an updated 'Last Updated' date. Continued use of the site after changes constitutes acceptance of the revised terms.",
  "For questions about these Terms of Use, contact us at: District Pour Haus, LLC · 686 Mike McCarthy Way, Green Bay, WI 54304 · info@districtpourhaus.com.",
]

export const legalDocs: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    updatedAt: "2026-01-15",
    paragraphs: privacyParagraphs,
  },
  {
    slug: "terms",
    title: "Terms of Use",
    updatedAt: "2026-01-15",
    paragraphs: termsParagraphs,
  },
]

export async function getLegalDoc(slug: "privacy" | "terms"): Promise<LegalDoc | undefined> {
  return legalDocs.find((d) => d.slug === slug)
}
