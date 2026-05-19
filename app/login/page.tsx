import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/auth';
import { Wordmark } from '@/components/marketing/Wordmark';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign In — District Pour Haus',
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next: rawNext } = await searchParams;

  // Validate the next URL — only accept /admin* paths to prevent open-redirect
  const safeNext =
    rawNext && rawNext.startsWith('/admin') ? rawNext : '/admin';

  // If already authenticated, skip the login form
  const user = await getSessionUser();
  if (user) {
    redirect(safeNext);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-lg">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-1">
          <Wordmark size="lg" tone="gold" asLink={false} />
          <p className="text-xs text-muted-foreground">Admin Portal</p>
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-center text-xl font-display font-semibold text-foreground">
          Sign in to your account
        </h1>

        {/* Form */}
        <LoginForm next={safeNext} />
      </div>

      {/* Subtle tagline */}
      <p className="mt-6 text-xs text-muted-foreground">
        Our Haus is Your Haus
      </p>
    </div>
  );
}
