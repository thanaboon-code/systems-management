// แถวตัวเลขสรุป 5 ช่อง (ใช้ทั้งรายวันและรายเดือน)
import Kpi from './Kpi.jsx'
import { formatMoney, formatWeight } from '../utils/format.js'

export default function TotalsKpis({ totals }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi label="จำนวน order" value={totals.orderCount} />
      <Kpi label="น้ำหนักรวม" value={formatWeight(totals.totalWeight)} />
      <Kpi label="ยอดที่ต้องเก็บ" value={formatMoney(totals.totalAmount)} />
      <Kpi label="ส่วนต่างที่ได้" value={formatMoney(totals.marginAmount)} highlight />
      <Kpi label="ยอดจ่ายเจ้าของบ่อ" value={formatMoney(totals.grandTotal)} />
    </div>
  )
}
