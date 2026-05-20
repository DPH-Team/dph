import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { getTeamMemberById } from '@/lib/db/queries/team-members';
import { updateTeamMemberAction } from '@/app/(admin)/admin/team/actions';
import { TeamMemberForm } from '@/app/(admin)/admin/team/TeamMemberForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamEditPage({ params }: PageProps) {
  await requireStaff();

  const { id } = await params;

  const member = await getTeamMemberById(id);

  if (!member) {
    notFound();
  }

  const boundAction = updateTeamMemberAction.bind(null, id);

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
          <span>{member.name}</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">{member.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Update this team member&apos;s details and photo.
        </p>
      </header>

      <TeamMemberForm mode="edit" member={member} action={boundAction} />
    </div>
  );
}
