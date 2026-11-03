// โครงหน้า: เมนู + พื้นที่แสดงหน้า (Outlet)
// จอคอม: เมนูซ้าย · มือถือ: เมนูล่าง
import { NavLink, Outlet } from 'react-router'

const menu = [
  { to: '/', label: 'แดชบอร์ด', end: true },
  { to: '/orders', label: 'รายการ', end: true },
  { to: '/monthly', label: 'รายเดือน' },
  { to: '/payables', label: 'ค้างจ่าย' },
  { to: '/receivables', label: 'ค้างรับ' },
  { to: '/orders/new', label: '+ เพิ่ม' },
]

// NavLink ส่ง isActive มาให้ → เปลี่ยนสีเมนูที่เปิดอยู่
const linkClass = ({ isActive }) =>
  `rounded-lg px-2 py-2 text-center text-sm sm:px-3 sm:text-left sm:text-base ${
    isActive ? 'bg-primary text-white' : 'hover:bg-page'
  }`

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col-reverse sm:flex-row">
      <nav className="sticky bottom-0 flex justify-around gap-1 border-t border-line bg-white p-2 sm:static sm:w-52 sm:flex-col sm:justify-start sm:border-t-0 sm:border-r sm:p-4">
        {menu.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
