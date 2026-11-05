// หน้าฟอร์มเพิ่ม / แก้ order
//   /orders/new       → เพิ่มใหม่
//   /orders/:id/edit  → แก้ไข (โหลด order เดิมมาใส่ฟอร์มก่อน)
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { createOrder, getOrder, getOrderOptions, updateOrder } from '../api/orders.js'
import { formatMoney, formatWeight, toDateOnly, todayISO } from '../utils/format.js'
import { previewTotals, rowAmount } from '../utils/preview.js'
import { isSettled } from '../utils/receipts.js'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'

let rowCounter = 0
const newRow = (item = {}) => ({
  key: ++rowCounter, // key ให้ React แยกแถว (ไม่ส่งไป server)
  size: item.size ?? '',
  destination: item.destination ?? '',
  weight: item.weight != null ? String(Number(item.weight)) : '',
  buyPricePerKg: item.buyPricePerKg != null ? String(Number(item.buyPricePerKg)) : '', // ราคาซื้อจากบ่อ
  pricePerKg: item.pricePerKg != null ? String(Number(item.pricePerKg)) : '',          // ราคาขายให้โรงงาน
})

const emptyForm = () => ({
  orderDate: todayISO(),
  pondName: '',
  note: '',
  includeMargin: false,
  marginRate: '1.5',
  items: [newRow()],
})

// order จาก server → ค่าในฟอร์ม
const formFromOrder = (order) => ({
  orderDate: toDateOnly(order.orderDate),
  pondName: order.pondName,
  note: order.note ?? '',
  includeMargin: order.includeMargin,
  marginRate: String(Number(order.marginRate)),
  items: order.items.map(newRow),
})

// ---------- หน้า: โหลดข้อมูลก่อน แล้วค่อยแสดงฟอร์ม ----------
export default function OrderFormPage() {
  const { id } = useParams()
  const [state, setState] = useState({ order: null, options: null, error: null })

  useEffect(() => {
    let ignore = false
    Promise.all([id ? getOrder(id) : null, getOrderOptions()])
      .then(([order, options]) => !ignore && setState({ order, options, error: null }))
      .catch((error) => !ignore && setState({ order: null, options: null, error }))
    return () => {
      ignore = true
    }
  }, [id])

  if (state.error) return <Alert>{state.error.message}</Alert>
  if (!state.options) return <p className="text-muted">กำลังโหลด…</p>

  // key: สลับจาก "แก้ไข" ไป "เพิ่มใหม่" → ล้างฟอร์มใหม่หมด
  return <OrderForm key={id ?? 'new'} order={state.order} options={state.options} />
}

// ---------- ตัวฟอร์ม ----------
function OrderForm({ order, options }) {
  const navigate = useNavigate()
  const isEdit = Boolean(order)
  const [form, setForm] = useState(() => (order ? formFromOrder(order) : emptyForm()))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // ล็อก: ปิดเงินแล้ว หรือ ยกเลิกแล้ว → แก้ไม่ได้ (กฎเดียวกับ back-end)
  const lockReason = !order
    ? ''
    : order.isCancelled
      ? 'รายการนี้ถูกยกเลิกแล้ว ต้องกู้คืนก่อนถึงจะแก้ไขได้'
      : isSettled(order)
        ? 'รายการนี้ปิดเงินแล้ว ต้องยกเลิกติ๊กก่อนถึงจะแก้ไขได้'
        : ''
  const locked = Boolean(lockReason)

  const totals = previewTotals(form.items, form.includeMargin, form.marginRate)

  // ---- แก้ค่าในฟอร์ม ----
  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const setItem = (key, field, value) =>
    setForm((f) => ({ ...f, items: f.items.map((it) => (it.key === key ? { ...it, [field]: value } : it)) }))
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, newRow()] }))
  const removeItem = (key) => setForm((f) => ({ ...f, items: f.items.filter((it) => it.key !== key) }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const body = {
      orderDate: form.orderDate,
      pondName: form.pondName,
      note: form.note,
      includeMargin: form.includeMargin,
      ...(form.includeMargin && { marginRate: form.marginRate }),
      items: form.items.map(({ size, destination, weight, buyPricePerKg, pricePerKg }) => ({
        size,
        destination,
        weight,
        buyPricePerKg,
        pricePerKg,
      })),
    }

    try {
      const saved = isEdit ? await updateOrder(order.id, body) : await createOrder(body)
      navigate(`/orders/${saved.id}`)
    } catch (err) {
      setError(err.message) // ข้อความภาษาไทยจาก back-end เช่น "ไซซ์ 66-70 ซ้ำในรายการเดียวกัน"
      setSaving(false)
    }
  }

  const input = 'w-full rounded-lg border border-line bg-white px-3 py-2 disabled:bg-page'
  const number = `${input} text-right`

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold">{isEdit ? `แก้ไข order #${order.id}` : 'เพิ่ม order'}</h1>

      <Alert type="warning">{lockReason}</Alert>
      <Alert>{error}</Alert>

      {/* ตัวเลือกเติมคำอัตโนมัติ (จากที่เคยกรอก) */}
      <datalist id="pond-options">{options.pondNames.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="size-options">{options.sizes.map((v) => <option key={v} value={v} />)}</datalist>
      <datalist id="destination-options">{options.destinations.map((v) => <option key={v} value={v} />)}</datalist>

      <fieldset disabled={locked || saving} className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* ---- ข้อมูลทั่วไป ---- */}
          <Card className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm text-muted">วันที่ *</span>
              <input type="date" required className={input} value={form.orderDate}
                onChange={(e) => setField('orderDate', e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted">ชื่อบ่อ *</span>
              <input required list="pond-options" className={input} value={form.pondName}
                placeholder="เช่น จรัญ" onChange={(e) => setField('pondName', e.target.value)} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm text-muted">หมายเหตุ</span>
              <input className={input} value={form.note} onChange={(e) => setField('note', e.target.value)} />
            </label>
          </Card>

          {/* ---- รายการไซซ์ ---- */}
          <Card className="space-y-3">
            <h2 className="font-semibold">รายการไซซ์</h2>

            {form.items.map((item, index) => {
              const buy = rowAmount(item.weight, item.buyPricePerKg)
              const sell = rowAmount(item.weight, item.pricePerKg)
              return (
                <div key={item.key} className="space-y-2 border-b border-line pb-3 last:border-0">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.2fr_1fr_1fr_1fr_auto] sm:items-end">
                    <label className="space-y-1">
                      <span className="text-xs text-muted">ไซซ์ *</span>
                      <input required list="size-options" className={input} value={item.size}
                        placeholder="66-70" onChange={(e) => setItem(item.key, 'size', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted">ส่งไปที่</span>
                      <input list="destination-options" className={input} value={item.destination}
                        placeholder="โรงงาน ก" onChange={(e) => setItem(item.key, 'destination', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted">น้ำหนัก (กก.) *</span>
                      <input required inputMode="decimal" className={number} value={item.weight}
                        onChange={(e) => setItem(item.key, 'weight', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted">ราคาซื้อ/กก. (บ่อ) *</span>
                      <input required inputMode="decimal" className={number} value={item.buyPricePerKg}
                        onChange={(e) => setItem(item.key, 'buyPricePerKg', e.target.value)} />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-muted">ราคาขาย/กก. (โรงงาน) *</span>
                      <input required inputMode="decimal" className={number} value={item.pricePerKg}
                        onChange={(e) => setItem(item.key, 'pricePerKg', e.target.value)} />
                    </label>
                    <Button variant="danger" className="self-end" aria-label={`ลบแถวที่ ${index + 1}`}
                      disabled={form.items.length === 1} onClick={() => removeItem(item.key)}>
                      ✕
                    </Button>
                  </div>
                  <div className="flex flex-wrap justify-end gap-x-4 text-sm text-muted">
                    <span>ยอดซื้อ <b className="text-ink">{formatMoney(buy)}</b></span>
                    <span>ยอดขาย <b className="text-ink">{formatMoney(sell)}</b></span>
                    <span>ส่วนต่างราคา <b className={sell - buy < 0 ? 'text-danger' : 'text-done'}>{formatMoney(sell - buy)}</b></span>
                  </div>
                </div>
              )
            })}

            <Button variant="ghost" onClick={addItem}>+ เพิ่มไซซ์</Button>
          </Card>
        </div>

        {/* ---- สรุปยอด (ตัวอย่าง) ---- */}
        <Card className="h-fit space-y-3 lg:sticky lg:top-6">
          <h2 className="font-semibold">สรุป</h2>
          <Row label="น้ำหนักรวม" value={formatWeight(totals.totalWeight)} />
          <Row label="ยอดขาย (เก็บจากโรงงาน)" value={formatMoney(totals.totalAmount)} />
          <Row label="ยอดซื้อจากบ่อ" value={formatMoney(totals.buyTotal)} />

          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-primary" checked={form.includeMargin}
              onChange={(e) => setField('includeMargin', e.target.checked)} />
            <span>หักส่วนต่าง</span>
            {form.includeMargin && (
              <>
                <input inputMode="decimal" className="w-16 rounded border border-line px-2 py-0.5 text-right"
                  value={form.marginRate} onChange={(e) => setField('marginRate', e.target.value)} />
                <span>%</span>
              </>
            )}
          </label>
          <Row label="หักส่วนต่างจากเจ้าของบ่อ" value={`− ${formatMoney(totals.marginAmount)}`} />

          <div className="space-y-2 border-t border-line pt-3">
            <Row label="ยอดจ่ายเจ้าของบ่อ" value={formatMoney(totals.grandTotal)} />
            <Row label="กำไร" value={formatMoney(totals.profit)} big negative={totals.profit < 0} />
          </div>
          <p className="text-xs text-muted">* ยอดจริงคำนวณโดยระบบตอนบันทึก</p>

          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" className="flex-1" disabled={locked || saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
            <Link to={isEdit ? `/orders/${order.id}` : '/orders'}
              className="rounded-lg border border-line bg-white px-3 py-1.5 font-medium hover:bg-page">
              ยกเลิก
            </Link>
          </div>
        </Card>
      </fieldset>
    </form>
  )
}

function Row({ label, value, big, negative }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={`${big ? 'text-xl font-bold' : 'font-medium'} ${negative ? 'text-danger' : big ? 'text-primary' : ''}`}>{value}</span>
    </div>
  )
}
