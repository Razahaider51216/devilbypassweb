import type { Lang } from "./i18n";

export type Extra = {
  tabLogin: string;
  tabRegister: string;
  usernameHint: string;
  forgot: string;
  resetTitle: string;
  resetSub: string;
  sendCode: string;
  codeSent: string;
  codeLabel: string;
  codeHint: string;
  verify: string;
  newPassword: string;
  updatePassword: string;
  passwordUpdated: string;
  backToLogin: string;
  resend: string;
  trialTitle: string;
  trialClaim: string;
  trialClaimed: string;
  trialActive: string;
  daysLeft: string;
  expires: string;
  bypassDisabled: string;
  menuAccount: string;
  menuPackages: string;
  menuContact: string;
  menuManage: string;
  menuLinks: string;
  adminPanel: string;
  myRequests: string;
  noRequests: string;
  search: string;
  refresh: string;
  save: string;
  saved: string;
  cancel: string;
  edit: string;
  add: string;
  logs: string;
  channels: string;
  settings: string;
  users: string;
  packages: string;
  requests: string;
  overview: string;
  setPassword: string;
  setPasswordHint: string;
  disableBypass: string;
  enableBypass: string;
  makeAdmin: string;
  removeAdmin: string;
  resetUsage: string;
  deleteUser: string;
  confirmDelete: string;
  durationDays: string;
  durationHint: string;
  note: string;
  approve: string;
  reject: string;
  applyPlan: string;
  none: string;
  adminOnly: string;
  goHome: string;
  announcements: string;
  announcement: string;
  changelog: string;
  changelogTitle: string;
  changelogSub: string;
  changelogEmpty: string;
  kindNew: string;
  kindFix: string;
  kindImprove: string;
  usageTitle: string;
  usageStep1: string;
  usageStep2: string;
  usageStep3: string;
  usageNote: string;
  imageUrl: string;
  linkUrl: string;
  version: string;
  titleField: string;
  bodyField: string;
  kindField: string;
  published: string;
  close: string;
  viewChangelog: string;
  recentTitle: string;
  recentLive: string;
  recentEmpty: string;
  recentNote: string;
  recentViewAll: string;
  recentShowLess: string;
  proBadge: string;
  clearAllTitle: string;
  clearAllBody: string;
  clearAllConfirm: string;
  viewDetails: string;
  hideDetails: string;
  openLink: string;
  statusSuccess: string;
  statusFailed: string;
  banner: string;
  bannerHint: string;
  bannerUpload: string;
  bannerRemove: string;
  bannerCurrent: string;
  bannerNone: string;
  bannerTooLarge: string;
  uploading: string;
};

export const extra: Record<Lang, Extra> = {
  en: {
    tabLogin: "Sign in",
    tabRegister: "Create account",
    usernameHint: "3-32 characters, letters, numbers and _",
    forgot: "Forgot password?",
    resetTitle: "Reset your password",
    resetSub: "We email you a 6-digit code. Enter it below to set a new password.",
    sendCode: "Send code",
    codeSent: "Code sent. Check your inbox.",
    codeLabel: "6-digit code",
    codeHint: "The code expires in 60 minutes.",
    verify: "Verify code",
    newPassword: "New password",
    updatePassword: "Update password",
    passwordUpdated: "Password updated. You are signed in.",
    backToLogin: "Back to sign in",
    resend: "Resend code",
    trialTitle: "Free trial",
    trialClaim: "Claim 7 days free",
    trialClaimed: "Trial already used",
    trialActive: "Trial active",
    daysLeft: "days left",
    expires: "Expires",
    bypassDisabled: "Bypass is disabled on your account. Contact an admin.",
    menuAccount: "Account",
    menuPackages: "Packages",
    menuContact: "Contact",
    menuManage: "Management",
    menuLinks: "Links",
    adminPanel: "Admin panel",
    myRequests: "My purchase requests",
    noRequests: "No requests yet.",
    search: "Search username or email",
    refresh: "Refresh",
    save: "Save",
    saved: "Saved",
    cancel: "Cancel",
    edit: "Edit",
    add: "Add",
    logs: "Bypass logs",
    channels: "Contact channels",
    settings: "Site settings",
    users: "Users",
    packages: "Packages",
    requests: "Requests",
    overview: "Overview",
    setPassword: "Set new password",
    setPasswordHint: "Passwords are encrypted and cannot be read — you can only replace them.",
    disableBypass: "Disable bypass",
    enableBypass: "Enable bypass",
    makeAdmin: "Make admin",
    removeAdmin: "Remove admin",
    resetUsage: "Reset today's usage",
    deleteUser: "Delete user",
    confirmDelete: "Delete this account permanently?",
    durationDays: "Duration (days)",
    durationHint: "0 or empty = never expires",
    note: "Note",
    approve: "Approve",
    reject: "Reject",
    applyPlan: "Apply package on approve",
    none: "None",
    adminOnly: "Admins only.",
    goHome: "Go home",
    announcements: "Announcements",
    announcement: "Announcement",
    changelog: "Bypass update log",
    changelogTitle: "Bypass update log",
    changelogSub: "Every engine update, fix and improvement in one place.",
    changelogEmpty: "No updates published yet.",
    kindNew: "New",
    kindFix: "Fix",
    kindImprove: "Improved",
    usageTitle: "How to use",
    usageStep1: "Copy the locked or shortened link you want to open.",
    usageStep2: "Paste it in the box above and press bypass.",
    usageStep3: "Copy the key or destination we return — history keeps your last 10 results.",
    usageNote: "Daily quota depends on your package. Free trial lasts 7 days and reverts to Free automatically.",
    imageUrl: "Image URL",
    linkUrl: "Link URL",
    version: "Version",
    titleField: "Title",
    bodyField: "Details",
    kindField: "Type",
    published: "Published",
    close: "Close",
    viewChangelog: "Open update log",
    recentTitle: "Recent bypasses",
    recentLive: "Live",
    recentEmpty: "No bypasses yet.",
    recentNote: "Keys are partially hidden for privacy. Updates in real time.",
    recentViewAll: "View all",
    recentShowLess: "Show less",
    proBadge: "Pro member",
    clearAllTitle: "Clear all recent items?",
    clearAllBody: "This permanently removes every saved result on this device. This cannot be undone.",
    clearAllConfirm: "Yes, clear everything",
    viewDetails: "View details",
    hideDetails: "Hide details",
    openLink: "Open link",
    statusSuccess: "Success",
    statusFailed: "Failed",
    banner: "Background banner",
    bannerHint: "Shown behind the whole site. Images are resized and compressed to max 1920px / ~1MB.",
    bannerUpload: "Upload image",
    bannerRemove: "Remove banner",
    bannerCurrent: "Current banner",
    bannerNone: "No banner set.",
    bannerTooLarge: "Image is too large. Pick a file under 10MB.",
    uploading: "Uploading...",
  },
  th: {
    tabLogin: "เข้าสู่ระบบ",
    tabRegister: "สมัครสมาชิก",
    usernameHint: "3-32 ตัวอักษร ใช้ a-z 0-9 และ _",
    forgot: "ลืมรหัสผ่าน?",
    resetTitle: "รีเซ็ตรหัสผ่าน",
    resetSub: "เราจะส่งรหัส 6 หลักไปที่อีเมลของคุณ กรอกรหัสเพื่อตั้งรหัสผ่านใหม่",
    sendCode: "ส่งรหัส",
    codeSent: "ส่งรหัสแล้ว กรุณาตรวจสอบอีเมล",
    codeLabel: "รหัส 6 หลัก",
    codeHint: "รหัสหมดอายุใน 60 นาที",
    verify: "ยืนยันรหัส",
    newPassword: "รหัสผ่านใหม่",
    updatePassword: "บันทึกรหัสผ่าน",
    passwordUpdated: "เปลี่ยนรหัสผ่านแล้ว เข้าสู่ระบบเรียบร้อย",
    backToLogin: "กลับไปเข้าสู่ระบบ",
    resend: "ส่งรหัสอีกครั้ง",
    trialTitle: "ทดลองใช้ฟรี",
    trialClaim: "รับสิทธิ์ฟรี 7 วัน",
    trialClaimed: "ใช้สิทธิ์ทดลองแล้ว",
    trialActive: "กำลังทดลองใช้",
    daysLeft: "วันที่เหลือ",
    expires: "หมดอายุ",
    bypassDisabled: "บัญชีของคุณถูกปิดการใช้งาน Bypass กรุณาติดต่อแอดมิน",
    menuAccount: "บัญชี",
    menuPackages: "แพ็กเกจ",
    menuContact: "ติดต่อ",
    menuManage: "จัดการระบบ",
    menuLinks: "ลิงก์",
    adminPanel: "หน้าจัดการแอดมิน",
    myRequests: "คำขอซื้อของฉัน",
    noRequests: "ยังไม่มีคำขอ",
    search: "ค้นหาชื่อผู้ใช้หรืออีเมล",
    refresh: "รีเฟรช",
    save: "บันทึก",
    saved: "บันทึกแล้ว",
    cancel: "ยกเลิก",
    edit: "แก้ไข",
    add: "เพิ่ม",
    logs: "ประวัติการใช้งาน",
    channels: "ช่องทางติดต่อ",
    settings: "ตั้งค่าเว็บไซต์",
    users: "ผู้ใช้",
    packages: "แพ็กเกจ",
    requests: "คำขอซื้อ",
    overview: "ภาพรวม",
    setPassword: "ตั้งรหัสผ่านใหม่",
    setPasswordHint: "รหัสผ่านถูกเข้ารหัส ไม่สามารถดูได้ ทำได้เพียงตั้งใหม่",
    disableBypass: "ปิดการใช้ Bypass",
    enableBypass: "เปิดการใช้ Bypass",
    makeAdmin: "ตั้งเป็นแอดมิน",
    removeAdmin: "ถอดสิทธิ์แอดมิน",
    resetUsage: "รีเซ็ตยอดใช้วันนี้",
    deleteUser: "ลบผู้ใช้",
    confirmDelete: "ต้องการลบบัญชีนี้ถาวรหรือไม่?",
    durationDays: "ระยะเวลา (วัน)",
    durationHint: "0 หรือเว้นว่าง = ไม่มีวันหมดอายุ",
    note: "หมายเหตุ",
    approve: "อนุมัติ",
    reject: "ปฏิเสธ",
    applyPlan: "ปรับแพ็กเกจให้อัตโนมัติเมื่ออนุมัติ",
    none: "ไม่มี",
    adminOnly: "สำหรับแอดมินเท่านั้น",
    goHome: "กลับหน้าแรก",
    announcements: "ประกาศ",
    announcement: "ประกาศ",
    changelog: "อัปเดตระบบบายพาส",
    changelogTitle: "บันทึกอัปเดตระบบบายพาส",
    changelogSub: "รวมทุกการอัปเดต แก้บั๊ก และปรับปรุงระบบไว้ที่เดียว",
    changelogEmpty: "ยังไม่มีรายการอัปเดต",
    kindNew: "ใหม่",
    kindFix: "แก้ไข",
    kindImprove: "ปรับปรุง",
    usageTitle: "วิธีใช้งาน",
    usageStep1: "คัดลอกลิงก์ที่ถูกล็อกหรือย่อมาให้เรียบร้อย",
    usageStep2: "วางลงในช่องด้านบน แล้วกดปุ่มบายพาส",
    usageStep3: "คัดลอกคีย์หรือปลายทางที่ได้ ระบบเก็บประวัติล่าสุด 10 รายการ",
    usageNote: "โควตาต่อวันขึ้นอยู่กับแพ็กเกจของคุณ สิทธิ์ทดลองฟรี 7 วัน และจะกลับเป็นแพ็กเกจฟรีอัตโนมัติเมื่อหมดเวลา",
    imageUrl: "ลิงก์รูปภาพ",
    linkUrl: "ลิงก์ปลายทาง",
    version: "เวอร์ชัน",
    titleField: "หัวข้อ",
    bodyField: "รายละเอียด",
    kindField: "ประเภท",
    published: "เผยแพร่",
    close: "ปิด",
    viewChangelog: "เปิดบันทึกอัปเดต",
    recentTitle: "บายพาสล่าสุด",
    recentLive: "สด",
    recentEmpty: "ยังไม่มีการบายพาส",
    recentNote: "คีย์ถูกซ่อนบางส่วนเพื่อความเป็นส่วนตัว อัปเดตแบบเรียลไทม์",
    recentViewAll: "ดูทั้งหมด",
    recentShowLess: "ย่อรายการ",
    proBadge: "สมาชิก Pro",
    clearAllTitle: "ล้างรายการล่าสุดทั้งหมด?",
    clearAllBody: "ระบบจะลบผลลัพธ์ที่บันทึกไว้ในเครื่องนี้ทั้งหมด และไม่สามารถกู้คืนได้",
    clearAllConfirm: "ยืนยัน ล้างทั้งหมด",
    viewDetails: "ดูรายละเอียด",
    hideDetails: "ซ่อนรายละเอียด",
    openLink: "เปิดลิงก์",
    statusSuccess: "สำเร็จ",
    statusFailed: "ล้มเหลว",
    banner: "ภาพพื้นหลังเว็บไซต์",
    bannerHint: "แสดงอยู่ด้านหลังทุกส่วนของเว็บ ระบบจะย่อและบีบอัดภาพไม่เกิน 1920px / ประมาณ 1MB",
    bannerUpload: "อัปโหลดรูป",
    bannerRemove: "ลบภาพพื้นหลัง",
    bannerCurrent: "ภาพพื้นหลังปัจจุบัน",
    bannerNone: "ยังไม่ได้ตั้งภาพพื้นหลัง",
    bannerTooLarge: "ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 10MB",
    uploading: "กำลังอัปโหลด...",
  },
};
