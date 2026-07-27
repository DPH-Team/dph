/**
 * Canonical brand contact info for all transactional email templates.
 *
 * Single source of truth so the venue address, phone, and contact email
 * only ever need to change in one place — previously each template hardcoded
 * its own copy of the footer address, and they drifted out of sync.
 *
 * Deliberately self-contained (no imports from app/__fixtures__): the email
 * templates live in the lib layer and should not depend on app-layer fixtures.
 */

/** Street address + city/state/zip line shown in email footers. */
export const BRAND_ADDRESS = '686 Mike McCarthy Way, Green Bay, WI 54304';

/** Contact phone number shown in email footers. */
export const BRAND_PHONE = '(920) 278-2669';

/** Contact email address shown in email footers. */
export const BRAND_EMAIL = 'info@districtpourhaus.com';
