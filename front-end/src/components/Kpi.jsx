// การ์ดตัวเลข 1 ช่อง
import Card from './Card.jsx'

export default function Kpi({ label, value, highlight }) {
  return (
    <Card className="space-y-1">
      <div className="text-sm text-muted">{label}</div>
      <div className={`text-lg font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </Card>
  )
}
