// หน้าค้างรับเงิน แยกตามโรงงาน/ปลายทาง
// นับจากไซซ์ที่ยังไม่ได้ติ๊ก "ได้รับเงินแล้ว" ของปลายทางนั้น
// กด "ได้รับแล้ว" ที่แต่ละ order ได้เลย
import { useEffect, useState } from 'react'
import useAutoRefresh from '../hooks/useAutoRefresh.js'
import { Link } from 'react-router'
import { getReceivables } from '../api/dashboard.js'
import { setReceived } from '../api/orders.js'
import Button from '../components/Button.jsx'
import { daysSince, formatDate, formatMoney, formatWeight } from '../utils/format.js'
import Alert from '../components/Alert.jsx'
import Card from '../components/Card.jsx'

export default function ReceivablesPage() {
  const [result, setResult] = useState({ data: null, error: null })
  const [reloadKey, setReloadKey] = useState(0) // เพิ่มค่า → โหลดใหม่
  const [busyKey, setBusyKey] = useState(null)   // แถวที่กำลังบันทึก
  const [actionError, setActionError] = useState('')

  const refreshKey = useAutoRefresh() // โหลดใหม่เมื่อกลับมาที่หน้าจอ + ทุก 30 วินาที

  useEffect(() => {
    let ignore = false
    getReceivables()
      .then((data) => !ignore && setResult({ data, error: null }))
      .catch((error) => !ignore && setResult({ data: null, error }))
    return () => {
      ignore = true
    }
  }, [reloadKey, refreshKey])

  const { data, error } = result

  async function markReceived(orderId, destination, label) {
    if (!window.confirm(`ยืนยันได้รับเงินจาก ${label} ของ order #${orderId} แล้ว?`)) return
    const key = `${orderId}|${label}`
    setBusyKey(key)
    setActionError('')
    try {
      await setReceived(orderId, true, destination)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">ค้างรับเงินแยกตามโรงงาน</h1>

      <Alert>{error?.message || actionError}</Alert>
      {!data && !error && <p className="text-muted">กำลังโหลด…</p>}

      {data && (
        <>
          <Card className={data.destinations.length ? 'border-pending/40 bg-pending/5' : ''}>
            <div className="text-sm text-muted">ค้างรับทั้งหมด</div>
            <div className={`text-3xl font-bold ${data.destinations.length ? 'text-pending' : 'text-done'}`}>
              {formatMoney(data.total)}
            </div>
            <div className="text-sm text-muted">
              {data.destinations.length ? `${data.destinations.length} ที่` : 'ไม่มียอดค้าง 🎉'}
            </div>
          </Card>

          <div className="space-y-3">
            {data.destinations.map((d) => {
              const days = daysSince(d.oldestDate)
              return (
                <Card key={d.destination} className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-semibold">{d.destination}</div>
                      <div className="text-sm text-muted">
                        {d.orderCount} order · {formatWeight(d.totalWeight)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-pending">{formatMoney(d.amount)}</div>
                      <div className={`text-sm ${days > 7 ? 'font-medium text-danger' : 'text-muted'}`}>
                        ค้างนานสุดตั้งแต่ {formatDate(d.oldestDate)} ({days} วัน)
                      </div>
                    </div>
                  </div>

                  {/* กดเพื่อดูว่าค้าง order ไหนบ้าง */}
                  <details>
                    <summary className="cursor-pointer text-sm text-primary">ดูรายการที่ค้าง</summary>
                    <ul className="mt-2 divide-y divide-line text-sm">
                      {d.orders.map((o) => (
                        <li key={o.orderId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                          <Link to={`/orders/${o.orderId}`} className="text-primary hover:underline">
                            {formatDate(o.orderDate)} · {o.pondName}
                          </Link>
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{formatMoney(o.amount)}</span>
                            <Button
                              variant="primary"
                              disabled={busyKey !== null}
                              onClick={() => markReceived(o.orderId, d.destinationKey, d.destination)}
                            >
                              {busyKey === `${o.orderId}|${d.destination}` ? 'กำลังบันทึก…' : 'ได้รับแล้ว'}
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
