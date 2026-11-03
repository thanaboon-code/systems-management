// เลือกเดือน: ‹ [เดือน] › [เดือนนี้]
import Button from './Button.jsx'
import { shiftMonth, thisMonthISO } from '../utils/format.js'

export default function MonthNav({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => onChange(shiftMonth(value, -1))} aria-label="เดือนก่อนหน้า">‹</Button>
      <input
        type="month"
        className="rounded-lg border border-line bg-white px-3 py-1.5"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
      <Button onClick={() => onChange(shiftMonth(value, 1))} aria-label="เดือนถัดไป">›</Button>
      <Button variant="ghost" onClick={() => onChange(thisMonthISO())} disabled={value === thisMonthISO()}>
        เดือนนี้
      </Button>
    </div>
  )
}
