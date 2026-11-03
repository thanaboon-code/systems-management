// ส่วนท้ายหน้ารายการ: order ที่ยกเลิกของวันนั้น + ปุ่มกู้คืน
// พับไว้ก่อน กดเปิดดูได้ · onRestored() = แจ้งหน้าแม่ให้โหลดรายการใหม่
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getCancelledOrders, restoreOrder } from '../api/orders.js'
import { formatDateTime, formatMoney } from '../utils/format.js'
import Alert from './Alert.jsx'
import Button from './Button.jsx'

export default function CancelledOrders({ date, onRestored }) {
  const [orders, setOrders] = useState([])
  const [reloadKey, setReloadKey] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    getCancelledOrders(date)
      .then((data) => !ignore && setOrders(data))
      .catch((err) => !ignore && setError(err.message))
    return () => {
      ignore = true
    }
  }, [date, reloadKey])

  async function handleRestore(id) {
    setBusyId(id)
    setError('')
    try {
      await restoreOrder(id)
      setReloadKey((k) => k + 1)
      onRestored()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  if (orders.length === 0 && !error) return null

  return (
    <details className="rounded-xl border border-line bg-white p-4">
      <summary className="cursor-pointer text-muted">รายการที่ยกเลิกของวันนี้ ({orders.length})</summary>
      <div className="mt-3 space-y-2">
        <Alert>{error}</Alert>
        <ul className="divide-y divide-line text-sm">
          {orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <Link to={`/orders/${o.id}`} className="font-medium text-muted line-through hover:underline">
                  {o.pondName}
                </Link>
                <span className="ml-2 text-muted">
                  {formatMoney(o.totalAmount)} · ยกเลิกเมื่อ {formatDateTime(o.cancelledAt)}
                </span>
              </div>
              <Button disabled={busyId !== null} onClick={() => handleRestore(o.id)}>
                {busyId === o.id ? 'กำลังกู้คืน…' : 'กู้คืน'}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
