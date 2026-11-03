// แถบสรุปตามปลายทาง (ยาวตามสัดส่วนยอดเงิน)
import Card from './Card.jsx'
import { formatMoney, formatWeight } from '../utils/format.js'

export default function DestinationBars({ destinations }) {
  const total = destinations.reduce((sum, d) => sum + Number(d.totalAmount), 0) || 1
  return (
    <Card className="space-y-3">
      <h3 className="font-semibold">สรุปตามปลายทาง</h3>
      {destinations.map((d) => (
        <div key={d.destination} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{d.destination}</span>
            <span className="text-muted">{formatWeight(d.totalWeight)}</span>
          </div>
          <div className="h-2 rounded-full bg-page">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(Number(d.totalAmount) / total) * 100}%` }} />
          </div>
          <div className="text-right text-sm font-medium">{formatMoney(d.totalAmount)}</div>
        </div>
      ))}
    </Card>
  )
}
