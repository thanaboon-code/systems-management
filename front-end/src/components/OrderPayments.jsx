// ปุ่มติ๊กเงินของ 1 order
//   ซ้าย: จ่ายเจ้าของบ่อ (1 ปุ่ม)
//   ขวา: ได้รับเงิน — 1 ปุ่มต่อ 1 ปลายทาง (โรงงาน ก, กทม., ...)
// onChange(orderใหม่) — ส่ง order ที่ server ตอบกลับมาให้หน้าแม่เอาไปแทนของเดิม
// onError(ข้อความ)   — แจ้ง error ให้หน้าแม่แสดง
import PaymentToggle from './PaymentToggle.jsx'
import { setPaidToFarmer, setReceived } from '../api/orders.js'
import { formatMoney } from '../utils/format.js'
import { groupReceipts } from '../utils/receipts.js'

export default function OrderPayments({ order, onChange, onError }) {
  async function run(apiCall) {
    try {
      onChange(await apiCall())
    } catch (error) {
      onError(error.message)
    }
  }

  const receipts = groupReceipts(order)

  return (
    <div className="grid gap-2 md:grid-cols-2">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">จ่ายเงิน</span>
        <PaymentToggle
          doneLabel="จ่ายเจ้าของบ่อแล้ว"
          pendingLabel="ยังไม่จ่ายเจ้าของบ่อ"
          detail={formatMoney(order.grandTotal)}
          checked={order.isPaidToFarmer}
          at={order.paidToFarmerAt}
          disabled={order.isCancelled}
          onToggle={(checked) => run(() => setPaidToFarmer(order.id, checked))}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">
          รับเงิน {receipts.length > 1 && `(${receipts.filter((r) => r.isReceived).length}/${receipts.length} ที่)`}
        </span>
        <div className="flex flex-col gap-2">
          {receipts.map((r) => (
            <PaymentToggle
              key={r.label}
              doneLabel={`ได้รับจาก ${r.label} แล้ว`}
              pendingLabel={`ยังไม่ได้รับจาก ${r.label}`}
              detail={formatMoney(r.amount)}
              checked={r.isReceived}
              at={r.receivedAt}
              disabled={order.isCancelled}
              onToggle={(checked) => run(() => setReceived(order.id, checked, r.destination))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
