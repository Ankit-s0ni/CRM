"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X, Pencil, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api-error";
import {
  AdminPage,
  ErrorState,
  LoadingState,
  Panel,
  PrimaryButton,
  inputClass,
} from "@/shared/components/page-primitives";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";

type Unit = {
  id: string;
  code: string;
  name: string;
  baseUnitId?: string | null;
  conversionFactor?: string | null;
  isActive: boolean;
};

export function UnitListView() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.permissions?.includes("pos.unit.manage") ?? true;
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ message: string; field?: string } | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; message: string } | null>(null);
  const [formState, setFormState] = useState({
    code: "",
    name: "",
    baseUnitId: "",
    conversionFactor: "",
  });

  const { data: units, isLoading, error } = useQuery({
    queryKey: ["pos", "units"],
    queryFn: () => apiClient.get<{ data: Unit[] }>("/pos/units").then((res) => res.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, string | null>) => apiClient.post("/pos/units", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "units"] });
      setEditingId(null);
      setFormError(null);
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      const code = getApiErrorCode(err);
      if (code === "POS_UNIT_DUPLICATE") {
        setFormError({ message: "A unit with this code or name already exists.", field: "code" });
      } else {
        setFormError({ message: getApiErrorMessage(err, "Failed to create unit") });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, string | null> }) => 
      apiClient.patch(`/pos/units/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "units"] });
      setEditingId(null);
      setFormError(null);
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      const code = getApiErrorCode(err);
      if (code === "POS_UNIT_DUPLICATE") {
        setFormError({ message: "A unit with this code or name already exists.", field: "code" });
      } else {
        setFormError({ message: getApiErrorMessage(err, "Failed to update unit") });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<{ data: Unit; deactivated: boolean }>(`/pos/units/${id}`),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ["pos", "units"] });
      if (res.data.deactivated) {
        setDeleteWarning({ id, message: "Unit is in use and was deactivated instead of deleted." });
      } else {
        setDeleteWarning(null);
      }
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      alert(getApiErrorMessage(err, "Failed to delete unit"));
    },
  });

  const handleCreateNew = () => {
    setFormError(null);
    setFormState({ code: "", name: "", baseUnitId: "", conversionFactor: "" });
    setEditingId("NEW");
  };

  const handleEdit = (unit: Unit) => {
    setFormError(null);
    setFormState({
      code: unit.code,
      name: unit.name,
      baseUnitId: unit.baseUnitId || "",
      conversionFactor: unit.conversionFactor || "",
    });
    setEditingId(unit.id);
  };

  const handleSave = () => {
    if (!formState.code.trim() || !formState.name.trim()) {
      setFormError({ message: "Code and Name are required." });
      return;
    }

    const payload: Record<string, string | null> = {
      code: formState.code.toUpperCase().trim(),
      name: formState.name.trim(),
    };
    
    if (formState.baseUnitId) {
      payload.baseUnitId = formState.baseUnitId;
      if (formState.conversionFactor) {
        payload.conversionFactor = formState.conversionFactor;
      }
    }

    if (editingId === "NEW") {
      createMutation.mutate(payload);
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    }
  };

  if (isLoading) return <AdminPage title="Units" description="Manage units of measure"><LoadingState /></AdminPage>;
  if (error) return <AdminPage title="Units" description="Manage units of measure"><ErrorState message="Failed to load units." /></AdminPage>;

  const baseUnits = units?.filter(u => !u.baseUnitId && u.isActive) || [];

  return (
    <AdminPage
      title="Units of Measure"
      description="Manage the units used for product quantities and inventory tracking."
      action={
        canManage && editingId === null && (
          <PrimaryButton onClick={handleCreateNew}>
            <Plus className="mr-2 size-4" /> New Unit
          </PrimaryButton>
        )
      }
    >
      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Base Unit</th>
                <th className="px-4 py-3 font-medium">Conversion Factor</th>
                <th className="px-4 py-3 font-medium w-[100px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingId === "NEW" && (
                <tr className="bg-blue-50/50">
                  <td className="p-2 align-top">
                    <input
                      className={inputClass}
                      placeholder="e.g. BOX"
                      value={formState.code}
                      onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                      autoFocus
                    />
                  </td>
                  <td className="p-2 align-top">
                    <input
                      className={inputClass}
                      placeholder="e.g. Box"
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <select
                      className={inputClass}
                      value={formState.baseUnitId}
                      onChange={(e) => setFormState({ ...formState, baseUnitId: e.target.value })}
                    >
                      <option value="">None (Is Base Unit)</option>
                      {baseUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.code} - {u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 align-top">
                    <input
                      className={inputClass}
                      placeholder="e.g. 10.000"
                      value={formState.conversionFactor}
                      onChange={(e) => setFormState({ ...formState, conversionFactor: e.target.value })}
                      disabled={!formState.baseUnitId}
                    />
                  </td>
                  <td className="p-2 align-top text-right">
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <button
                        onClick={handleSave}
                        disabled={createMutation.isPending}
                        className="grid size-8 place-items-center rounded-md text-blue-600 hover:bg-blue-100"
                      >
                        {createMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              
              {formError && (
                <tr>
                  <td colSpan={5} className="p-2 bg-red-50 text-red-600 text-xs px-4">
                    <AlertCircle className="inline-block size-3 mr-1 mb-0.5" />
                    {formError.message}
                  </td>
                </tr>
              )}

              {units?.map((unit) => {
                const isEditing = editingId === unit.id;
                
                if (isEditing) {
                  return (
                    <tr key={unit.id} className="bg-blue-50/50">
                      <td className="p-2 align-top">
                        <input
                          className={inputClass}
                          value={formState.code}
                          onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                        />
                      </td>
                      <td className="p-2 align-top">
                        <input
                          className={inputClass}
                          value={formState.name}
                          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        />
                      </td>
                      <td className="p-2 align-top">
                        <select
                          className={inputClass}
                          value={formState.baseUnitId}
                          onChange={(e) => setFormState({ ...formState, baseUnitId: e.target.value })}
                        >
                          <option value="">None (Is Base Unit)</option>
                          {baseUnits.filter(u => u.id !== unit.id).map(u => (
                            <option key={u.id} value={u.id}>{u.code} - {u.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 align-top">
                        <input
                          className={inputClass}
                          value={formState.conversionFactor}
                          onChange={(e) => setFormState({ ...formState, conversionFactor: e.target.value })}
                          disabled={!formState.baseUnitId}
                        />
                      </td>
                      <td className="p-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="grid size-8 place-items-center rounded-md text-blue-600 hover:bg-blue-100"
                          >
                            {updateMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={unit.id} className={cn(!unit.isActive && "opacity-50 grayscale")}>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {unit.code}
                      {!unit.isActive && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Inactive</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{unit.name}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {unit.baseUnitId ? units.find(u => u.id === unit.baseUnitId)?.code : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {unit.conversionFactor || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canManage && unit.isActive && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(unit)}
                            className="grid size-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete unit ${unit.code}?`)) {
                                deleteMutation.mutate(unit.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                            className="grid size-8 place-items-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {units?.length === 0 && editingId !== "NEW" && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No units found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
      
      {deleteWarning && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="size-5 shrink-0" />
          <p className="text-sm font-medium">{deleteWarning.message}</p>
          <button 
            onClick={() => setDeleteWarning(null)}
            className="ml-auto text-amber-600 hover:text-amber-800"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </AdminPage>
  );
}
