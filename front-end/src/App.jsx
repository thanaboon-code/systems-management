// แผนผังหน้าเว็บ: URL ไหน → แสดงหน้าไหน
import { Routes, Route } from 'react-router'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import OrderListPage from './pages/OrderListPage.jsx'
import OrderFormPage from './pages/OrderFormPage.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx'
import MonthlyPage from './pages/MonthlyPage.jsx'
import ReceivablesPage from './pages/ReceivablesPage.jsx'
import PayablesPage from './pages/PayablesPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* ทุกหน้าใช้ AppLayout (เมนู) ครอบ */}
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />                       {/* /               */}
        <Route path="orders" element={<OrderListPage />} />                {/* /orders         */}
        <Route path="orders/new" element={<OrderFormPage />} />            {/* /orders/new     */}
        <Route path="orders/:id" element={<OrderDetailPage />} />          {/* /orders/5       */}
        <Route path="orders/:id/edit" element={<OrderFormPage />} />       {/* /orders/5/edit  */}
        <Route path="monthly" element={<MonthlyPage />} />                 {/* /monthly        */}
        <Route path="receivables" element={<ReceivablesPage />} />         {/* /receivables    */}
        <Route path="payables" element={<PayablesPage />} />               {/* /payables       */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
