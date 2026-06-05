import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createUserAction } from '@/app/(admin)/admin/users/actions';
import { CreateUserForm } from './CreateUserForm';

export default async function UserNewPage() {
  await requireAdmin();

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link
            href="/admin/users"
            className="hover:text-foreground transition-colors"
          >
            Users
          </Link>
          {' › '}
          <span>New user</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">New user</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create a staff or admin account. The user will be prompted to change
          their temporary password on first login.
        </p>
      </header>

      <CreateUserForm action={createUserAction} />
    </div>
  );
}
