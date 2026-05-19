import { ComingSoonCard } from '@/components/admin/ComingSoonCard';

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage staff accounts, assign roles, and deactivate access when
          someone leaves the team.
        </p>
      </div>
      <ComingSoonCard section="User management" />
    </div>
  );
}
