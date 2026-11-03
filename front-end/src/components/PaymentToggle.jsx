// ปุ่มติ๊กเงิน 1 ปุ่ม (ใช้ทั้ง "จ่ายเจ้าของบ่อแล้ว" และ "ได้รับเงินแล้ว")
// onToggle(checked) ต้องคืน Promise — ระหว่างรอ ปุ่มจะกดไม่ได้
// detail = บรรทัดเล็กใต้ชื่อ เช่น ยอดเงิน
import { useState } from 'react'
import { formatDateTime } from '../utils/format.js'

export default function PaymentToggle({ doneLabel, pendingLabel, detail, checked, at, disabled, onToggle }) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    // ยกเลิกติ๊ก = เรื่องเงิน ถามก่อนกันกดพลาด
    if (checked && !window.confirm(`ยกเลิกสถานะ "${doneLabel}" ใช่ไหม?`)) return
    setBusy(true)
    try {
      await onToggle(!checked)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      aria-pressed={checked}
      className={`flex min-h-12 flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? 'border-done bg-done text-white'
          : 'border-pending/40 bg-white text-ink hover:bg-pending/10'
      }`}
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? 'border-white' : 'border-pending'
        }`}
      >
        {busy ? '…' : checked ? '✓' : ''}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{checked ? doneLabel : pendingLabel}</span>
        {detail && <span className="block text-xs opacity-90">{detail}</span>}
        {checked && at && <span className="block text-xs opacity-90">{formatDateTime(at)}</span>}
      </span>
    </button>
  )
}
