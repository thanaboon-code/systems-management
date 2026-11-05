// แถวตัวเลขสรุป (ใช้ทั้งรายวันและรายเดือน)
import Kpi from './Kpi.jsx'
import { formatMoney, formatWeight } from '../utils/format.js'

export default function TotalsKpis({ totals }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Kpi label="จำนวน order" value={totals.orderCount} />
      <Kpi label="น้ำหนักรวม" value={formatWeight(totals.totalWeight)} />
      <Kpi label="ยอดเก็บจากโรงงาน" value={formatMoney(totals.totalAmount)} />
      <Kpi label="ยอดจ่ายเจ้าของบ่อ" value={formatMoney(totals.grandTotal)} />
      <Kpi label="ส่วนต่างที่หัก" value={formatMoney(totals.marginAmount)} />
      <Kpi label="กำไร" value={formatMoney(totals.profit)} highlight />
    </div>
  )
}
