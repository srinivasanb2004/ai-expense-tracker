"use client"

import AppShell from "@/components/app-shell"
import DataErrorState from "@/components/data-error-state"
import Link from "next/link"

import {
  CheckCircle2,
  FileText,
  ScanLine,
  UploadCloud,
} from "lucide-react"

import { useState } from "react"

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Education",
  "Other",
]

const payments = [
  "UPI",
  "Card",
  "Cash",
  "Bank Transfer",
  "Other",
]

type ReceiptData = {
  merchant: string
  amount: number
  date: string | null
  tax: number | null
  category: string
  paymentMethod: string
  notes: string | null
}

const MAX_IMAGE_DIMENSION = 1800
const IMAGE_QUALITY = 0.82
const MAX_ORIGINAL_FILE_SIZE = 20 * 1024 * 1024

/* ========================================
   SAFE API RESPONSE PARSER
======================================== */

async function readApiResponse(
  response: Response
) {
  const text =
    await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    /*
      Vercel / proxy / server may return
      plain text instead of JSON.

      Example:
      Request Entity Too Large
    */

    const short =
      text
        .replace(
          /<[^>]*>/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim()
        .slice(
          0,
          220
        )

    return {
      error:
        short ||
        "Receipt service returned an invalid response.",
    }
  }
}

/* ========================================
   COMPRESS CAMERA IMAGE
======================================== */

async function compressReceiptImage(
  file: File
): Promise<File> {
  /*
    PDFs are not modified.
  */

  if (
    file.type ===
    "application/pdf"
  ) {
    return file
  }

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)
  ) {
    return file
  }

  /*
    Skip compression for already-small
    images unless dimensions still need it.
  */

  const bitmap =
    await createImageBitmap(
      file
    )

  try {
    const originalWidth =
      bitmap.width

    const originalHeight =
      bitmap.height

    let width =
      originalWidth

    let height =
      originalHeight

    const largest =
      Math.max(
        width,
        height
      )

    if (
      largest >
      MAX_IMAGE_DIMENSION
    ) {
      const ratio =
        MAX_IMAGE_DIMENSION /
        largest

      width =
        Math.round(
          width * ratio
        )

      height =
        Math.round(
          height * ratio
        )
    }

    const canvas =
      document.createElement(
        "canvas"
      )

    canvas.width =
      width

    canvas.height =
      height

    const context =
      canvas.getContext(
        "2d"
      )

    if (!context) {
      return file
    }

    /*
      White background helps with
      transparent PNG receipts.
    */

    context.fillStyle =
      "#ffffff"

    context.fillRect(
      0,
      0,
      width,
      height
    )

    context.drawImage(
      bitmap,
      0,
      0,
      width,
      height
    )

    const blob =
      await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            IMAGE_QUALITY
          )
        }
      )

    if (!blob) {
      return file
    }

    /*
      If compression somehow creates
      a larger file, keep original.
    */

    if (
      blob.size >=
      file.size &&
      largest <=
      MAX_IMAGE_DIMENSION
    ) {
      return file
    }

    const baseName =
      file.name.replace(
        /\.[^.]+$/,
        ""
      )

    return new File(
      [
        blob,
      ],
      `${baseName}-compressed.jpg`,
      {
        type:
          "image/jpeg",

        lastModified:
          Date.now(),
      }
    )
  } finally {
    bitmap.close()
  }
}

export default function Scan() {
  const [
    file,
    setFile,
  ] =
    useState<
      File | null
    >(null)

  const [
    data,
    setData,
  ] =
    useState<
      ReceiptData | null
    >(null)

  const [
    status,
    setStatus,
  ] =
    useState("")

  const [
    scanning,
    setScanning,
  ] =
    useState(false)

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    connectionError,
    setConnectionError,
  ] =
    useState(false)

  const [
    validationError,
    setValidationError,
  ] =
    useState("")

  /* ========================================
     SCAN RECEIPT
  ======================================== */

  async function scan() {
    if (
      !file ||
      scanning
    ) {
      return
    }

    setScanning(true)

    setConnectionError(
      false
    )

    setValidationError(
      ""
    )

    setStatus(
      "Preparing receipt..."
    )

    setData(null)

    try {
      if (
        file.size >
        MAX_ORIGINAL_FILE_SIZE
      ) {
        throw new Error(
          "This receipt image is too large. Please use a smaller photo or lower camera resolution."
        )
      }

      /*
        Mobile camera photos can be
        extremely large.

        Compress them before FormData
        reaches Vercel.
      */

      let uploadFile =
        file

      if (
        file.type.startsWith(
          "image/"
        )
      ) {
        setStatus(
          "Optimizing receipt image..."
        )

        uploadFile =
          await compressReceiptImage(
            file
          )
      }

      /*
        Extra safety check after
        compression.
      */

      if (
        uploadFile.size >
        8 *
        1024 *
        1024
      ) {
        throw new Error(
          "Receipt image is still too large after optimization. Please retake the photo at a lower resolution."
        )
      }

      setStatus(
        "WalletIQ AI is reading your receipt..."
      )

      const formData =
        new FormData()

      formData.append(
        "file",
        uploadFile
      )

      const response =
        await fetch(
          "/api/ocr",
          {
            method:
              "POST",

            body:
              formData,
          }
        )

      const payload =
        await readApiResponse(
          response
        )

      if (
        !response.ok
      ) {
        if (
          response.status ===
          413 ||
          String(
            payload.error ||
            ""
          )
            .toLowerCase()
            .includes(
              "too large"
            )
        ) {
          throw new Error(
            "Receipt image is too large. Please retake the photo at a lower resolution or upload a smaller image."
          )
        }

        if (
          response.status >=
          500
        ) {
          setConnectionError(
            true
          )
        }

        throw new Error(
          payload.error ||
          "Receipt scan failed."
        )
      }

      const invalid =
        !payload.merchant ||
        !Number.isFinite(
          Number(
            payload.amount
          )
        ) ||
        Number(
          payload.amount
        ) <= 0

      const receipt:
        ReceiptData = {
        merchant:
          String(
            payload.merchant ||
            "Unknown"
          ),

        amount:
          Number(
            payload.amount ||
            0
          ),

        date:
          payload.date
            ? String(
              payload.date
            )
            : null,

        tax:
          payload.tax == null
            ? null
            : Number(
              payload.tax
            ),

        category:
          categories.includes(
            String(
              payload.category
            )
          )
            ? String(
              payload.category
            )
            : "Other",

        paymentMethod:
          payments.includes(
            String(
              payload.paymentMethod
            )
          )
            ? String(
              payload.paymentMethod
            )
            : "Other",

        notes:
          payload.notes
            ? String(
              payload.notes
            )
            : null,
      }

      setData(
        receipt
      )

      setValidationError(
        invalid
          ? "WalletIQ AI could not confidently read the merchant or total. Please correct the highlighted fields before saving."
          : ""
      )

      setStatus(
        invalid
          ? "Receipt extracted with missing/invalid data."
          : "Receipt extracted. Review the fields before saving."
      )
    } catch (
    error
    ) {
      if (
        !navigator.onLine ||
        error instanceof
        TypeError
      ) {
        setConnectionError(
          true
        )
      }

      setStatus(
        error instanceof
          Error
          ? error.message
          : "Receipt scan failed."
      )
    } finally {
      setScanning(
        false
      )
    }
  }

  /* ========================================
     SAVE EXPENSE
  ======================================== */

  async function save() {
    if (
      !data ||
      saving
    ) {
      return
    }

    if (
      !data.merchant.trim()
    ) {
      setValidationError(
        "Merchant name is required before saving."
      )

      return
    }

    if (
      !Number.isFinite(
        data.amount
      ) ||
      data.amount <= 0
    ) {
      setValidationError(
        "Enter a valid receipt total before saving."
      )

      return
    }

    if (
      data.date &&
      data.date >
      new Date()
        .toISOString()
        .slice(
          0,
          10
        )
    ) {
      setValidationError(
        "Receipt date cannot be in the future."
      )

      return
    }

    setValidationError(
      ""
    )

    setSaving(true)

    setStatus(
      "Saving expense..."
    )

    try {
      const response =
        await fetch(
          "/api/expenses",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  ...data,

                  source:
                    "receipt_scan",

                  date:
                    data.date ||
                    new Date()
                      .toISOString()
                      .slice(
                        0,
                        10
                      ),

                  notes: [
                    data.notes,

                    data.tax !=
                      null
                      ? `GST/Tax: ₹${data.tax}`
                      : null,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(
                      " · "
                    ),
                }
              ),
          }
        )

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          )

      if (
        !response.ok
      ) {
        if (
          response.status >=
          500
        ) {
          setConnectionError(
            true
          )
        }

        throw new Error(
          payload.error ||
          "Could not save expense."
        )
      }

      setStatus(
        "Expense saved successfully."
      )

      setData(null)
      setFile(null)
    } catch (
    error
    ) {
      if (
        !navigator.onLine ||
        error instanceof
        TypeError
      ) {
        setConnectionError(
          true
        )
      }

      setStatus(
        error instanceof
          Error
          ? error.message
          : "Could not save expense."
      )
    } finally {
      setSaving(
        false
      )
    }
  }

  /* ========================================
     FILE SELECT
  ======================================== */

  function chooseFile(
    selected:
      | File
      | null
  ) {
    setData(null)
    setStatus("")
    setValidationError("")
    setConnectionError(
      false
    )

    if (!selected) {
      setFile(null)
      return
    }

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]

    if (
      !allowed.includes(
        selected.type
      )
    ) {
      setFile(null)

      setStatus(
        "Please select a JPG, PNG, WEBP or PDF receipt."
      )

      return
    }

    if (
      selected.size >
      MAX_ORIGINAL_FILE_SIZE
    ) {
      setFile(null)

      setStatus(
        "This receipt is too large. Please choose an image smaller than 20 MB."
      )

      return
    }

    setFile(
      selected
    )
  }

  return (
    <AppShell>
      <Link
        href="/expenses"
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold accent transition hover:opacity-80"
      >
        ← Back to Expenses
      </Link>

      {connectionError && (
        <DataErrorState
          title="Receipt service unavailable"
          message="Check your internet connection and try again."
          onRetry={() =>
            setConnectionError(
              false
            )
          }
        />
      )}

      <div>
        <p className="eyebrow">
          WalletIQ AI Vision
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Scan Receipt
        </h2>

        <p className="mt-2 muted">
          Upload or capture a
          receipt and automatically
          extract merchant, total,
          date, tax and category.
        </p>
      </div>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* UPLOAD */}

        <div className="soft-panel min-w-0 overflow-hidden">
          <label className="grid min-h-80 w-full min-w-0 max-w-full cursor-pointer place-items-center overflow-hidden rounded-[22px] border border-dashed border-emerald-300/35 bg-emerald-300/5 p-4 text-center transition hover:bg-emerald-300/10 sm:p-6">
            <div className="w-full min-w-0 max-w-full">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-300/10 accent">
                <UploadCloud
                  size={
                    30
                  }
                />
              </div>

              <p className="mt-5 font-black">
                Choose or capture
                a receipt
              </p>

              <p className="mt-2 text-sm muted">
                JPG, PNG, WEBP or
                PDF
              </p>

              <p className="mt-1 text-xs muted">
                Camera photos are
                automatically
                optimized before
                scanning.
              </p>

              {file && (
                <div className="mx-auto mt-5 flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm accent">
                  <FileText
                    size={15}
                    className="shrink-0"
                  />

                  <span className="min-w-0 flex-1 truncate text-left">
                    {file.name}
                  </span>

                  <span className="shrink-0 whitespace-nowrap text-[10px] muted">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              )}
            </div>

            <input
              className="hidden"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(
                e
              ) =>
                chooseFile(
                  e.target
                    .files?.[0] ||
                  null
                )
              }
            />
          </label>

          <button
            type="button"
            disabled={
              !file ||
              scanning
            }
            onClick={
              scan
            }
            className="btn btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ScanLine
              size={
                18
              }
            />

            {scanning
              ? "Scanning with WalletIQ AI..."
              : "Extract with WalletIQ AI"}
          </button>

          {status && (
            <p className="mt-3 text-sm muted">
              {
                status
              }
            </p>
          )}

          {validationError && (
            <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-300">
              {
                validationError
              }
            </p>
          )}
        </div>

        {/* REVIEW */}

        <div className="soft-panel min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">
                Review
              </p>

              <h3 className="mt-1 text-lg font-black">
                Extracted data
              </h3>
            </div>

            {data && (
              <span className="rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-bold accent">
                Editable
              </span>
            )}
          </div>

          {!data ? (
            <div className="empty-state mt-5">
              <ScanLine
                className="mx-auto accent"
                size={
                  28
                }
              />

              <p className="mt-4 font-bold">
                No receipt
                scanned yet
              </p>

              <p className="mt-2 text-sm muted">
                WalletIQ AI results
                will appear here
                for you to review
                before saving.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Merchant
                </span>

                <input
                  className="input mt-1"
                  value={
                    data.merchant
                  }
                  onChange={(
                    e
                  ) =>
                    setData(
                      {
                        ...data,

                        merchant:
                          e.target
                            .value,
                      }
                    )
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Total
                </span>

                <input
                  className="input mt-1"
                  type="number"
                  step="0.01"
                  value={
                    data.amount
                  }
                  onChange={(
                    e
                  ) =>
                    setData(
                      {
                        ...data,

                        amount:
                          Number(
                            e.target
                              .value
                          ),
                      }
                    )
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Tax / GST
                </span>

                <input
                  className="input mt-1"
                  type="number"
                  step="0.01"
                  value={
                    data.tax ??
                    ""
                  }
                  onChange={(
                    e
                  ) =>
                    setData(
                      {
                        ...data,

                        tax:
                          e.target
                            .value
                            ? Number(
                              e
                                .target
                                .value
                            )
                            : null,
                      }
                    )
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Date
                </span>

                <input
                  className="input mt-1"
                  type="date"
                  max={new Date()
                    .toISOString()
                    .slice(
                      0,
                      10
                    )}
                  value={
                    data.date ||
                    ""
                  }
                  onChange={(
                    e
                  ) =>
                    setData(
                      {
                        ...data,

                        date:
                          e.target
                            .value ||
                          null,
                      }
                    )
                  }
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Category
                </span>

                <select
                  className="input mt-1"
                  value={
                    data.category
                  }
                  onChange={(
                    e
                  ) =>
                    setData(
                      {
                        ...data,

                        category:
                          e.target
                            .value,
                      }
                    )
                  }
                >
                  {categories.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Payment method
                </span>

                <select
                  className="input mt-1"
                  value={
                    data.paymentMethod
                  }
                  onChange={(
                    e
                  ) =>
                    setData(
                      {
                        ...data,

                        paymentMethod:
                          e.target
                            .value,
                      }
                    )
                  }
                >
                  {payments.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                        }
                      >
                        {
                          item
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider muted">
                  Notes
                </span>

                <input
                  className="input mt-1"
                  value={
                    data.notes ||
                    ""
                  }
                  onChange={(
                    e
                  ) =>
                    setData(
                      {
                        ...data,

                        notes:
                          e.target
                            .value ||
                          null,
                      }
                    )
                  }
                />
              </label>

              <button
                type="button"
                onClick={
                  save
                }
                disabled={
                  saving ||
                  data.amount <=
                  0
                }
                className="btn btn-primary sm:col-span-2 disabled:opacity-50"
              >
                <CheckCircle2
                  size={
                    18
                  }
                />

                {saving
                  ? "Saving..."
                  : "Save as expense"}
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}