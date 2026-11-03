// กล่องข้อความแจ้งเตือน: type = error | warning | info
const styles = {
  error: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-pending/30 bg-pending/10 text-pending',
  info: 'border-line bg-page text-muted',
}

export default function Alert({ type = 'error', children }) {
  if (!children) return null
  return <div className={`rounded-lg border px-4 py-3 ${styles[type]}`}>{children}</div>
}
