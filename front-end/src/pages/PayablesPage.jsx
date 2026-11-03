// หน้าค้างจ่ายเจ้าของบ่อ แยกตามบ่อ
// นับ order ที่ยังไม่ได้ติ๊ก "จ่ายเจ้าของบ่อแล้ว" · ยอด = หลังหักส่วนต่าง
// กด "จ่ายแล้ว" ที่แต่ละ order ได้เลย
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getPayables } from '../api/dashboard.js'
import { setPaidToFarmer } from '../api/orders.js'
import { daysSince, formatDate, formatMoney, formatWeight } from '../utils/format.js'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'

export default function PayablesPage() {
  const [result, setResult] = useState({ data: null, error: null })
  const [reloadKey, setReloadKey] = useState(0) // เพิ่มค่า → โหลดใหม่
  const [busyId, setBusyId] = useState(null)     // order ที่กำลังบันทึก
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let ignore = false
    getPayables()
      .then((data) => !ignore && setResult({ data, error: null }))
      .catch((error) => !ignore && setResult({ data: null, error }))
    return () => {
      ignore = true
    }
  }, [reloadKey])

  const { data, error } = result

  async function markPaid(order, pondName) {
    if (!window.confirm(`ยืนยันจ่ายเงิน ${formatMoney(order.amount)} ให้บ่อ ${pondName} (order #${order.orderId}) แล้ว?`)) return
    setBusyId(order.orderId)
    setActionError('')
    try {
      await setPaidToFarmer(order.orderId, true)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">ค้างจ่ายเจ้าของบ่อ</h1>

      <Alert>{error?.message || actionError}</Alert>
      {!data && !error && <p className="text-muted">กำลังโหลด…</p>}

      {data && (
        <>
          <Card className={data.ponds.length ? 'border-pending/40 bg-pending/5' : ''}>
            <div className="text-sm text-muted">ค้างจ่ายทั้งหมด</div>
            <div className={`text-3xl font-bold ${data.ponds.length ? 'text-pending' : 'text-done'}`}>
              {formatMoney(data.total)}
            </div>
            <div className="text-sm text-muted">
              {data.ponds.length ? `${data.ponds.length} บ่อ` : 'จ่ายครบทุกบ่อแล้ว 🎉'}
            </div>
          </Card>

          <div className="space-y-3">
            {data.ponds.map((p) => {
              const days = daysSince(p.oldestDate)
              return (
                <Card key={p.pondName} className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-semibold">บ่อ {p.pondName}</div>
                      <div className="text-sm text-muted">
                        {p.orderCount} order · {formatWeight(p.totalWeight)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-pending">{formatMoney(p.amount)}</div>
                      <div className={`text-sm ${days > 7 ? 'font-medium text-danger' : 'text-muted'}`}>
                        ค้างนานสุดตั้งแต่ {formatDate(p.oldestDate)} ({days} วัน)
                      </div>
                    </div>
                  </div>

                  <details>
                    <summary className="cursor-pointer text-sm text-primary">ดูรายการที่ค้าง</summary>
                    <ul className="mt-2 divide-y divide-line text-sm">
                      {p.orders.map((o) => (
                        <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <Link to={`/orders/${o.orderId}`} className="text-primary hover:underline">
                            {formatDate(o.orderDate)} · order #{o.orderId}
                          </Link>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{formatMoney(o.amount)}</span>
                            <Button variant="primary" disabled={busyId !== null} onClick={() => markPaid(o, p.pondName)}>
                              {busyId === o.orderId ? 'กำลังบันทึก…' : 'จ่ายแล้ว'}
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
