"use client";

import { CheckCircle2, Info, Plus, ShieldCheck, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useTenantLocalization } from "@/lib/tenant-localization";
import {
  AdminPage,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";

type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissionKeys?: string[];
  assignedUsers?: number;
};

type User = {
  id: string;
  email: string;
  status: string;
  roles: Role[];
};

type PermissionGroup = { module: string; keys: string[] };

function apiErrorMessage(error: unknown, fallback: string) {
  const response = error as {
    response?: { data?: { message?: string | string[] } };
  };
  const message = response.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || fallback;
}

function sentenceCase(value: string) {
  const text = value.replaceAll("-", " ").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function permissionLabel(key: string) {
  return key.split(".").map(sentenceCase).join(" / ");
}

export function UsersRolesView() {
  const { tText } = useTenantLocalization();
  const router = useRouter();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const [users, setUsers] = useState<User[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleIds, setInviteRoleIds] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState("");
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([apiClient.get("/users?limit=100"), apiClient.get("/roles")])
      .then(([userResult, roleResult]) => {
        setUsers(userResult.data.data);
        setRoles(roleResult.data.data);
      })
      .catch(() => setError(tText("Users and roles could not be loaded.")));

  useEffect(() => {
    void load();
  }, []);

  const assignableRoles = roles.filter((role) => role.name !== "EMPLOYEE");
  const canManageUsers = permissions.includes("identity.users.roles.update");
  const canCreateRoles = permissions.includes("identity.roles.create");

  async function invite() {
    setBusy(true);
    setError("");
    try {
      await apiClient.post("/users/invitations", {
        email: inviteEmail,
        roleIds: inviteRoleIds,
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRoleIds([]);
      await load();
    } catch (caught) {
      setError(apiErrorMessage(caught, "Invitation could not be created."));
    } finally {
      setBusy(false);
    }
  }

  async function saveUserAccess() {
    if (!editingUser) return;
    setBusy(true);
    setError("");
    try {
      const retainedSystemRoleIds = editingUser.roles
        .filter(({ name }) => name === "EMPLOYEE")
        .map(({ id }) => id);
      await apiClient.patch(`/users/${editingUser.id}/roles`, {
        roleIds: [...new Set([...retainedSystemRoleIds, ...editingRoleIds])],
      });
      if (editingStatus !== editingUser.status) {
        await apiClient.patch(`/users/${editingUser.id}/status`, {
          status: editingStatus,
        });
      }
      setEditingUser(null);
      await load();
    } catch (caught) {
      setError(apiErrorMessage(caught, "Account access could not be updated."));
    } finally {
      setBusy(false);
    }
  }

  async function createRole() {
    setBusy(true);
    setError("");
    try {
      const response = await apiClient.post("/roles", {
        name: customRoleName.trim(),
        permissionKeys: [],
      });
      setCreateRoleOpen(false);
      setCustomRoleName("");
      router.push(`/app/access/roles/${response.data.data.id}`);
    } catch (caught) {
      setError(apiErrorMessage(caught, "Custom role could not be created."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage
      title={tText("Workspace access")}
      description={tText("Manage workspace accounts and assign product permissions through roles.")}
      action={
        <div className="flex flex-wrap gap-2">
          {canCreateRoles && (
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"
              onClick={() => setCreateRoleOpen(true)}
              type="button"
            >
              <ShieldCheck className="size-4" /> {tText("Create role")}
            </button>
          )}
          {canManageUsers && (
            <PrimaryButton onClick={() => setInviteOpen(true)}>
              <Plus className="size-4" /> {tText("Invite administrator")}
            </PrimaryButton>
          )}
        </div>
      }
    >
      {error && <ErrorState message={error} />}
      {!users ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <Panel className="overflow-hidden">
            <div className="border-b border-border bg-muted px-6 py-4 font-semibold">
              {tText("Workspace accounts")}
            </div>
            {users.map((user) => (
              <button
                className="flex min-h-16 w-full items-center justify-between gap-4 border-b border-border px-6 py-4 text-left last:border-0 hover:bg-muted disabled:cursor-default"
                disabled={!canManageUsers}
                key={user.id}
                onClick={() => {
                  setEditingUser(user);
                  setEditingRoleIds(user.roles.filter(({ name }) => name !== "EMPLOYEE").map(({ id }) => id));
                  setEditingStatus(user.status);
                }}
                type="button"
              >
                <span>
                  <strong className="block">{user.email}</strong>
                  <span className="text-xs text-muted-foreground">
                    {user.roles.map(({ name }) => name).join(", ") || tText("No role")}
                  </span>
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{user.status}</span>
              </button>
            ))}
          </Panel>
          <Panel className="p-6">
            <h2 className="font-semibold">{tText("Roles")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {tText("Product permissions are grouped into reusable workspace roles.")}
            </p>
            <div className="mt-4 grid gap-3">
              {assignableRoles.map((role) => (
                <Link
                  className="flex min-h-16 items-center justify-between rounded-xl border border-border p-4 hover:border-primary"
                  href={`/app/access/roles/${role.id}`}
                  key={role.id}
                >
                  <span>
                    <strong className="block">{role.name}</strong>
                    <span className="text-xs text-muted-foreground">
                      {role.isSystem ? tText("System role") : tText("Custom role")} · {role.assignedUsers ?? 0} {tText("users")}
                    </span>
                  </span>
                  <ShieldCheck className="size-5 text-primary" />
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {inviteOpen && (
        <AccessDialog onClose={() => setInviteOpen(false)} title={tText("Invite administrator")}>
          <div className="grid gap-4">
            <Field label={tText("Work email")}>
              <input className={inputClass} onChange={(event) => setInviteEmail(event.target.value)} type="email" value={inviteEmail} />
            </Field>
            <RoleChoices roles={assignableRoles} selected={inviteRoleIds} setSelected={setInviteRoleIds} />
            <PrimaryButton disabled={busy || !inviteEmail || inviteRoleIds.length === 0} onClick={invite}>
              {busy ? tText("Saving...") : tText("Create invitation")}
            </PrimaryButton>
          </div>
        </AccessDialog>
      )}

      {editingUser && (
        <AccessDialog onClose={() => setEditingUser(null)} title={tText("Manage account access")}>
          <div className="grid gap-4">
            <p className="text-sm font-semibold">{editingUser.email}</p>
            <RoleChoices roles={assignableRoles} selected={editingRoleIds} setSelected={setEditingRoleIds} />
            <Field label={tText("Account status")}>
              <select className={inputClass} onChange={(event) => setEditingStatus(event.target.value)} value={editingStatus}>
                <option value="ACTIVE">{tText("Active")}</option>
                <option value="DISABLED">{tText("Disabled")}</option>
                <option value="LOCKED">{tText("Locked")}</option>
              </select>
            </Field>
            <PrimaryButton disabled={busy} onClick={saveUserAccess}>
              {busy ? tText("Saving...") : tText("Save access")}
            </PrimaryButton>
          </div>
        </AccessDialog>
      )}

      {createRoleOpen && (
        <AccessDialog onClose={() => setCreateRoleOpen(false)} title={tText("Create role")}>
          <div className="grid gap-4">
            <Field label={tText("Role name")}>
              <input className={inputClass} onChange={(event) => setCustomRoleName(event.target.value)} value={customRoleName} />
            </Field>
            <p className="text-sm text-muted-foreground">
              {tText("Choose product permissions on the next screen.")}
            </p>
            <PrimaryButton disabled={busy || customRoleName.trim().length < 2} onClick={createRole}>
              {busy ? tText("Creating...") : tText("Create and configure")}
            </PrimaryButton>
          </div>
        </AccessDialog>
      )}
    </AdminPage>
  );
}

export function RoleEditorView({ roleId }: { roleId: string }) {
  const { tText } = useTenantLocalization();
  const [role, setRole] = useState<Role | null>(null);
  const [catalog, setCatalog] = useState<PermissionGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([apiClient.get(`/roles/${roleId}`), apiClient.get("/permissions")])
      .then(([roleResult, catalogResult]) => {
        const value = roleResult.data.data as Role;
        setRole(value);
        setCatalog(catalogResult.data.data);
        setSelected(new Set(value.permissionKeys ?? []));
      })
      .catch(() => setError(tText("Role permissions could not be loaded.")));
  }, [roleId]);

  async function save() {
    setError("");
    setSaved(false);
    try {
      const response = await apiClient.put(`/roles/${roleId}/permissions`, {
        permissionKeys: [...selected],
      });
      setRole(response.data.data);
      setSaved(true);
    } catch {
      setError(tText("Permission matrix could not be saved."));
    }
  }

  return (
    <AdminPage
      action={role && !role.isSystem ? <PrimaryButton onClick={save}>{tText("Save role access")}</PrimaryButton> : undefined}
      description={tText("Assign Platform and product capabilities from the authoritative permission catalog.")}
      title={role?.name || tText("Role editor")}
    >
      {error && <ErrorState message={error} />}
      {!role ? (
        <LoadingState />
      ) : (
        <div className="grid gap-5">
          {role.isSystem && (
            <div className="flex gap-3 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              <Info className="size-5 shrink-0 text-primary" />
              {tText("Built-in roles are maintained by the Platform and cannot be edited here.")}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm font-semibold">
              <CheckCircle2 className="size-5 text-primary" /> {tText("Role access saved.")}
            </div>
          )}
          {catalog.map((group) => (
            <Panel className="p-6" key={group.module}>
              <h2 className="font-semibold">{sentenceCase(group.module)}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {group.keys.map((key) => (
                  <label className="flex min-h-14 items-start gap-3 rounded-xl border border-border p-4" key={key}>
                    <input
                      checked={selected.has(key)}
                      className="mt-1 accent-primary"
                      disabled={role.isSystem}
                      onChange={(event) => {
                        setSaved(false);
                        setSelected((current) => {
                          const next = new Set(current);
                          event.target.checked ? next.add(key) : next.delete(key);
                          return next;
                        });
                      }}
                      type="checkbox"
                    />
                    <span>
                      <strong className="block text-sm">{permissionLabel(key)}</strong>
                      <code className="mt-1 block break-all text-xs text-muted-foreground">{key}</code>
                    </span>
                  </label>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </AdminPage>
  );
}

function RoleChoices({ roles, selected, setSelected }: { roles: Role[]; selected: string[]; setSelected: (ids: string[]) => void }) {
  const { tText } = useTenantLocalization();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{tText("Roles")}</legend>
      {roles.map((role) => (
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border p-3 text-sm" key={role.id}>
          <input
            checked={selected.includes(role.id)}
            onChange={(event) => setSelected(event.target.checked ? [...selected, role.id] : selected.filter((id) => id !== role.id))}
            type="checkbox"
          />
          {role.name}
        </label>
      ))}
    </fieldset>
  );
}

function AccessDialog({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  const { tText } = useTenantLocalization();
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/45 p-4" role="presentation">
      <div aria-label={title} aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-card p-7 shadow-xl" role="dialog">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button aria-label={tText("Close")} className="grid size-11 place-items-center rounded-xl hover:bg-muted" onClick={onClose} type="button">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
