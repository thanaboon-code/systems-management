// ปุ่มกลางของระบบ — แต่งหน้าตาที่นี่ที่เดียว ทุกหน้าเปลี่ยนตาม
const variants = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'border border-line bg-white hover:bg-page',
  danger: 'border border-danger/30 bg-white text-danger hover:bg-danger/10',
  ghost: 'text-primary hover:bg-primary/10',
}

export default function Button({ variant = 'secondary', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
