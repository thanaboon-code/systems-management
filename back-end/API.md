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
| **ยอดเงินที่คำนวณ** | **ปัดเป็นบาทเต็ม** (สตางค์ ≥ 50 ขึ้น, < 50 ลง) ทั้งยอดแต่ละไซซ์และส่วนต่าง · น้ำหนัก/ราคาต่อกก. ยังมีทศนิยมได้ |
| ชื่อบ่อ / ไซซ์ / ปลายทาง | ถ้าเหมือนชื่อที่เคยใช้ (ไม่สนช่องว่าง/ตัวพิมพ์) ระบบใช้การสะกดเดิม เช่น `"โรงงานก"` → `"โรงงาน ก"` |
| ข้อความ error ของไซซ์ | บอกแถว เช่น `"แถวที่ 2: น้ำหนัก ทศนิยมได้ไม่เกิน 2 ตำแหน่ง"` |
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

### รายการที่ยกเลิกของวันนั้น (ไว้กู้คืน)
`GET /api/new-order/cancelled?date=2026-10-10` → `[ Order, ... ]` (date บังคับ)

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
    { "size": "66-70",  "destination": "โรงงาน ก", "weight": "5289.59", "buyPricePerKg": "150", "pricePerKg": "155" },
    { "size": "96-100", "destination": "กทม.",    "weight": "490.70",  "buyPricePerKg": "110", "pricePerKg": "120" }
  ]
}
```

| ช่อง | บังคับ | กฎ |
|---|---|---|
| `orderDate` | ✅ | YYYY-MM-DD, ต้องเป็นวันที่มีจริง |
| `pondName` | ✅ | ≤ 100 ตัวอักษร |
| `note` | | ≤ 191 ตัวอักษร |
| `includeMargin` | | true / false หักส่วนต่างหรือไม่ (ไม่ส่ง = false) |
| `marginRate` | | % ส่วนต่าง 0–100 (ไม่ส่ง = 1.5) · หักจาก**ยอดซื้อ** |
| `items` | ✅ | 1–50 แถว, ห้ามไซซ์ซ้ำ |
| `items[].size` | ✅ | ≤ 50 ตัวอักษร (`"66 - 70"` ระบบเก็บเป็น `"66-70"`) |
| `items[].destination` | | ≤ 100 ตัวอักษร |
| `items[].weight` | ✅ | > 0, ≤ 1,000,000 |
| `items[].buyPricePerKg` | ✅ | ราคา**ซื้อ**จากเจ้าของบ่อ/กก. ≥ 0, ≤ 100,000 |
| `items[].pricePerKg` | ✅ | ราคา**ขาย** (โรงงานรับซื้อ)/กก. ≥ 0, ≤ 100,000 |

### แก้ไข
`PUT /api/new-order/:id` → `Order`
- ส่ง body แบบเดียวกับ "เพิ่ม" **ทั้งชุด** (ไซซ์เก่าถูกแทนที่ทั้งหมด)
- ไม่ส่ง `includeMargin` / `marginRate` = ใช้ค่าเดิม
- `409` ถ้า order นี้กดจ่าย/รับเงินแล้ว หรือถูกยกเลิก

### ยกเลิก / กู้คืน
- `DELETE /api/new-order/:id` → ยกเลิก (ไม่ลบจริง) → `Order`
  - `409` ถ้ากดจ่าย/รับเงินแล้ว (ต้องยกเลิกติ๊กก่อน)
- `PATCH /api/new-order/:id/restore` → กู้คืน → `Order`

### ปุ่มเช็กเงิน

**จ่ายเจ้าของบ่อ** (1 ปุ่มต่อ order)
`PATCH /api/new-order/:id/paid-to-farmer` body `{ "checked": true }`

**ได้รับเงิน** (1 ปุ่มต่อ**ปลายทาง**ใน order)
`PATCH /api/new-order/:id/received`

| body | ความหมาย |
|---|---|
| `{ "checked": true, "destination": "โรงงาน ก" }` | ได้รับจากโรงงาน ก แล้ว (ทุกไซซ์ที่ส่งไปโรงงาน ก ใน order นี้) |
| `{ "checked": true, "destination": null }` | ได้รับส่วนของไซซ์ที่ไม่ระบุปลายทาง |
| `{ "checked": true }` | ได้รับครบทุกปลายทางใน order |

- ส่ง `"checked": false` = ยกเลิกติ๊ก · กดซ้ำค่าเดิม เวลาที่กดครั้งแรกไม่เปลี่ยน
- `400` ถ้า order ไม่มีปลายทางนั้น · `409` ถ้า order ถูกยกเลิก
- สถานะอยู่ที่ `items[].isReceived` / `items[].receivedAt`
- `order.isReceived` = **รับครบทุกปลายทางแล้ว** (ระบบตั้งให้เอง) · `order.receivedAt` = เวลาที่รับครบ
- **ล็อกการแก้ไข/ยกเลิก** เมื่อ `isPaidToFarmer` หรือ**มีไซซ์ใดรับเงินแล้ว** (แม้ยังไม่ครบ)

Front-end จัดกลุ่มปุ่มรับเงินจาก `items` ตาม `destination`

### รูปร่างของ `Order`
```json
{
  "id": 1,
  "orderDate": "2026-10-10T00:00:00.000Z",
  "pondName": "จรัญ",
  "note": null,
  "totalWeight": "5780.29",
  "totalAmount": "878770",
  "includeMargin": false,
  "marginRate": "1.5",
  "marginAmount": "0",
  "grandTotal": "878770",
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
      "weight": "5289.59", "pricePerKg": "155", "amount": "819886",
      "isReceived": false, "receivedAt": null }
  ]
}
```
| ยอด | ความหมาย |
|---|---|
| `items[].buyAmount` | น้ำหนัก × ราคาซื้อ (ปัดบาท) |
| `items[].amount` | น้ำหนัก × ราคาขาย (ปัดบาท) = ยอดเก็บจากปลายทางนั้น |
| `totalAmount` | รวมยอดขาย = ยอดที่**เก็บจากโรงงาน** |
| `buyTotal` | รวมยอดซื้อ (ราคาบ่อ ก่อนหักส่วนต่าง) |
| `marginAmount` | ส่วนต่างที่**หักจากเจ้าของบ่อ** = buyTotal × marginRate% (ไม่หัก = 0) |
| `grandTotal` | ยอด**จ่ายเจ้าของบ่อ** = buyTotal − marginAmount |
| `profit` | **กำไร** = totalAmount − grandTotal (ติดลบ = ขาดทุน) |

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
    "grandTotal": "1071830.45"
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
  - `payToFarmer.amount` = รวม `grandTotal` ที่ยังไม่ได้จ่าย
  - `receive.amount` = รวมยอดไซซ์ที่ยังไม่ได้รับ · `receive.orderCount` = order ที่ยังรับไม่ครบ
- `day` มี `totalAmount` (เก็บจากโรงงาน), `buyTotal`, `marginAmount`, `grandTotal` (จ่ายเจ้าของบ่อ), `profit` (กำไร) · รายเดือน `totals` / `days[]` ก็เหมือนกัน
- `sizes[]` มี `avgBuyPricePerKg` (ซื้อเฉลี่ย) และ `avgPricePerKg` (ขายเฉลี่ย)
- ทุก response ของ `/api` ส่ง `Cache-Control: no-store` (ห้าม browser ใช้ผลเก่า)
- ไม่นับรายการที่ยกเลิก

---

## สรุปรายเดือน

`GET /api/dashboard/monthly?month=2026-10` (ไม่ส่ง month = เดือนนี้ตามเวลาไทย)

```json
{
  "month": "2026-10",
  "totals": { "orderCount": 4, "totalWeight": "7830.29", "totalAmount": "1244770.45",
              "marginAmount": "2445", "grandTotal": "1242325.45" },
  "days": [
    { "date": "2026-10-10", "orderCount": 2, "totalWeight": "...", "totalAmount": "1041770.45",
      "marginAmount": "2445", "grandTotal": "..." }
  ],
  "sizes": [ /* รูปแบบเดียวกับรายวัน */ ],
  "destinations": [ /* รูปแบบเดียวกับรายวัน */ ]
}
```
- `days` มีเฉพาะวันที่มี order เรียงจากวันแรกของเดือน
- ไม่นับรายการที่ยกเลิก

---

## ค้างรับเงินแยกตามโรงงาน / ปลายทาง

`GET /api/dashboard/receivables`

```json
{
  "total": "1151770.45",
  "destinations": [
    {
      "destination": "โรงงาน ก",
      "destinationKey": "โรงงาน ก",
      "amount": "1054886.45",
      "totalWeight": "6789.59",
      "orderCount": 3,
      "oldestDate": "2026-10-10",
      "orders": [
        { "orderId": 1, "orderDate": "2026-10-10", "pondName": "จรัญ", "amount": "819886.45" }
      ]
    }
  ]
}
```
- นับจาก**ไซซ์**ที่ยังไม่ได้ติ๊ก "ได้รับเงินแล้ว" ของปลายทางนั้น (ทุกวัน) · ไซซ์ที่ไม่ใส่ปลายทาง = `"ไม่ระบุ"`
- `destinationKey` = ค่าที่ใช้ส่งไปติ๊กรับเงิน (`null` = ไม่ระบุปลายทาง)
- `amount` = ยอดตามไซซ์ที่ส่งไปที่นั้น (ก่อนหักส่วนต่าง = ยอดที่ต้องเก็บจากที่นั้น)
- `total` = เท่ากับ `outstanding.receive.amount` ของ Dashboard รายวัน
- `oldestDate` = order ที่ค้างนานที่สุด · เรียงที่ค้างมากสุดขึ้นก่อน

---

## ค้างจ่ายเจ้าของบ่อแยกตามบ่อ

`GET /api/dashboard/payables`

```json
{
  "total": "212000",
  "ponds": [
    {
      "pondName": "จรัญ",
      "amount": "212000",
      "totalWeight": "1100",
      "orderCount": 2,
      "oldestDate": "2026-10-10",
      "orders": [
        { "orderId": 1, "orderDate": "2026-10-10", "amount": "197000" },
        { "orderId": 2, "orderDate": "2026-10-12", "amount": "15000" }
      ]
    }
  ]
}
```
- order ที่ยังไม่ได้ติ๊ก "จ่ายเจ้าของบ่อแล้ว" (ทุกวัน, ไม่นับที่ยกเลิก) · `amount` = `grandTotal` (หลังหักส่วนต่าง)
- `total` = เท่ากับ `outstanding.payToFarmer.amount` ของ Dashboard รายวัน · เรียงค้างมากสุดก่อน

---

## หน้าจอที่แนะนำ (map กับ API)

| หน้า | API ที่ใช้ |
|---|---|
| Dashboard (หน้าแรก) | `GET /api/dashboard?date=` |
| สรุปรายเดือน | `GET /api/dashboard/monthly?month=` |
| ค้างรับแยกโรงงาน | `GET /api/dashboard/receivables` |
| ค้างจ่ายแยกบ่อ | `GET /api/dashboard/payables` |
| รายการรายวัน + 2 ปุ่มติ๊ก | `GET /api/new-order?date=` + `PATCH .../paid-to-farmer`, `.../received` |
| ฟอร์มเพิ่ม/แก้ order | `GET /api/new-order/options` (ช่องเลือก) + `POST` / `PUT` |
| รายละเอียด order | `GET /api/new-order/:id` + ยกเลิก/กู้คืน |
