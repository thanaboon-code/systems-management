// เลือกวัน: ‹ [วันที่] › [วันนี้]
import Button from './Button.jsx'
import { shiftDate, todayISO } from '../utils/format.js'

export default function DateNav({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => onChange(shiftDate(value, -1))} aria-label="วันก่อนหน้า">‹</Button>
      <input
        type="date"
        className="rounded-lg border border-line bg-white px-3 py-1.5"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <Button onClick={() => onChange(shiftDate(value, 1))} aria-label="วันถัดไป">›</Button>
      <Button variant="ghost" onClick={() => onChange(todayISO())} disabled={value === todayISO()}>
        วันนี้
      </Button>
    </div>
  )
}
