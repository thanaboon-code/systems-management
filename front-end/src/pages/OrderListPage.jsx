// หน้ารายการรายวัน + 2 ปุ่มติ๊กเงิน + แบ่งหน้า
import { useEffect, useState } from 'react'
import useAutoRefresh from '../hooks/useAutoRefresh.js'
import { Link, useSearchParams } from 'react-router'
import { getOrders } from '../api/orders.js'
import { formatMoney, formatWeight, formatDate, todayISO } from '../utils/format.js'
import { isSettled } from '../utils/receipts.js'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import DateNav from '../components/DateNav.jsx'
import OrderPayments from '../components/OrderPayments.jsx'
import CancelledOrders from '../components/CancelledOrders.jsx'

export default function OrderListPage() {
  // เก็บวัน/หน้า ไว้ใน URL (/orders?date=2026-10-10&page=2) → กด back / refresh แล้วยังอยู่ที่เดิม
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('date') ?? todayISO()
  const page = Number(searchParams.get('page') ?? 1)

  const [result, setResult] = useState({ data: null, error: null })
  const [actionError, setActionError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // เพิ่มค่า → โหลดรายการใหม่ (เช่น หลังกู้คืน)

  const refreshKey = useAutoRefresh() // โหลดใหม่เมื่อกลับมาที่หน้าจอ + ทุก 30 วินาที

  useEffect(() => {
    let ignore = false
    getOrders({ date, page })
      .then((data) => !ignore && setResult({ data, error: null }))
      .catch((error) => !ignore && setResult({ data: null, error }))
    return () => {
      ignore = true
    }
  }, [date, page, reloadKey, refreshKey])

  const { data, error } = result

  // กดปุ่มติ๊กสำเร็จ → เอา order ใหม่จาก server มาแทนตัวเดิมในรายการ
  function replaceOrder(updated) {
    setActionError('')
    setResult((prev) => ({
      ...prev,
      data: { ...prev.data, data: prev.data.data.map((o) => (o.id === updated.id ? updated : o)) },
    }))
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">รายการ</h1>
        <Link to="/orders/new" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-white hover:bg-primary/90">
          + เพิ่ม order
        </Link>
      </div>

      <DateNav value={date} onChange={(d) => setSearchParams({ date: d })} />

      <Alert>{error?.message || actionError}</Alert>
      {!data && !error && <p className="text-muted">กำลังโหลด…</p>}

      {data?.total === 0 && (
        <Card className="py-10 text-center text-muted">
          วันที่ {formatDate(date)} ยังไม่มี order
        </Card>
      )}

      {data?.total > 0 && (
        <p className="text-sm text-muted">
          วันที่ {formatDate(date)} · {data.total} order
        </p>
      )}

      <div className="space-y-3">
        {data?.data.map((order) => (
          <Card key={order.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link to={`/orders/${order.id}`} className="text-lg font-semibold text-primary hover:underline">
                  {order.pondName}
                </Link>
                {isSettled(order) && (
                  <span className="ml-2 text-sm text-muted" title="ปิดเงินแล้ว แก้ไขไม่ได้">🔒</span>
                )}
                {order.includeMargin && (
                  <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                    หัก {Number(order.marginRate)}%
                  </span>
                )}
              </div>
              <div className="text-right text-sm">
                <div>น้ำหนัก {formatWeight(order.totalWeight)}</div>
                <div>เก็บจากโรงงาน <b>{formatMoney(order.totalAmount)}</b></div>
                <div>จ่ายเจ้าของบ่อ <b>{formatMoney(order.grandTotal)}</b></div>
                <div>กำไร <b className={Number(order.profit) < 0 ? 'text-danger' : 'text-primary'}>{formatMoney(order.profit)}</b></div>
              </div>
            </div>

            {/* ไซซ์ → ปลายทาง */}
            <div className="flex flex-wrap gap-1.5">
              {order.items.map((item) => (
                <span key={item.id} className="rounded-full bg-page px-2.5 py-0.5 text-sm">
                  {item.size}
                  {item.destination && <span className="text-muted"> → {item.destination}</span>}
                </span>
              ))}
            </div>

            <OrderPayments order={order} onChange={replaceOrder} onError={setActionError} />
          </Card>
        ))}
      </div>

      <CancelledOrders date={date} onRestored={() => setReloadKey((k) => k + 1)} />

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button disabled={page <= 1} onClick={() => setSearchParams({ date, page: page - 1 })}>
            ‹ ก่อนหน้า
          </Button>
          <span className="text-sm text-muted">หน้า {page} / {data.totalPages}</span>
          <Button disabled={page >= data.totalPages} onClick={() => setSearchParams({ date, page: page + 1 })}>
            ถัดไป ›
          </Button>
        </div>
      )}
    </section>
  )
}
