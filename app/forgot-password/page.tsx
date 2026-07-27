import type { Metadata } from 'next';
import { Wordmark } from '@/components/marketing/Wordmark';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset Password',
  robots: { index: false, follow: false },
};

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-1">
          <Wordmark size="lg" asLink={false} />
          <p className="text-xs text-muted-foreground">Admin Portal</p>
        </div>

        {/* Heading */}
        <h1 className="mb-2 text-center text-xl font-display font-semibold text-foreground">
          Reset your password
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {/* Expired link notice */}
        {error === 'expired' && (
          <p
            role="alert"
            className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            That reset link expired. Request a new one below.
          </p>
        )}

        {/* Form */}
        <ForgotPasswordForm />
      </div>

      {/* Subtle tagline */}
      <p className="mt-6 text-xs text-muted-foreground">Our Haus is Your Haus</p>
    </div>
  );
}
