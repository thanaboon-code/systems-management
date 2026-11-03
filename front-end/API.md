# Management-System API (สำหรับ Front-end)

Base URL: `http://localhost:3000`

## กติกาทั่วไป

| เรื่อง | รูปแบบ |
|---|---|
| วันที่ที่ส่งไป | `"YYYY-MM-DD"` เช่น `"2026-10-10"` |
| วันที่ที่ได้กลับมา | `"2026-10-10T00:00:00.000Z"` → ใช้ `value.slice(0, 10)` อย่าใช้ `new Date()` แปลง |
| เวลาที่กดปุ่ม (`paidToFarmerAt`, `receivedAt`) | เวลา UTC → แสดงด้วย `toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })` |
| เงิน / น้ำหนักที่ได้กลับมา | เป็น **string** เช่น `"878770.45"` → แสดงด้วย `Number(v).toLocaleString('th-TH', { minimumFractionDigits: 2 })` ห้ามเอามาบวกลบเองที่ front-end |
| เงิน / น้ำหนักที่ส่งไป | string หรือ number ก็ได้ ทศนิยมไม่เกิน 2 ตำแหน่ง |
| Error | ทุก error ได้ `{ "message": "ข้อความภาษาไทย" }` → เอา `message` ไปแสดงได้เลย |

| Status | ความหมาย |
|---|---|
| 200 / 201 | สำเร็จ |
| 400 | ข้อมูลที่ส่งมาผิด (แสดง message ให้ผู้ใช้แก้) |
| 404 | ไม่พบรายการ |
| 409 | ทำไม่ได้ตามกฎ (ปิดเงินแล้ว / ยกเลิกแล้ว) |
| 500 | server พัง (ดู terminal ฝั่ง back-end) |

---

## Order

### ดูรายการ
`GET /api/new-order?date=2026-10-10&page=1&pageSize=50`

ทุกตัวไม่บังคับ · ไม่ส่ง `date` = ทุกวัน · ไม่แสดงรายการที่ยกเลิก

```json
{
  "data": [ Order, ... ],
  "page": 1,
  "pageSize": 50,
  "total": 2,
  "totalPages": 1
}
```

### ดูรายการเดียว
`GET /api/new-order/:id` → `Order`

### ตัวเลือกสำหรับช่องกรอก (เติมคำอัตโนมัติ)
`GET /api/new-order/options`
```json
{
  "sizes": ["40-50", "66-70", "96-100", "กุ้งนิ่ม"],
  "destinations": ["กทม.", "โรงงาน ก"],
  "pondNames": ["จรัญ", "สมชาย"]
}
```

### เพิ่ม
`POST /api/new-order` → `201` + `Order`
```json
{
  "orderDate": "2026-10-10",
  "pondName": "จรัญ",
  "note": "ไม่บังคับ",
  "includeMargin": false,
  "marginRate": "1.5",
  "items": [
    { "size": "66-70",  "destination": "โรงงาน ก", "weight": "5289.59", "pricePerKg": "155" },
    { "size": "96-100", "destination": "กทม.",    "weight": "490.70",  "pricePerKg": "120" }
  ]
}
```

| ช่อง | บังคับ | กฎ |
|---|---|---|
| `orderDate` | ✅ | YYYY-MM-DD, ต้องเป็นวันที่มีจริง |
| `pondName` | ✅ | ≤ 100 ตัวอักษร |
| `note` | | ≤ 191 ตัวอักษร |
| `includeMargin` | | true / false (ไม่ส่ง = false) |
| `marginRate` | | % ส่วนต่าง 0–100 (ไม่ส่ง = 1.5) |
| `items` | ✅ | 1–50 แถว, ห้ามไซซ์ซ้ำ |
| `items[].size` | ✅ | ≤ 50 ตัวอักษร (`"66 - 70"` ระบบเก็บเป็น `"66-70"`) |
| `items[].destination` | | ≤ 100 ตัวอักษร |
| `items[].weight` | ✅ | > 0, ≤ 1,000,000 |
| `items[].pricePerKg` | ✅ | ≥ 0, ≤ 100,000 |

### แก้ไข
`PUT /api/new-order/:id` → `Order`
- ส่ง body แบบเดียวกับ "เพิ่ม" **ทั้งชุด** (ไซซ์เก่าถูกแทนที่ทั้งหมด)
- ไม่ส่ง `includeMargin` / `marginRate` = ใช้ค่าเดิม
- `409` ถ้า order นี้กดจ่าย/รับเงินแล้ว หรือถูกยกเลิก

### ยกเลิก / กู้คืน
- `DELETE /api/new-order/:id` → ยกเลิก (ไม่ลบจริง) → `Order`
  - `409` ถ้ากดจ่าย/รับเงินแล้ว (ต้องยกเลิกติ๊กก่อน)
- `PATCH /api/new-order/:id/restore` → กู้คืน → `Order`

### 2 ปุ่มเช็กเงิน
| ปุ่ม | Request |
|---|---|
| จ่ายเจ้าของบ่อแล้ว | `PATCH /api/new-order/:id/paid-to-farmer` body `{ "checked": true }` |
| ได้รับเงินแล้ว | `PATCH /api/new-order/:id/received` body `{ "checked": true }` |

- ส่ง `{ "checked": false }` = ยกเลิกติ๊ก
- กดซ้ำค่าเดิม เวลาที่กดครั้งแรกไม่เปลี่ยน
- `409` ถ้า order ถูกยกเลิก

### รูปร่างของ `Order`
```json
{
  "id": 1,
  "orderDate": "2026-10-10T00:00:00.000Z",
  "pondName": "จรัญ",
  "note": null,
  "totalWeight": "5780.29",
  "totalAmount": "878770.45",
  "includeMargin": false,
  "marginRate": "1.5",
  "marginAmount": "0",
  "grandTotal": "878770.45",
  "isPaidToFarmer": false,
  "paidToFarmerAt": null,
  "isReceived": false,
  "receivedAt": null,
  "isCancelled": false,
  "cancelledAt": null,
  "createdAt": "2026-11-01T07:30:00.000Z",
  "updatedAt": "2026-11-01T07:30:00.000Z",
  "items": [
    { "id": 1, "orderId": 1, "size": "66-70", "destination": "โรงงาน ก",
      "weight": "5289.59", "pricePerKg": "155", "amount": "819886.45" }
  ]
}
```
| ยอด | ความหมาย |
|---|---|
| `totalAmount` | ราคาบ่อ = ยอดที่**จ่ายเจ้าของบ่อ** |
| `marginAmount` | ส่วนต่างที่เราได้ (ไม่บวก = 0) |
| `grandTotal` | ยอดที่**เราต้องเก็บ** = totalAmount + marginAmount |

---

## Dashboard

`GET /api/dashboard?date=2026-10-10` (ไม่ส่ง date = วันนี้ตามเวลาไทย)

```json
{
  "date": "2026-10-10",
  "day": {
    "orderCount": 2,
    "totalWeight": "7130.29",
    "totalAmount": "1074770.45",
    "marginAmount": "2940",
    "grandTotal": "1077710.45"
  },
  "sizes": [
    { "size": "66-70", "orderCount": 2, "totalWeight": "6289.59",
      "totalAmount": "979886.45", "avgPricePerKg": "155.79" }
  ],
  "destinations": [
    { "destination": "โรงงาน ก", "totalWeight": "6289.59", "totalAmount": "979886.45" }
  ],
  "outstanding": {
    "payToFarmer": { "orderCount": 2, "amount": "364000" },
    "receive":     { "orderCount": 3, "amount": "1245710.45" }
  }
}
```
- `day`, `sizes`, `destinations` = เฉพาะวันที่เลือก
- `outstanding` = ค้างสะสม **ทุกวัน** (ไม่ขึ้นกับ date)
- ไม่นับรายการที่ยกเลิก

---

## หน้าจอที่แนะนำ (map กับ API)

| หน้า | API ที่ใช้ |
|---|---|
| Dashboard (หน้าแรก) | `GET /api/dashboard?date=` |
| รายการรายวัน + 2 ปุ่มติ๊ก | `GET /api/new-order?date=` + `PATCH .../paid-to-farmer`, `.../received` |
| ฟอร์มเพิ่ม/แก้ order | `GET /api/new-order/options` (ช่องเลือก) + `POST` / `PUT` |
| รายละเอียด order | `GET /api/new-order/:id` + ยกเลิก/กู้คืน |
