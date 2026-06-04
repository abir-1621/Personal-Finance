"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { ExternalLink, ImagePlus, X } from "lucide-react";
import { createDepositAction, updateDepositAction } from "@/app/actions/deposits";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency } from "@/lib/format";
import { MAX_RECEIPT_BYTES, RECEIPT_ACCEPT } from "@/lib/receipts";
import { dateToday, monthNow } from "@/lib/utils";
import type { Deposit, DepositStatus, Profile, Setting } from "@/lib/types";

type DepositFormProps = {
  mode: "create" | "edit";
  currentProfile: Profile;
  members: Profile[];
  settings: Setting;
  deposit?: Deposit;
  returnTo?: string;
  receiptUrl?: string | null;
};

export function DepositForm({ mode, currentProfile, members, settings, deposit, returnTo, receiptUrl }: DepositFormProps) {
  const actionToUse = mode === "create" ? createDepositAction : updateDepositAction;
  const [optimizedReceipt, setOptimizedReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(receiptUrl ?? null);
  const [receiptMessage, setReceiptMessage] = useState<string | null>(receiptUrl ? "Existing receipt is attached." : null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const localPreviewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, action] = useActionState(async (previousState: { error?: string; success?: string }, formData: FormData) => {
    if (optimizedReceipt) {
      formData.set("receipt", optimizedReceipt, optimizedReceipt.name);
    }

    return actionToUse(previousState, formData);
  }, {});
  const initialMemberId = deposit?.member_id ?? currentProfile.id;
  const [selectedMemberId, setSelectedMemberId] = useState(initialMemberId);
  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? members[0],
    [members, selectedMemberId]
  );
  const keepStoredSnapshot = mode === "edit" && deposit?.member_id === selectedMember?.id;
  const shareCount = keepStoredSnapshot ? (deposit?.share_count_snapshot ?? 0) : (selectedMember?.assigned_shares ?? 0);
  const sharePrice = keepStoredSnapshot ? (deposit?.share_price_snapshot ?? settings.share_price) : settings.share_price;
  const amount = shareCount * sharePrice;

  useEffect(() => {
    return () => {
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
      }
    };
  }, []);

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(event) => {
        if (isOptimizing) {
          event.preventDefault();
          setReceiptMessage("Please wait for receipt optimization to finish.");
        }
      }}
    >
      {mode === "edit" && deposit ? <input type="hidden" name="id" value={deposit.id} /> : null}
      <input type="hidden" name="return_to" value={returnTo ?? (mode === "edit" ? "/admin/deposits" : "/deposits/history")} />
      {currentProfile.role !== "ADMIN" ? <input type="hidden" name="member_id" value={currentProfile.id} /> : null}
      {state.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
      ) : null}
      {currentProfile.role === "ADMIN" ? (
        <label className="block space-y-2">
          <span className="form-label">Member</span>
          <select
            className="form-input"
            name="member_id"
            value={selectedMemberId}
            onChange={(event) => setSelectedMemberId(event.target.value)}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="form-label">Deposit month</span>
          <input
            className="form-input"
            name="deposit_month"
            type="month"
            defaultValue={deposit?.deposit_month ?? monthNow()}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="form-label">Deposit date</span>
          <input
            className="form-input"
            name="deposit_date"
            type="date"
            defaultValue={deposit?.deposit_date ?? dateToday()}
            required
          />
        </label>
      </div>
      {mode === "edit" ? (
        <label className="block space-y-2">
          <span className="form-label">Status</span>
          <select className="form-input" name="status" defaultValue={deposit?.status ?? "PENDING"}>
            {(["PENDING", "APPROVED", "REJECTED"] satisfies DepositStatus[]).map((status) => (
              <option key={status} value={status}>
                {status[0] + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
        <ReadOnlyMetric label="Assigned shares" value={String(shareCount)} />
        <ReadOnlyMetric label="Share price" value={formatCurrency(sharePrice, settings.currency)} />
        <ReadOnlyMetric label="Calculated amount" value={formatCurrency(amount, settings.currency)} />
      </div>
      <label className="block space-y-2">
        <span className="form-label">Note</span>
        <textarea
          className="form-input min-h-24 resize-y"
          name="note"
          defaultValue={deposit?.note ?? ""}
          maxLength={500}
        />
      </label>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <span className="form-label">Receipt image</span>
          <p className="text-sm text-slate-500">
            Optional. Large images are optimized before upload so they stay readable without being too heavy.
          </p>
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-teal-300 hover:bg-teal-50">
          <ImagePlus className="h-6 w-6 text-teal-700" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-800">Choose receipt image</span>
          <span className="text-xs text-slate-500">JPEG, PNG, or WebP up to 6 MB after optimization</span>
          <input
            ref={fileInputRef}
            className="sr-only"
            name="receipt"
            type="file"
            accept={RECEIPT_ACCEPT}
            onChange={handleReceiptChange}
          />
        </label>
        {receiptMessage ? <p className="text-sm text-slate-500">{receiptMessage}</p> : null}
        {receiptPreview ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptPreview} alt="Receipt preview" className="max-h-72 w-full object-contain" />
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white p-3">
              {receiptUrl && receiptPreview === receiptUrl ? (
                <a className="btn-secondary min-h-8 px-3 py-1" href={receiptUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Open receipt
                </a>
              ) : null}
              <button type="button" className="btn-secondary min-h-8 px-3 py-1" onClick={clearSelectedReceipt}>
                <X className="h-4 w-4" aria-hidden="true" />
                Clear selected image
              </button>
            </div>
          </div>
        ) : null}
        {mode === "edit" && deposit?.receipt_path ? (
          <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
            <input name="remove_receipt" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-600" />
            Remove existing receipt when saving
          </label>
        ) : null}
      </div>
      <SubmitButton pendingLabel={mode === "create" ? "Submitting" : "Updating"}>
        {mode === "create" ? "Submit deposit" : "Update deposit"}
      </SubmitButton>
    </form>
  );

  async function handleReceiptChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      clearSelectedReceipt();
      return;
    }

    if (!file.type.startsWith("image/")) {
      setReceiptMessage("Choose a receipt image file.");
      setOptimizedReceipt(null);
      return;
    }

    setIsOptimizing(true);
    setReceiptMessage("Optimizing receipt image...");

    try {
      const optimized = await optimizeReceiptImage(file);
      setOptimizedReceipt(optimized);
      setLocalPreview(optimized);
      setReceiptMessage(
        optimized.size < file.size
          ? `Optimized from ${formatBytes(file.size)} to ${formatBytes(optimized.size)}.`
          : `Ready to upload: ${formatBytes(optimized.size)}.`
      );
    } catch {
      setOptimizedReceipt(file);
      setLocalPreview(file);
      setReceiptMessage(`Using original image: ${formatBytes(file.size)}.`);
    } finally {
      setIsOptimizing(false);
    }
  }

  function setLocalPreview(file: File) {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    localPreviewRef.current = nextUrl;
    setReceiptPreview(nextUrl);
  }

  function clearSelectedReceipt() {
    setOptimizedReceipt(null);
    setReceiptPreview(receiptUrl ?? null);
    setReceiptMessage(receiptUrl ? "Existing receipt is attached." : null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  }
}

function ReadOnlyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

async function optimizeReceiptImage(file: File) {
  if (file.size <= MAX_RECEIPT_BYTES && file.type === "image/webp") {
    return file;
  }

  const image = await loadImage(file);
  const maxDimension = 2000;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    return file;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const outputType = "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.86));

  if (!blob) {
    return file;
  }

  if (blob.size >= file.size && file.size <= MAX_RECEIPT_BYTES) {
    return file;
  }

  return new File([blob], replaceExtension(file.name, "jpg"), {
    type: outputType,
    lastModified: Date.now()
  });
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function replaceExtension(name: string, extension: string) {
  return `${name.replace(/\.[^.]+$/, "") || "receipt"}.${extension}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
