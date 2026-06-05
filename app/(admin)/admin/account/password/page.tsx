import { requireStaff } from '@/lib/auth';
import { ChangePasswordForm } from './ChangePasswordForm';
import { changeOwnPasswordAction } from './actions';

export default async function ChangePasswordPage() {
  const profile = await requireStaff();

  return (
    <div className="space-y-6 max-w-md">
      <header>
        <h1 className="text-xl font-semibold text-foreground">
          Change your password
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your account requires a new password before you can continue. Please
          choose a strong password of at least 10 characters.
        </p>
      </header>

      <ChangePasswordForm
        action={changeOwnPasswordAction}
        userEmail={profile.email}
      />
    </div>
  );
}
