import { RoleEditorView } from "@/components/tenant/organization-access-views";
export default async function RolePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RoleEditorView roleId={id} />; }
