import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { listTeamMembers } from '@/lib/db/queries/team-members';
import { Button } from '@/components/ui/button';
import { TeamList } from './TeamList';

export default async function TeamPage() {
  await requireStaff();

  const members = await listTeamMembers();

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team members shown on the public About page. Drag to reorder.
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/admin/team/new" />}
        >
          + Add team member
        </Button>
      </header>

      <TeamList initialMembers={members} />
    </div>
  );
}
