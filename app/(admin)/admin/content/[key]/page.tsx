import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import {
  getContentBlock,
  CONTENT_BLOCK_KEYS,
} from '@/lib/db/queries/content-blocks';
import type { ContentBlockKey } from '@/lib/validators/content-blocks';
import { updateContentBlockAction } from '@/app/(admin)/admin/content/actions';
import { HomeHeroForm } from '@/components/admin/content/HomeHeroForm';
import { HomeCalloutsForm } from '@/components/admin/content/HomeCalloutsForm';
import { AboutBodyForm } from '@/components/admin/content/AboutBodyForm';

// ─── Human labels + descriptions per key ──────────────────────────────────────

const BLOCK_META: Record<ContentBlockKey, { label: string; description: string }> =
  {
    home_hero: {
      label: 'Home hero',
      description:
        'The full-width hero section at the top of the home page — eyebrow, headline, lead copy, CTA buttons, and optional background image.',
    },
    home_callouts: {
      label: 'Home callouts',
      description:
        'The grid of feature callout cards below the hero — self-pour, kitchen, events, etc. Up to six items.',
    },
    about_body: {
      label: 'About body',
      description:
        'The story section on the About page — headline, lead, narrative paragraphs, RFID how-it-works steps, and brand values.',
    },
  };

// ─── Page ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ key: string }>;
}

export default async function ContentBlockEditPage({ params }: PageProps) {
  await requireStaff();

  const { key } = await params;

  // Guard: unknown key
  if (!(CONTENT_BLOCK_KEYS as readonly string[]).includes(key)) {
    notFound();
  }

  const typedKey = key as ContentBlockKey;
  const meta = BLOCK_META[typedKey];

  // Bind the action to this key so the form just receives (state, formData)
  const boundAction = updateContentBlockAction.bind(null, typedKey);

  // ── Per-key fetch + form — switch keeps each branch narrowed ────────────────

  let formEl: React.ReactNode;

  if (typedKey === 'home_hero') {
    const block = await getContentBlock('home_hero');
    formEl = <HomeHeroForm initialValue={block.value} action={boundAction} />;
  } else if (typedKey === 'home_callouts') {
    const block = await getContentBlock('home_callouts');
    formEl = (
      <HomeCalloutsForm initialValue={block.value} action={boundAction} />
    );
  } else {
    // about_body
    const block = await getContentBlock('about_body');
    formEl = <AboutBodyForm initialValue={block.value} action={boundAction} />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb + header */}
      <header>
        <p className="text-xs text-muted-foreground mb-1">
          <Link
            href="/admin/content"
            className="hover:text-foreground transition-colors"
          >
            Content
          </Link>
          {' › '}
          <span>{meta.label}</span>
        </p>
        <h1 className="text-xl font-semibold text-foreground">{meta.label}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
      </header>

      {formEl}
    </div>
  );
}
