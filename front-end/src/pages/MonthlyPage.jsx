// หน้าสรุปรายเดือน
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getMonthlySummary } from '../api/dashboard.js'
import { formatDate, formatMoney, formatMonth, formatWeight, thisMonthISO } from '../utils/format.js'
import Alert from '../components/Alert.jsx'
import Card from '../components/Card.jsx'
import DestinationBars from '../components/DestinationBars.jsx'
import MonthNav from '../components/MonthNav.jsx'
import SizeTable from '../components/SizeTable.jsx'
import TotalsKpis from '../components/TotalsKpis.jsx'

export default function MonthlyPage() {
  // เก็บเดือนไว้ใน URL (/monthly?month=2026-10)
  const [searchParams, setSearchParams] = useSearchParams()
  const month = searchParams.get('month') ?? thisMonthISO()
  const [result, setResult] = useState({ data: null, error: null })

  useEffect(() => {
    let ignore = false
    getMonthlySummary(month)
      .then((data) => !ignore && setResult({ data, error: null }))
      .catch((error) => !ignore && setResult({ data: null, error }))
    return () => {
      ignore = true
    }
  }, [month])

  const { data, error } = result

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-bold">สรุปรายเดือน</h1>
      <MonthNav value={month} onChange={(m) => setSearchParams({ month: m })} />

      <Alert>{error?.message}</Alert>
      {!data && !error && <p className="text-muted">กำลังโหลด…</p>}

      {data && (
        <>
          <h2 className="text-lg font-semibold">{formatMonth(data.month)}</h2>
          <TotalsKpis totals={data.totals} />

          {data.totals.orderCount === 0 ? (
            <Card className="py-10 text-center text-muted">เดือนนี้ยังไม่มี order</Card>
          ) : (
            <>
              {/* ---- แยกรายวัน ---- */}
              <Card className="overflow-x-auto p-0">
                <h3 className="px-4 pt-4 font-semibold">แยกรายวัน</h3>
                <table className="mt-2 w-full min-w-[640px] text-sm">
                  <thead className="bg-page text-left text-muted">
                    <tr>
                      <th className="px-4 py-2">วันที่</th>
                      <th className="px-4 py-2 text-right">order</th>
                      <th className="px-4 py-2 text-right">น้ำหนัก</th>
                      <th className="px-4 py-2 text-right">ยอดที่ต้องเก็บ</th>
                      <th className="px-4 py-2 text-right">ส่วนต่าง</th>
                      <th className="px-4 py-2 text-right">จ่ายเจ้าของบ่อ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.map((d) => (
                      <tr key={d.date} className="border-t border-line">
                        <td className="px-4 py-2">
                          <Link to={`/orders?date=${d.date}`} className="text-primary hover:underline">
                            {formatDate(d.date)}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-right">{d.orderCount}</td>
                        <td className="px-4 py-2 text-right">{formatWeight(d.totalWeight)}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(d.totalAmount)}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(d.marginAmount)}</td>
                        <td className="px-4 py-2 text-right">{formatMoney(d.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-line font-semibold">
                    <tr>
                      <td className="px-4 py-2">รวม</td>
                      <td className="px-4 py-2 text-right">{data.totals.orderCount}</td>
                      <td className="px-4 py-2 text-right">{formatWeight(data.totals.totalWeight)}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(data.totals.totalAmount)}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(data.totals.marginAmount)}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(data.totals.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Card>

              <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                <SizeTable sizes={data.sizes} />
                <DestinationBars destinations={data.destinations} />
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
