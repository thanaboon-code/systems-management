// ตัวนับที่เพิ่มขึ้นเองเมื่อควรโหลดข้อมูลใหม่ — ใส่ไว้ใน dependency ของ useEffect ที่โหลดข้อมูล
//   - กลับมาที่หน้าจอ/แท็บนี้ (เช่น ไปติ๊กจ่ายเงินจากมือถือหรืออีกแท็บ แล้วกลับมา)
//   - ทุก ๆ 30 วินาที ระหว่างเปิดหน้าจอค้างไว้
// แท็บที่ซ่อนอยู่จะไม่โหลด (ประหยัดเน็ต/แบต)
import { useEffect, useState } from 'react'

const INTERVAL_MS = 30_000

export default function useAutoRefresh(intervalMs = INTERVAL_MS) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let last = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last < 1000) return // focus + visibilitychange มาพร้อมกัน → นับครั้งเดียว
      last = Date.now()
      setTick((t) => t + 1)
    }

    const timer = setInterval(refresh, intervalMs)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [intervalMs])

  return tick
}
