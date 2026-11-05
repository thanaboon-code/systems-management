// ตารางสรุปตามไซซ์ (Summary Size Price)
import Card from './Card.jsx'
import { formatMoney, formatWeight } from '../utils/format.js'

export default function SizeTable({ sizes }) {
  return (
    <Card className="overflow-x-auto p-0">
      <h3 className="px-4 pt-4 font-semibold">สรุปตามไซซ์</h3>
      <table className="mt-2 w-full min-w-[560px] text-sm">
        <thead className="bg-page text-left text-muted">
          <tr>
            <th className="px-4 py-2">ไซซ์</th>
            <th className="px-4 py-2 text-right">order</th>
            <th className="px-4 py-2 text-right">น้ำหนัก</th>
            <th className="px-4 py-2 text-right">ยอดขาย</th>
            <th className="px-4 py-2 text-right">ซื้อเฉลี่ย/กก.</th>
            <th className="px-4 py-2 text-right">ขายเฉลี่ย/กก.</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((s) => (
            <tr key={s.size} className="border-t border-line">
              <td className="px-4 py-2 font-medium">{s.size}</td>
              <td className="px-4 py-2 text-right">{s.orderCount}</td>
              <td className="px-4 py-2 text-right">{formatWeight(s.totalWeight)}</td>
              <td className="px-4 py-2 text-right">{formatMoney(s.totalAmount)}</td>
              <td className="px-4 py-2 text-right">{formatMoney(s.avgBuyPricePerKg)}</td>
              <td className="px-4 py-2 text-right">{formatMoney(s.avgPricePerKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
