// หน้ารายละเอียด order + 2 ปุ่มติ๊กเงิน + แก้ไข / ยกเลิก / กู้คืน
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { cancelOrder, getOrder, restoreOrder } from '../api/orders.js'
import { formatDate, formatDateTime, formatMoney, formatWeight, toDateOnly } from '../utils/format.js'
import { isSettled } from '../utils/receipts.js'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import OrderPayments from '../components/OrderPayments.jsx'

export default function OrderDetailPage() {
  const { id } = useParams()
  const [result, setResult] = useState({ order: null, error: null })
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let ignore = false
    getOrder(id)
      .then((order) => !ignore && setResult({ order, error: null }))
      .catch((error) => !ignore && setResult({ order: null, error }))
    return () => {
      ignore = true
    }
  }, [id])

  const { order, error } = result
  if (error) return <Alert>{error.message}</Alert>
  if (!order) return <p className="text-muted">กำลังโหลด…</p>

  const settled = isSettled(order)

  const setOrder = (updated) => {
    setActionError('')
    setResult({ order: updated, error: null })
  }

  async function runAction(apiCall) {
    setBusy(true)
    try {
      setOrder(await apiCall(order.id))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    if (window.confirm('ยกเลิกรายการนี้?\nข้อมูลยังเก็บไว้ และกู้คืนได้ภายหลัง')) runAction(cancelOrder)
  }

  return (
    <section className="space-y-4">
      <Link to={`/orders?date=${toDateOnly(order.orderDate)}`} className="text-sm text-primary hover:underline">
        ‹ กลับไปรายการวันที่ {formatDate(order.orderDate)}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.pondName}</h1>
          <p className="text-muted">
            Order #{order.id} · {formatDate(order.orderDate)}
            {order.note && ` · ${order.note}`}
          </p>
        </div>
        {!order.isCancelled && (
          <div className="flex gap-2">
            {settled ? (
              <Button disabled title="ปิดเงินแล้ว ต้องยกเลิกติ๊กก่อน">🔒 แก้ไข</Button>
            ) : (
              <Link to={`/orders/${order.id}/edit`}
                className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium hover:bg-page">
                แก้ไข
              </Link>
            )}
            <Button variant="danger" disabled={settled || busy} onClick={handleCancel}
              title={settled ? 'ปิดเงินแล้ว ต้องยกเลิกติ๊กก่อน' : undefined}>
              ยกเลิกรายการ
            </Button>
          </div>
        )}
      </div>

      {order.isCancelled && (
        <Alert type="info">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>รายการนี้ถูกยกเลิกแล้ว ({formatDateTime(order.cancelledAt)})</span>
            <Button variant="primary" disabled={busy} onClick={() => runAction(restoreOrder)}>กู้คืน</Button>
          </div>
        </Alert>
      )}
      <Alert>{actionError}</Alert>

      <div className={order.isCancelled ? 'space-y-4 opacity-60' : 'space-y-4'}>
        <OrderPayments order={order} onChange={setOrder} onError={setActionError} />

        {/* ---- ตารางไซซ์ ---- */}
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-page text-left text-muted">
              <tr>
                <th className="px-4 py-2">ไซซ์</th>
                <th className="px-4 py-2">ส่งไปที่</th>
                <th className="px-4 py-2 text-right">น้ำหนัก</th>
                <th className="px-4 py-2 text-right">ราคา/กก.</th>
                <th className="px-4 py-2 text-right">ยอดเงิน</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-2 font-medium">{item.size}</td>
                  <td className="px-4 py-2">{item.destination ?? <span className="text-muted">-</span>}</td>
                  <td className="px-4 py-2 text-right">{formatWeight(item.weight)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(item.pricePerKg)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ---- ยอดรวม ---- */}
        <Card className="ml-auto max-w-sm space-y-2">
          <Row label="น้ำหนักรวม" value={formatWeight(order.totalWeight)} />
          <Row label="ยอดรวมตามไซซ์ (ที่ต้องเก็บ)" value={formatMoney(order.totalAmount)} />
          <Row
            label={order.includeMargin ? `หักส่วนต่าง ${Number(order.marginRate)}%` : 'ส่วนต่าง (ไม่หัก)'}
            value={`− ${formatMoney(order.marginAmount)}`}
          />
          <div className="border-t border-line pt-2">
            <Row label="ยอดจ่ายเจ้าของบ่อ" value={formatMoney(order.grandTotal)} big />
          </div>
        </Card>
      </div>
    </section>
  )
}

function Row({ label, value, big }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={big ? 'text-xl font-bold text-primary' : 'font-medium'}>{value}</span>
    </div>
  )
}
