"use client";

import { useQuery } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, ArrowLeft, Download, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  AdminPage,
  Panel,
  PrimaryButton,
} from "@/shared/components/page-primitives";
import { cn } from "@/lib/utils";

type ImportJob = {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  totalRows: number;
  successRows: number;
  errorRows: number;
  failureReason: string | null;
};

type ImportRowError = {
  rowNumber: number;
  column: string;
  message: string;
};

export function ProductImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"CREATE" | "UPSERT">("UPSERT");
  const [stepState, setStep] = useState<"SELECT" | "UPLOADING" | "PROCESSING" | "DONE">("SELECT");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: jobRes } = useQuery({
    queryKey: ["pos", "importJob", jobId],
    queryFn: () => apiClient.get<{ data: ImportJob }>(`/pos/products/import/${jobId}`).then(res => res.data),
    enabled: stepState === "PROCESSING" && !!jobId,
    refetchInterval: (query) => {
      const status = (query.state.data as { data: ImportJob } | undefined)?.data?.status;
      if (status === "COMPLETED" || status === "FAILED") return false;
      return 1500;
    },
  });

  const job = jobRes?.data;


  // Load errors if job is done with errorRows
  const { data: errorsRes } = useQuery({
    queryKey: ["pos", "importErrors", jobId],
    queryFn: () => apiClient.get<{ data: ImportRowError[] }>(`/pos/products/import/${jobId}/errors`).then(res => res.data),
    enabled: !!job && (job.status === "COMPLETED" || job.status === "FAILED") && job.errorRows > 0,
  });

  const rowErrors = errorsRes?.data || [];
  const step = job && (job.status === "COMPLETED" || job.status === "FAILED") ? "DONE" : stepState;

  

  const handleDownloadTemplate = async () => {
    try {
      const res = await apiClient.get<{ data: { csv: string } }>("/pos/products/import/template");
      const url = window.URL.createObjectURL(new Blob([res.data.data.csv]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "products_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      alert("Failed to download template.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError("File must be under 10MB");
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const startImport = async () => {
    if (!file) return;
    setError(null);
    setStep("UPLOADING");
    
    try {
      // 1. Presign
      const presignRes = await apiClient.post<{ objectKey: string; uploadUrl: string }>("/pos/products/import/presign", {
        filename: file.name,
        contentType: "text/csv",
        fileSize: file.size
      });
      const { objectKey, uploadUrl } = presignRes.data;

      // 2. Upload to S3 (no auth)
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "text/csv" }
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload file to storage.");

      // 3. Register job
      setStep("PROCESSING");
      const registerRes = await apiClient.post<{ data: ImportJob }>("/pos/products/import", {
        objectKey,
        mode,
        originalFilename: file.name,
        contentType: "text/csv",
        fileSize: file.size,
        idempotencyKey: crypto.randomUUID()
      });
      
      setJobId(registerRes.data.data.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "An error occurred starting the import."));
      setStep("SELECT");
    }
  };

  return (
    <AdminPage
      title="Import Products"
      description="Upload a CSV file to bulk import or update your catalog."
    >
      <div className="mx-auto max-w-3xl">
        <Link href="/pos/products" className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition">
          <ArrowLeft className="mr-2 size-4" /> Back to Products
        </Link>
        
        <Panel className="p-8">
          {step === "SELECT" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">1. Prepare your data</h3>
                  <p className="mt-1 text-sm text-slate-500">Download the template and fill it out. Do not rename the columns.</p>
                </div>
                <button 
                  onClick={handleDownloadTemplate}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Download className="size-4" /> Download Template
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">2. Select Import Mode</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={cn(
                    "flex cursor-pointer rounded-xl border p-4 transition-all",
                    mode === "UPSERT" ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-slate-200 hover:bg-slate-50"
                  )}>
                    <input type="radio" className="sr-only" checked={mode === "UPSERT"} onChange={() => setMode("UPSERT")} />
                    <div>
                      <div className="font-semibold text-slate-900">Add & Update</div>
                      <div className="mt-1 text-sm text-slate-500">Adds new products and updates existing ones matched by SKU or Barcode.</div>
                    </div>
                  </label>
                  <label className={cn(
                    "flex cursor-pointer rounded-xl border p-4 transition-all",
                    mode === "CREATE" ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-slate-200 hover:bg-slate-50"
                  )}>
                    <input type="radio" className="sr-only" checked={mode === "CREATE"} onChange={() => setMode("CREATE")} />
                    <div>
                      <div className="font-semibold text-slate-900">Add Only</div>
                      <div className="mt-1 text-sm text-slate-500">Only adds new products. Fails row if SKU or Barcode already exists.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-lg font-semibold text-slate-800">3. Upload File</h3>
                <div 
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-slate-50/50 px-6 py-10 transition-colors",
                    file ? "border-blue-300 bg-blue-50/30" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                  )}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  
                  {file ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="grid size-12 place-items-center rounded-full bg-blue-100 text-blue-600 mb-3">
                        <FileText className="size-6" />
                      </div>
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                      <button 
                        onClick={() => setFile(null)}
                        className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <div className="grid size-12 place-items-center rounded-full bg-slate-200 text-slate-600 mb-3">
                        <Upload className="size-6" />
                      </div>
                      <p className="font-medium text-slate-900">Click to upload or drag and drop</p>
                      <p className="text-xs text-slate-500 mt-1">CSV files only, up to 10MB</p>
                    </div>
                  )}
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    <AlertCircle className="size-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <PrimaryButton disabled={!file} onClick={startImport} className="h-10 px-8">
                  Start Import
                </PrimaryButton>
              </div>
            </div>
          )}

          {(step === "UPLOADING" || step === "PROCESSING") && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="size-12 animate-spin text-blue-600 mb-6" />
              <h2 className="text-xl font-bold text-slate-900">
                {step === "UPLOADING" ? "Uploading file..." : "Processing import..."}
              </h2>
              <p className="mt-2 text-slate-500 max-w-sm">
                {step === "UPLOADING" 
                  ? "Securely transferring your data." 
                  : "We're validating and saving your products. This may take a few moments depending on file size."}
              </p>
            </div>
          )}

          {step === "DONE" && job && (
            <div className="space-y-8">
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100">
                {job.status === "COMPLETED" && job.errorRows === 0 ? (
                  <div className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                    <CheckCircle2 className="size-8" />
                  </div>
                ) : job.status === "FAILED" || job.successRows === 0 ? (
                  <div className="grid size-16 place-items-center rounded-full bg-red-100 text-red-600 mb-4">
                    <XCircle className="size-8" />
                  </div>
                ) : (
                  <div className="grid size-16 place-items-center rounded-full bg-amber-100 text-amber-600 mb-4">
                    <AlertCircle className="size-8" />
                  </div>
                )}
                
                <h2 className="text-2xl font-bold text-slate-900">
                  {job.status === "COMPLETED" && job.errorRows === 0 ? "Import Successful!" : 
                   job.status === "FAILED" ? "Import Failed" : "Completed with Errors"}
                </h2>
                
                {job.failureReason && (
                  <p className="mt-2 text-red-600 font-medium">{job.failureReason}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <div className="text-3xl font-bold text-slate-800">{job.totalRows}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Total Rows</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-700">{job.successRows}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">Imported</div>
                </div>
                <div className={cn(
                  "rounded-xl border p-4 text-center",
                  job.errorRows > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"
                )}>
                  <div className={cn("text-3xl font-bold", job.errorRows > 0 ? "text-red-700" : "text-slate-800")}>{job.errorRows}</div>
                  <div className={cn("mt-1 text-xs font-semibold uppercase tracking-wider", job.errorRows > 0 ? "text-red-600" : "text-slate-500")}>Skipped</div>
                </div>
              </div>

              {rowErrors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-800">Errors Details</h3>
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 font-medium">Row</th>
                          <th className="px-4 py-2 font-medium">Column</th>
                          <th className="px-4 py-2 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {rowErrors.map((err, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 font-medium text-slate-900">{err.rowNumber}</td>
                            <td className="px-4 py-2 text-slate-600">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">{err.column}</span>
                            </td>
                            <td className="px-4 py-2 text-red-600">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-6">
                <Link href="/pos/products">
                  <PrimaryButton className="h-10 px-8">
                    View Products
                  </PrimaryButton>
                </Link>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </AdminPage>
  );
}
