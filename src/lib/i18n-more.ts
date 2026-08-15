import type { Lang } from "./i18n";

/** Labels added for supported-sites, theme toggle, update notifications and the bypass countdown. */
export type More = {
  waitTitle: string;
  waitSeconds: (n: number) => string;
  waitHint: string;
  processingTitle: string;
  processingHint: string;
  successTitle: string;
  successHint: string;
  cooldownTitle: string;
  sitesTitle: string;
  sitesSub: string;
  sitesEmpty: string;
  sitesSearch: string;
  statusAvailable: string;
  statusMaintenance: string;
  statusDisabled: string;
  siteName: string;
  siteDomain: string;
  siteCategory: string;
  siteOrder: string;
  siteVisible: string;
  siteStatus: string;
  siteDeleteTitle: string;
  siteDeleteBody: string;
  notifTitle: string;
  notifNew: string;
  notifReadAll: string;
  notifDetails: string;
  notifEmpty: string;
  notifImportant: string;
  notifUnread: string;
  themeDark: string;
  themeLight: string;
  themeToggle: string;
  important: string;
  siteAdd: string;
  siteEdit: string;
  siteSave: string;
  siteCancel: string;
  siteHidden: string;
  siteDelete: string;
};

export const more: Record<Lang, More> = {
  en: {
    waitTitle: "Please wait 30 seconds",
    waitSeconds: (n) => `${n}s remaining`,
    waitHint: "You can start another request when the countdown ends.",
    processingTitle: "Bypassing",
    processingHint: "Contacting the bypass engine. Please keep this page open.",
    successTitle: "Bypass completed",
    successHint: "Your result is ready to use.",
    cooldownTitle: "Please wait 30 seconds before starting another request",
    sitesTitle: "Supported websites",
    sitesSub: "Live status of the services our bypass engine currently handles.",
    sitesEmpty: "No supported websites yet.",
    sitesSearch: "Search website or domain",
    statusAvailable: "Available",
    statusMaintenance: "Under maintenance",
    statusDisabled: "Disabled",
    siteName: "Display name",
    siteDomain: "Domain or URL pattern",
    siteCategory: "Category",
    siteOrder: "Display order",
    siteVisible: "Visible publicly",
    siteStatus: "Status",
    siteDeleteTitle: "Delete this website?",
    siteDeleteBody: "It will be removed from the supported list. This cannot be undone.",
    notifTitle: "Notifications",
    notifNew: "New updates",
    notifReadAll: "Mark all as read",
    notifDetails: "View details",
    notifEmpty: "No new notifications",
    notifImportant: "Important",
    notifUnread: "Unread",
    themeDark: "Dark mode",
    themeLight: "Light mode",
    themeToggle: "Toggle light or dark mode",
    important: "Important",
    siteAdd: "Add website",
    siteEdit: "Edit",
    siteSave: "Save website",
    siteCancel: "Cancel",
    siteHidden: "Hidden",
    siteDelete: "Delete",
  },
  th: {
    waitTitle: "กรุณารอ 30 วินาที",
    waitSeconds: (n) => `เหลืออีก ${n} วินาที`,
    waitHint: "เมื่อนับถอยหลังครบ จะสามารถทำรายการถัดไปได้",
    processingTitle: "กำลังบายพาส",
    processingHint: "ระบบกำลังติดต่อเซิร์ฟเวอร์ กรุณาอย่าปิดหน้านี้",
    successTitle: "บายพาสสำเร็จ",
    successHint: "ผลลัพธ์ของคุณพร้อมใช้งาน",
    cooldownTitle: "กรุณารอ 30 วินาที ก่อนทำรายการถัดไป",
    sitesTitle: "เว็บไซต์ที่รองรับ",
    sitesSub: "สถานะล่าสุดของเว็บไซต์ที่ระบบบายพาสรองรับ",
    sitesEmpty: "ยังไม่มีเว็บไซต์ที่รองรับ",
    sitesSearch: "ค้นหาชื่อหรือโดเมน",
    statusAvailable: "ใช้งานได้",
    statusMaintenance: "กำลังแก้ไข",
    statusDisabled: "ปิดการใช้งาน",
    siteName: "ชื่อที่แสดง",
    siteDomain: "โดเมนหรือรูปแบบลิงก์",
    siteCategory: "หมวดหมู่",
    siteOrder: "ลำดับการแสดง",
    siteVisible: "แสดงต่อสาธารณะ",
    siteStatus: "สถานะ",
    siteDeleteTitle: "ลบเว็บไซต์นี้หรือไม่?",
    siteDeleteBody: "ระบบจะลบออกจากรายการที่รองรับ และไม่สามารถกู้คืนได้",
    notifTitle: "การแจ้งเตือน",
    notifNew: "อัปเดตใหม่",
    notifReadAll: "อ่านทั้งหมด",
    notifDetails: "ดูรายละเอียด",
    notifEmpty: "ไม่มีการแจ้งเตือนใหม่",
    notifImportant: "สำคัญ",
    notifUnread: "ยังไม่อ่าน",
    themeDark: "โหมดกลางคืน",
    themeLight: "โหมดกลางวัน",
    themeToggle: "สลับโหมดกลางวัน/กลางคืน",
    important: "สำคัญ",
    siteAdd: "เพิ่มเว็บไซต์",
    siteEdit: "แก้ไข",
    siteSave: "บันทึกเว็บไซต์",
    siteCancel: "ยกเลิก",
    siteHidden: "ซ่อนอยู่",
    siteDelete: "ลบ",
  },
};
