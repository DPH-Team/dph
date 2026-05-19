import { Badge } from '@/components/ui/badge';
import type { AppRole } from '@/lib/auth';

interface RoleBadgeProps {
  role: AppRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (role === 'admin') {
    return (
      <Badge
        variant="default"
        className={className}
        aria-label="Administrator role"
      >
        Admin
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={className}
      aria-label="Staff role"
    >
      Staff
    </Badge>
  );
}
