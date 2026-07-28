"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X, Pencil, Trash2, AlertCircle, RefreshCw, FolderTree, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
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

type Category = {
  id: string;
  name: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive: boolean;
};

type FlatCategory = Category & { depth: number };

function buildTree(categories: Category[], parentId: string | null = null, depth = 0): FlatCategory[] {
  const children = categories.filter(c => (c.parentId || null) === parentId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  let result: FlatCategory[] = [];
  for (const child of children) {
    result.push({ ...child, depth });
    result = result.concat(buildTree(categories, child.id, depth + 1));
  }
  return result;
}

export function CategoryTreeView() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const canManage = user?.permissions?.includes("pos.category.manage") ?? true;
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ message: string } | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; message: string } | null>(null);
  const [formState, setFormState] = useState({
    name: "",
    parentId: "",
  });

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["pos", "categories"],
    queryFn: () => apiClient.get<{ data: Category[] }>("/pos/categories").then((res) => res.data.data),
  });

  const flatCategories = useMemo(() => {
    if (!categories) return [];
    return buildTree(categories);
  }, [categories]);

  const createMutation = useMutation({
    mutationFn: (payload: { name?: string, parentId?: string | null }) => apiClient.post("/pos/categories", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "categories"] });
      setEditingId(null);
      setFormError(null);
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      const code = getApiErrorCode(err);
      if (code === "POS_CATEGORY_DUPLICATE") {
        setFormError({ message: "A category with this name already exists." });
      } else {
        setFormError({ message: getApiErrorMessage(err, "Failed to create category") });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name?: string, parentId?: string | null } }) => 
      apiClient.patch(`/pos/categories/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos", "categories"] });
      setEditingId(null);
      setFormError(null);
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      const code = getApiErrorCode(err);
      if (code === "POS_CATEGORY_DUPLICATE") {
        setFormError({ message: "A category with this name already exists." });
      } else if (code === "POS_CATEGORY_CYCLE") {
        setFormError({ message: "Cannot move a category beneath itself or its descendants." });
      } else {
        setFormError({ message: getApiErrorMessage(err, "Failed to update category") });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete<{ data: Category; deactivated: boolean }>(`/pos/categories/${id}`),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ["pos", "categories"] });
      if (res.data.deactivated) {
        setDeleteWarning({ id, message: "Category is in use and was deactivated instead of deleted." });
      } else {
        setDeleteWarning(null);
      }
    },
    onError: (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => {
      alert(getApiErrorMessage(err, "Failed to delete category"));
    },
  });

  const handleCreateNew = () => {
    setFormError(null);
    setFormState({ name: "", parentId: "" });
    setEditingId("NEW");
  };

  const handleEdit = (category: Category) => {
    setFormError(null);
    setFormState({
      name: category.name,
      parentId: category.parentId || "",
    });
    setEditingId(category.id);
  };

  const handleSave = () => {
    if (!formState.name.trim()) {
      setFormError({ message: "Name is required." });
      return;
    }

    const payload: { name?: string, parentId?: string | null } = {
      name: formState.name.trim(),
    };
    
    if (formState.parentId) {
      payload.parentId = formState.parentId;
    } else {
      payload.parentId = null; // explicitly clear parent if none selected
    }

    if (editingId === "NEW") {
      createMutation.mutate(payload);
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    }
  };

  if (isLoading) return <AdminPage title="Categories" description="Manage product catalog categories"><LoadingState /></AdminPage>;
  if (error) return <AdminPage title="Categories" description="Manage product catalog categories"><ErrorState message="Failed to load categories." /></AdminPage>;

  return (
    <AdminPage
      title="Categories"
      description="Organize your products into a hierarchical category tree."
      action={
        canManage && editingId === null && (
          <PrimaryButton onClick={handleCreateNew}>
            <Plus className="mr-2 size-4" /> New Category
          </PrimaryButton>
        )
      }
    >
      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Category Structure</th>
                <th className="px-4 py-3 font-medium w-[120px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingId === "NEW" && (
                <tr className="bg-blue-50/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2 max-w-lg">
                      <input
                        className={inputClass}
                        placeholder="Category Name"
                        value={formState.name}
                        onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                        autoFocus
                      />
                      <span className="text-slate-400">under</span>
                      <select
                        className={inputClass}
                        value={formState.parentId}
                        onChange={(e) => setFormState({ ...formState, parentId: e.target.value })}
                      >
                        <option value="">Root (No Parent)</option>
                        {categories?.filter(c => c.isActive).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
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
                  <td colSpan={2} className="p-2 bg-red-50 text-red-600 text-xs px-4">
                    <AlertCircle className="inline-block size-3 mr-1 mb-0.5" />
                    {formError.message}
                  </td>
                </tr>
              )}

              {flatCategories.map((category) => {
                const isEditing = editingId === category.id;
                
                if (isEditing) {
                  return (
                    <tr key={category.id} className="bg-blue-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2 max-w-lg" style={{ marginLeft: `${category.depth * 24}px` }}>
                          <input
                            className={inputClass}
                            value={formState.name}
                            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                          />
                          <span className="text-slate-400">under</span>
                          <select
                            className={inputClass}
                            value={formState.parentId}
                            onChange={(e) => setFormState({ ...formState, parentId: e.target.value })}
                          >
                            <option value="">Root (No Parent)</option>
                            {flatCategories.filter(c => c.id !== category.id).map(c => (
                              <option key={c.id} value={c.id}>
                                {'—'.repeat(c.depth)} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
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
                  <tr key={category.id} className={cn(!category.isActive && "opacity-50 grayscale", "group")}>
                    <td className="px-4 py-3">
                      <div 
                        className="flex items-center gap-2 text-slate-700"
                        style={{ paddingLeft: `${category.depth * 24}px` }}
                      >
                        {category.depth > 0 ? (
                          <div className="text-slate-300 mr-1"><ArrowRight className="size-3" /></div>
                        ) : (
                          <div className="text-blue-500 mr-1"><FolderTree className="size-4" /></div>
                        )}
                        <span className="font-medium">{category.name}</span>
                        {!category.isActive && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Inactive</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canManage && category.isActive && (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(category)}
                            className="grid size-8 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete category "${category.name}"?`)) {
                                deleteMutation.mutate(category.id);
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
              
              {flatCategories.length === 0 && editingId !== "NEW" && (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-slate-500">
                    No categories found. Start by creating a root category.
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
