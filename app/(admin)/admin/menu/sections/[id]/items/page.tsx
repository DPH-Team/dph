import { redirect } from 'next/navigation';

export default async function ItemsIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/menu/sections/${id}`);
}
