import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">ไม่พบหน้านี้</h1>
      <Link to="/" className="text-primary hover:underline">กลับหน้าแรก</Link>
    </section>
  )
}
