import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createTeamMemberAction } from '@/app/(admin)/admin/team/actions';
import { TeamMemberForm } from '@/app/(admin)/admin/team/TeamMemberForm';

export default async function TeamNewPage() {
  await requireStaff();

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link
            href="/admin/team"
            className="hover:text-foreground transition-colors"
          >
            Team
          </Link>
          {' › '}
          <span>Add team member</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">
          Add team member
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add a new member to the team shown on the public About page.
        </p>
      </header>

      <TeamMemberForm mode="create" action={createTeamMemberAction} />
    </div>
  );
}
