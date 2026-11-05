// หน้าแดชบอร์ด: ยอดค้างทั้งหมด + สรุปของวันที่เลือก
import { useEffect, useState } from 'react'
import useAutoRefresh from '../hooks/useAutoRefresh.js'
import { Link } from 'react-router'
import { getDashboard } from '../api/dashboard.js'
import { formatMoney, formatDate, todayISO } from '../utils/format.js'
import Alert from '../components/Alert.jsx'
import Card from '../components/Card.jsx'
import DateNav from '../components/DateNav.jsx'
import DestinationBars from '../components/DestinationBars.jsx'
import SizeTable from '../components/SizeTable.jsx'
import TotalsKpis from '../components/TotalsKpis.jsx'

export default function DashboardPage() {
  const [date, setDate] = useState(todayISO)
  const [result, setResult] = useState({ data: null, error: null })

  const refreshKey = useAutoRefresh() // โหลดใหม่เมื่อกลับมาที่หน้าจอ + ทุก 30 วินาที

  useEffect(() => {
    let ignore = false
    getDashboard(date)
      .then((data) => !ignore && setResult({ data, error: null }))
      .catch((error) => !ignore && setResult({ data: null, error }))
    return () => {
      ignore = true
    }
  }, [date, refreshKey])

  const { data, error } = result

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
      <DateNav value={date} onChange={setDate} />

      <Alert>{error?.message}</Alert>
      {!data && !error && <p className="text-muted">กำลังโหลด…</p>}

      {data && (
        <>
          {/* ---- ค้างทั้งหมด (สะสมทุกวัน) ---- */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Outstanding title="ค้างจ่ายเจ้าของบ่อ" {...data.outstanding.payToFarmer} link="/payables" linkText="ดูแยกตามบ่อ ›" />
            <Outstanding title="ค้างรับเงิน" {...data.outstanding.receive} link="/receivables" linkText="ดูแยกตามโรงงาน ›" />
          </div>

          {/* ---- ของวันที่เลือก ---- */}
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">วันที่ {formatDate(data.date)}</h2>
            <Link to={`/orders?date=${data.date}`} className="text-sm text-primary hover:underline">
              ดูรายการวันนี้ ›
            </Link>
          </div>
          <TotalsKpis totals={data.day} />

          {data.day.orderCount === 0 ? (
            <Card className="py-10 text-center text-muted">วันนี้ยังไม่มี order</Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <SizeTable sizes={data.sizes} />
              <DestinationBars destinations={data.destinations} />
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Outstanding({ title, amount, orderCount, link, linkText }) {
  const clear = orderCount === 0
  return (
    <Card className={clear ? '' : 'border-pending/40 bg-pending/5'}>
      <div className="text-sm text-muted">{title} · ค้างทั้งหมด</div>
      <div className={`text-2xl font-bold ${clear ? 'text-done' : 'text-pending'}`}>{formatMoney(amount)}</div>
      <div className="flex justify-between text-sm text-muted">
        <span>{clear ? 'ไม่มีค้าง' : `${orderCount} order`}</span>
        {link && !clear && <Link to={link} className="text-primary hover:underline">{linkText}</Link>}
      </div>
    </Card>
  )
}
