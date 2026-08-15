# DevilDev Hub

## Discord login

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. In OAuth2, add `http://localhost:3000/api/auth/discord/callback` as a Redirect URI.
3. Copy the Client ID and Client Secret into `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in `.env`.
4. Set `DISCORD_REDIRECT_URI` to that same URI. In production, use the public HTTPS domain in both Discord and `.env`.

The app requests only the `identify` and `email` scopes. Discord access tokens are used once to fetch the profile and are not stored. The Discord ID, display name, username, and avatar URL are stored in the local SQLite database.

โปรเจกต์นี้รันแบบ self-hosted ด้วย TanStack Start และเก็บข้อมูลด้วย SQLite โดยไม่พึ่ง Lovable หรือ Supabase

## เริ่มต้นใช้งาน

```bash
npm install
copy .env.example .env
npm run dev
```

ตั้ง `SESSION_SECRET` เป็นค่าสุ่มอย่างน้อย 32 ตัวอักษรก่อนใช้งานจริง ข้อมูลและไฟล์อัปโหลดจะอยู่ที่ `DATA_DIR` (ค่าเริ่มต้น `./data`) จึงควร mount โฟลเดอร์นี้เป็น persistent volume เมื่อ deploy

## บัญชีผู้ดูแล

กำหนด `ADMIN_EMAIL`, `ADMIN_PASSWORD` และ `ADMIN_USERNAME` ใน `.env` แอปจะสร้างบัญชีผู้ดูแลให้เมื่อเริ่มทำงาน หรือจะเลื่อนสิทธิ์บัญชีที่ใช้อีเมลตรงกับ `ADMIN_EMAIL` ให้เป็นผู้ดูแลโดยอัตโนมัติ

## คำสั่ง

- `npm run dev` — รันสำหรับพัฒนา
- `npm run build` — สร้าง production bundle
- `npm start` — รัน production server ที่ build แล้ว
- `npm run preview` — ทดลอง production bundle
- `npm run lint` — ตรวจโค้ด

สำหรับ production ให้รัน `npm run build` แล้ว `npm start` และ mount โฟลเดอร์ `DATA_DIR` เป็น persistent volume

เปิดเว็บในเบราว์เซอร์ที่ `http://localhost:3000` (`0.0.0.0` เป็น bind address ของเซิร์ฟเวอร์ ไม่ใช่ URL สำหรับเปิดเว็บ)

## การกู้รหัสผ่าน

หากต้องการส่งรหัส OTP ทางอีเมล ให้กำหนด `RESEND_API_KEY` และ `RESET_FROM_EMAIL` ในโหมดพัฒนา รหัสจะถูกพิมพ์ใน server console เมื่อยังไม่ได้ตั้งค่าผู้ส่งอีเมล
