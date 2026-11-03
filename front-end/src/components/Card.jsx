// กล่องพื้นขาว ขอบมน
export default function Card({ className = '', ...props }) {
  return <div className={`rounded-xl border border-line bg-white p-4 ${className}`} {...props} />
}
