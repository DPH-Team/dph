'use client';

import type { ActionState } from '@/components/admin/ResourceForm';
import { ResourceForm } from '@/components/admin/ResourceForm';
import { CoverImageInput } from '@/components/admin/CoverImageInput';
import {
  teamMemberCreateSchema,
  teamMemberUpdateSchema,
} from '@/lib/validators/team';
import type { TeamMember } from '@/lib/db/schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMemberFormCreateProps {
  mode: 'create';
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

interface TeamMemberFormEditProps {
  mode: 'edit';
  member: TeamMember;
  action: (
    state: ActionState | undefined,
    formData: FormData,
  ) => Promise<ActionState>;
}

type TeamMemberFormProps = TeamMemberFormCreateProps | TeamMemberFormEditProps;

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamMemberForm(props: TeamMemberFormProps) {
  const isEdit = props.mode === 'edit';
  const member = isEdit ? props.member : null;

  const schema = isEdit ? teamMemberUpdateSchema : teamMemberCreateSchema;

  const defaultValues = {
    name: member?.name ?? '',
    role: member?.role ?? '',
    bio: member?.bio ?? '',
    imagePath: member?.imagePath ?? '',
    sortOrder: member?.sortOrder ?? 0,
  };

  return (
    <ResourceForm
      schema={schema}
      defaultValues={defaultValues}
      action={props.action}
      submitLabel={isEdit ? 'Save changes' : 'Add team member'}
      cancelHref="/admin/team"
    >
      <ResourceForm.Section title="Photo">
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none">
            Profile photo
          </label>
          <p className="text-xs text-muted-foreground">
            Optional. Shown on the public About page.
          </p>
          <CoverImageInput
            name="imagePath"
            kind="team"
            defaultPath={member?.imagePath ?? null}
            aspect="square"
          />
        </div>
      </ResourceForm.Section>

      <ResourceForm.Section title="Details">
        <ResourceForm.Field name="name" label="Name" required>
          <ResourceForm.TextInput
            name="name"
            placeholder="e.g. Jordan Smith"
            maxLength={120}
          />
        </ResourceForm.Field>

        <ResourceForm.Field
          name="role"
          label="Role"
          description="Their job title or function at District Pour Haus."
          required
        >
          <ResourceForm.TextInput
            name="role"
            placeholder="e.g. Head Bartender"
            maxLength={120}
          />
        </ResourceForm.Field>

        <ResourceForm.Field
          name="bio"
          label="Bio"
          description="Short bio shown on the About page. Max 1 000 characters."
        >
          <ResourceForm.Textarea
            name="bio"
            placeholder="Write a short bio…"
            maxLength={1000}
            rows={4}
          />
        </ResourceForm.Field>
      </ResourceForm.Section>

      <ResourceForm.Section title="Display">
        <ResourceForm.Field
          name="sortOrder"
          label="Sort order"
          description="Members with a lower number appear first."
        >
          <ResourceForm.TextInput
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            className="w-32"
          />
        </ResourceForm.Field>
      </ResourceForm.Section>
    </ResourceForm>
  );
}
