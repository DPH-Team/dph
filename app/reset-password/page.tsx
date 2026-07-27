import type { Metadata } from 'next';
import { Wordmark } from '@/components/marketing/Wordmark';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set New Password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
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
        <h1 className="mb-6 text-center text-xl font-display font-semibold text-foreground">
          Set a new password
        </h1>

        {/* Form */}
        <ResetPasswordForm />
      </div>

      {/* Subtle tagline */}
      <p className="mt-6 text-xs text-muted-foreground">Our Haus is Your Haus</p>
    </div>
  );
}
