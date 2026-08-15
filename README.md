# DevilDev Hub

## Discord login

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. In OAuth2, add `http://localhost:3000/api/auth/discord/callback` as a Redirect URI.
3. Copy the Client ID and Client Secret into `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in `.env`.
4. Set `DISCORD_REDIRECT_URI` to that same URI. In production, use the public HTTPS domain in both Discord and `.env`.

The app requests only the `identify` and `email` scopes. Discord access tokens are used once to fetch the profile and are not stored. The Discord ID, display name, username, and avatar URL are stored in the local SQLite database.

โปรเจกต์นี้รันแบบ self-hosted ด้วย TanStack Start และเก็บข้อมูลด้วย SQLite โดยไม่พึ่ง Lovable หรือ Supabase

เมื่อกำหนด `DATABASE_URL` ระบบจะใช้ Neon PostgreSQL แทน SQLite โดยอัตโนมัติ
เหมาะสำหรับ Render Free ซึ่งไม่มี Persistent Disk ข้อมูลผู้ใช้ โปรไฟล์ Discord แพ็กเกจ
ประวัติ การตั้งค่าหลังบ้าน และภาพพื้นหลังจะถูกเก็บใน PostgreSQL

## เริ่มต้นใช้งาน

```bash
npm install
copy .env.example .env
npm run dev
```

ตั้ง `SESSION_SECRET` เป็นค่าสุ่มอย่างน้อย 32 ตัวอักษรก่อนใช้งานจริง ข้อมูลและไฟล์อัปโหลดจะอยู่ที่ `DATA_DIR` (ค่าเริ่มต้น `./data`) จึงควร mount โฟลเดอร์นี้เป็น persistent volume เมื่อ deploy

## บัญชีผู้ดูแล

กำหนด `OWNER_DISCORD_ID` เป็น Discord User ID ของเจ้าของเว็บ บัญชี Discord ที่มี ID ตรงกันจะได้รับสิทธิ์แอดมินอัตโนมัติทุกครั้งที่เข้าสู่ระบบ จากนั้นเปิดหลังบ้านได้ที่ `/admin`

## IXCore bypass API

กำหนด `IXCORE_API_KEY` ใน environment ของเซิร์ฟเวอร์ ระบบจะสร้างงานผ่าน `/rent/v2/bypass` และตรวจผลจาก `/rent/v2/job/{jobId}` ทุก 3 วินาที โดยส่ง API key ใน header `x-api-key`

## คำสั่ง

- `npm run dev` — รันสำหรับพัฒนา
- `npm run build` — สร้าง production bundle
- `npm start` — รัน production server ที่ build แล้ว
- `npm run preview` — ทดลอง production bundle
- `npm run lint` — ตรวจโค้ด

สำหรับ production ให้รัน `npm run build` แล้ว `npm start` และ mount โฟลเดอร์ `DATA_DIR` เป็น persistent volume

### Render และการเก็บข้อมูลถาวร

SQLite และรูปที่อัปโหลดถูกเก็บไว้ในโฟลเดอร์ `DATA_DIR` หากใช้ Render ให้เพิ่ม
Persistent Disk โดยกำหนด mount path เป็น `/var/data` แล้วตั้ง environment variable
`DATA_DIR=/var/data` ให้ตรงกัน หากไม่มี disk ข้อมูลจะหายเมื่อ service restart, spin down
หรือ deploy ใหม่ โดย Render Free Web Service ไม่รองรับ Persistent Disk

สำหรับ Render Free ให้สร้างฐานข้อมูล Neon แล้วเพิ่ม connection string ใน Environment เป็น
`DATABASE_URL` ระบบจะสร้างตารางและข้อมูลตั้งต้นให้โดยอัตโนมัติเมื่อมีคำขอแรก ไม่ต้องตั้ง
`DATA_DIR` สำหรับฐานข้อมูล และห้าม commit connection string ลง GitHub

เปิดเว็บในเบราว์เซอร์ที่ `http://localhost:3000` (`0.0.0.0` เป็น bind address ของเซิร์ฟเวอร์ ไม่ใช่ URL สำหรับเปิดเว็บ)
