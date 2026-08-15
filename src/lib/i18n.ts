export type Lang = "th" | "en";

export type Copy = {
  tagline: string;
  heroTitle: string;
  heroSub: string;
  inputLabel: string;
  placeholder: string;
  submit: string;
  submitting: string;
  invalidUrl: string;
  resultTitle: string;
  failedTitle: string;
  copy: string;
  copied: string;
  time: string;
  seconds: string;
  expires: string;
  historyTitle: string;
  historyEmpty: string;
  clear: string;
  footer: string;
  errors: {
    missing_key: string;
    unauthorized: string;
    rate_limited: string;
    timeout: string;
    upstream: string;
    not_signed_in: string;
    quota: string;
    banned: string;
    bypass_disabled: string;
    invalid_url: string;
    saturday_free: string;
  };
  nav: {
    home: string;
    pricing: string;
    guide: string;
    policy: string;
    account: string;
    admin: string;
    login: string;
    logout: string;
    register: string;
  };
  auth: {
    loginTitle: string;
    loginSub: string;
    registerTitle: string;
    registerSub: string;
    username: string;
    email: string;
    password: string;
    confirm: string;
    strength: string;
    strengthLevels: string[];
    hintLength: string;
    hintCase: string;
    hintNumber: string;
    hintSymbol: string;
    signIn: string;
    signUp: string;
    noAccount: string;
    haveAccount: string;
    working: string;
    mismatch: string;
    weak: string;
    usernameRule: string;
    welcome: string;
    created: string;
  };
  plans: {
    title: string;
    sub: string;
    current: string;
    perDay: string;
    unlimited: string;
    free: string;
    buy: string;
    requested: string;
    contactTitle: string;
    contactSub: string;
    discord: string;
    openDiscord: string;
    contactDiscordToBuy: string;
    purchaseDialogTitle: string;
    purchaseDialogSub: string;
    discordNotConfigured: string;
    close: string;
    mostPopular: string;
    oneTime: string;
  };
  account: {
    title: string;
    plan: string;
    usage: string;
    usedToday: string;
    totalUsed: string;
    memberSince: string;
    myRequests: string;
    noRequests: string;
    status: { pending: string; approved: string; rejected: string };
    upgrade: string;
    signedInAs: string;
  };
  guide: {
    title: string;
    sub: string;
    steps: { title: string; body: string }[];
    faqTitle: string;
    faq: { q: string; a: string }[];
  };
  policy: {
    title: string;
    sub: string;
    sections: { title: string; body: string }[];
  };
  admin: {
    title: string;
    sub: string;
    tabs: { users: string; plans: string; requests: string; settings: string };
    users: string;
    user: string;
    planCol: string;
    usedCol: string;
    actions: string;
    setPlan: string;
    ban: string;
    unban: string;
    banned: string;
    save: string;
    saved: string;
    newPlan: string;
    code: string;
    nameEn: string;
    nameTh: string;
    descEn: string;
    descTh: string;
    price: string;
    dailyLimit: string;
    dailyLimitHint: string;
    featuresEn: string;
    featuresTh: string;
    active: string;
    sortOrder: string;
    delete: string;
    approve: string;
    reject: string;
    discordUrl: string;
    discordTag: string;
    stats: { users: string; pro: string; pending: string; bypasses: string };
    denied: string;
  };
  common: {
    loading: string;
    back: string;
    required: string;
    error: string;
  };
};

export const dictionary: Record<Lang, Copy> = {
  en: {
    tagline: "Link bypass engine",
    heroTitle: "Unlock any shortened link.",
    heroSub:
      "Paste a locked or shortened URL and DevilDev returns the real destination key in seconds.",
    inputLabel: "Target URL",
    placeholder: "https://example.com/link",
    submit: "Bypass",
    submitting: "Bypassing",
    invalidUrl: "Enter a valid link starting with http:// or https://",
    resultTitle: "Result",
    failedTitle: "Bypass failed",
    copy: "Copy",
    copied: "Copied",
    time: "Time",
    seconds: "s",
    expires: "Expires",
    historyTitle: "Recent bypasses",
    historyEmpty: "No bypasses yet.",
    clear: "Clear",
    footer: "DevilDev is not affiliated with any link provider. Use responsibly.",
    errors: {
      missing_key: "Server is missing its API key. Contact the administrator.",
      unauthorized: "API key rejected. Please check the key configuration.",
      rate_limited: "Too many requests. Wait a moment and try again.",
      timeout: "The request timed out. Try again.",
      upstream: "The bypass service is unavailable right now.",
      not_signed_in: "Please sign in to use the bypass engine.",
      quota: "Daily limit reached on your plan. Upgrade to Pro for unlimited bypasses.",
      banned: "This account has been suspended. Contact support on Discord.",
      bypass_disabled: "Bypass is disabled on your account. Contact an admin.",
      invalid_url: "That link is unsupported or blocked for safety.",
      saturday_free: "Free plan bypass is paused on Saturdays. Pro works every day.",
    },
    nav: {
      home: "Bypass",
      pricing: "Pricing",
      guide: "How it works",
      policy: "Policy",
      account: "Account",
      admin: "Admin",
      login: "Sign in",
      logout: "Sign out",
      register: "Create account",
    },
    auth: {
      loginTitle: "Welcome back",
      loginSub: "Sign in to keep bypassing links.",
      registerTitle: "Create your account",
      registerSub: "Free plan includes 5 link bypasses every day.",
      username: "Username",
      email: "Email",
      password: "Password",
      confirm: "Confirm password",
      strength: "Password strength",
      strengthLevels: ["Very weak", "Weak", "Fair", "Strong", "Very strong"],
      hintLength: "At least 8 characters",
      hintCase: "Upper and lower case letters",
      hintNumber: "At least one number",
      hintSymbol: "At least one symbol",
      signIn: "Sign in",
      signUp: "Create account",
      noAccount: "No account yet?",
      haveAccount: "Already have an account?",
      working: "Please wait",
      mismatch: "Passwords do not match.",
      weak: "Please choose a stronger password.",
      usernameRule: "3-20 characters, letters, numbers and underscore only.",
      welcome: "Signed in.",
      created: "Account created. Welcome to DevilDev.",
    },
    plans: {
      title: "Plans & pricing",
      sub: "Start free. Upgrade to Pro when you need unlimited power.",
      current: "Your current plan",
      perDay: "links / day",
      unlimited: "Unlimited",
      free: "Free",
      buy: "Buy this plan",
      requested: "Request sent — contact us on Discord to finish.",
      contactTitle: "Finish your purchase on Discord",
      contactSub:
        "Payments are handled manually. Message us on Discord with your username and we will activate Pro on your account.",
      discord: "Discord",
      openDiscord: "Open Discord",
      contactDiscordToBuy: "Contact us on Discord to purchase",
      purchaseDialogTitle: "Purchase via Discord",
      purchaseDialogSub:
        "Message us on Discord with your username and selected plan. Our team will activate your package manually.",
      discordNotConfigured:
        "Discord contact link is not configured yet. Please check back later or contact support.",
      close: "Close",
      mostPopular: "Most popular",
      oneTime: "one-time",
    },
    account: {
      title: "My account",
      plan: "Plan",
      usage: "Usage",
      usedToday: "Used today",
      totalUsed: "Total bypasses",
      memberSince: "Member since",
      myRequests: "Purchase requests",
      noRequests: "No purchase requests yet.",
      status: { pending: "Pending", approved: "Approved", rejected: "Rejected" },
      upgrade: "Upgrade to Pro",
      signedInAs: "Signed in as",
    },
    guide: {
      title: "How DevilDev works",
      sub: "Three steps from a locked link to the real key.",
      steps: [
        {
          title: "1. Create an account",
          body: "Register with a username, email and password. Every new account starts on the Free plan with 5 bypasses per day.",
        },
        {
          title: "2. Paste your link",
          body: "Drop any supported shortened or locked link into the bypass box and press Bypass. The request is processed on our server — your link never touches a third-party browser extension.",
        },
        {
          title: "3. Copy your result",
          body: "The unlocked key or destination appears in seconds, with the processing time and expiry when the provider returns one. Tap copy and you are done.",
        },
        {
          title: "4. Upgrade when you need more",
          body: "Pro removes the daily limit, moves you to the priority queue and keeps your full history in your account.",
        },
      ],
      faqTitle: "Frequently asked",
      faq: [
        {
          q: "Which links are supported?",
          a: "Most popular link-locker and shortener services. If a link is not supported the engine tells you directly instead of failing silently.",
        },
        {
          q: "How do I pay for Pro?",
          a: "Press Buy on the Pro plan, then contact us on Discord. We activate Pro on your account manually — Discord is the only official contact channel.",
        },
        {
          q: "Does my daily limit reset?",
          a: "Yes. Free plan usage resets every day at 00:00 UTC.",
        },
        {
          q: "Do you store my links?",
          a: "We store the link and the outcome so you can see your own history and so we can detect abuse. Only you and the administrator can read it.",
        },
      ],
    },
    policy: {
      title: "Terms & policy",
      sub: "Please read before using DevilDev.",
      sections: [
        {
          title: "Acceptable use",
          body: "DevilDev is a convenience tool. Do not use it for illegal activity, to bypass paid content you are not entitled to, or to attack any service. Automated scraping, resale of access and account sharing are not allowed.",
        },
        {
          title: "Accounts",
          body: "You are responsible for your account and password. One person, one account. Accounts that abuse the service may be suspended without refund.",
        },
        {
          title: "Payments & refunds",
          body: "Pro costs 129 and is activated manually after you contact us on Discord. Because access is granted immediately after payment, purchases are non-refundable unless the service is unusable for an extended period.",
        },
        {
          title: "Availability",
          body: "The bypass engine depends on an upstream provider. We do not guarantee any specific success rate or uptime and features may change over time.",
        },
        {
          title: "Privacy",
          body: "We store your email, username, plan and the links you submit together with the result. We never sell your data. Contact us on Discord to request deletion of your account.",
        },
        {
          title: "Contact",
          body: "Discord is our only official support and sales channel. Anyone contacting you from another channel is not us.",
        },
      ],
    },
    admin: {
      title: "Admin console",
      sub: "Manage users, packages, purchases and contact details.",
      tabs: { users: "Users", plans: "Packages", requests: "Purchases", settings: "Settings" },
      users: "Users",
      user: "User",
      planCol: "Plan",
      usedCol: "Today / total",
      actions: "Actions",
      setPlan: "Set plan",
      ban: "Suspend",
      unban: "Restore",
      banned: "Suspended",
      save: "Save",
      saved: "Saved",
      newPlan: "New package",
      code: "Code",
      nameEn: "Name (EN)",
      nameTh: "Name (TH)",
      descEn: "Description (EN)",
      descTh: "Description (TH)",
      price: "Price",
      dailyLimit: "Daily limit",
      dailyLimitHint: "Leave empty for unlimited",
      featuresEn: "Features (EN, one per line)",
      featuresTh: "Features (TH, one per line)",
      active: "Active",
      sortOrder: "Sort order",
      delete: "Delete",
      approve: "Approve & activate",
      reject: "Reject",
      discordUrl: "Discord invite URL",
      discordTag: "Discord username",
      stats: { users: "Users", pro: "Pro users", pending: "Pending requests", bypasses: "Bypasses" },
      denied: "Administrators only.",
    },
    common: {
      loading: "Loading",
      back: "Back",
      required: "This field is required.",
      error: "Something went wrong.",
    },
  },
  th: {
    tagline: "ระบบบายพาสลิงก์",
    heroTitle: "ปลดล็อกลิงก์ย่อได้ทุกแบบ",
    heroSub: "วางลิงก์ที่ถูกล็อกหรือย่อไว้ แล้ว DevilDev จะคืนคีย์ปลายทางจริงให้ภายในไม่กี่วินาที",
    inputLabel: "ลิงก์เป้าหมาย",
    placeholder: "https://example.com/link",
    submit: "บายพาส",
    submitting: "กำลังบายพาส",
    invalidUrl: "กรุณาใส่ลิงก์ที่ถูกต้อง ขึ้นต้นด้วย http:// หรือ https://",
    resultTitle: "ผลลัพธ์",
    failedTitle: "บายพาสล้มเหลว",
    copy: "คัดลอก",
    copied: "คัดลอกแล้ว",
    time: "เวลา",
    seconds: "วินาที",
    expires: "หมดอายุ",
    historyTitle: "รายการล่าสุด",
    historyEmpty: "ยังไม่มีรายการ",
    clear: "ล้าง",
    footer: "DevilDev ไม่มีส่วนเกี่ยวข้องกับผู้ให้บริการลิงก์ใด ๆ โปรดใช้อย่างเหมาะสม",
    errors: {
      missing_key: "เซิร์ฟเวอร์ยังไม่มีคีย์ API กรุณาติดต่อผู้ดูแล",
      unauthorized: "คีย์ API ถูกปฏิเสธ กรุณาตรวจสอบการตั้งค่า",
      rate_limited: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
      timeout: "คำขอหมดเวลา กรุณาลองอีกครั้ง",
      upstream: "ระบบบายพาสไม่พร้อมใช้งานในขณะนี้",
      not_signed_in: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
      quota: "ใช้ครบโควตาของวันนี้แล้ว อัปเกรดเป็น Pro เพื่อใช้งานไม่จำกัด",
      banned: "บัญชีนี้ถูกระงับ กรุณาติดต่อทีมงานทาง Discord",
      bypass_disabled: "บัญชีของคุณถูกปิดการใช้งาน Bypass กรุณาติดต่อแอดมิน",
      invalid_url: "ลิงก์นี้ไม่ปลอดภัยหรือไม่รองรับ",
      saturday_free: "แพ็กเกจฟรีใช้งานไม่ได้ในวันเสาร์ ใช้ Pro เพื่อใช้งานได้ทุกวัน",
    },
    nav: {
      home: "บายพาส",
      pricing: "แพ็กเกจ",
      guide: "วิธีใช้งาน",
      policy: "นโยบาย",
      account: "บัญชีของฉัน",
      admin: "แอดมิน",
      login: "เข้าสู่ระบบ",
      logout: "ออกจากระบบ",
      register: "สมัครสมาชิก",
    },
    auth: {
      loginTitle: "ยินดีต้อนรับกลับ",
      loginSub: "เข้าสู่ระบบเพื่อใช้งานต่อ",
      registerTitle: "สมัครสมาชิก",
      registerSub: "แพ็กเกจฟรีใช้ได้วันละ 5 ลิงก์",
      username: "ชื่อผู้ใช้",
      email: "อีเมล",
      password: "รหัสผ่าน",
      confirm: "ยืนยันรหัสผ่าน",
      strength: "ความปลอดภัยของรหัสผ่าน",
      strengthLevels: ["อ่อนมาก", "อ่อน", "พอใช้", "แข็งแรง", "แข็งแรงมาก"],
      hintLength: "อย่างน้อย 8 ตัวอักษร",
      hintCase: "มีตัวพิมพ์ใหญ่และพิมพ์เล็ก",
      hintNumber: "มีตัวเลขอย่างน้อย 1 ตัว",
      hintSymbol: "มีอักขระพิเศษอย่างน้อย 1 ตัว",
      signIn: "เข้าสู่ระบบ",
      signUp: "สมัครสมาชิก",
      noAccount: "ยังไม่มีบัญชี?",
      haveAccount: "มีบัญชีอยู่แล้ว?",
      working: "กรุณารอสักครู่",
      mismatch: "รหัสผ่านไม่ตรงกัน",
      weak: "กรุณาตั้งรหัสผ่านให้ปลอดภัยกว่านี้",
      usernameRule: "3-20 ตัวอักษร ใช้ได้เฉพาะ a-z 0-9 และ _",
      welcome: "เข้าสู่ระบบแล้ว",
      created: "สมัครสมาชิกสำเร็จ ยินดีต้อนรับสู่ DevilDev",
    },
    plans: {
      title: "แพ็กเกจและราคา",
      sub: "เริ่มใช้ฟรี อัปเกรดเป็น Pro เมื่อต้องการใช้งานไม่จำกัด",
      current: "แพ็กเกจปัจจุบันของคุณ",
      perDay: "ลิงก์ / วัน",
      unlimited: "ไม่จำกัด",
      free: "ฟรี",
      buy: "ซื้อแพ็กเกจนี้",
      requested: "ส่งคำขอแล้ว — ติดต่อทาง Discord เพื่อดำเนินการต่อ",
      contactTitle: "สั่งซื้อผ่าน Discord",
      contactSub:
        "การสั่งซื้อดำเนินการโดยทีมงาน ทักหาเราใน Discord พร้อมแจ้งชื่อผู้ใช้ แล้วเราจะเปิดแพ็กเกจให้ทันที",
      discord: "ดิสคอร์ด",
      openDiscord: "เปิด Discord",
      contactDiscordToBuy: "ติดต่อทาง Discord เพื่อสั่งซื้อ",
      purchaseDialogTitle: "สั่งซื้อผ่าน Discord",
      purchaseDialogSub:
        "ทักหาเราใน Discord พร้อมแจ้งชื่อผู้ใช้และแพ็กเกจที่ต้องการ ทีมงานจะเปิดสิทธิ์ให้ด้วยตนเอง",
      discordNotConfigured:
        "ยังไม่ได้ตั้งค่าลิงก์ Discord กรุณาลองใหม่ภายหลัง หรือติดต่อทีมงาน",
      close: "ปิด",
      mostPopular: "ยอดนิยม",
      oneTime: "จ่ายครั้งเดียว",
    },
    account: {
      title: "บัญชีของฉัน",
      plan: "แพ็กเกจ",
      usage: "การใช้งาน",
      usedToday: "ใช้ไปวันนี้",
      totalUsed: "ใช้ทั้งหมด",
      memberSince: "สมัครเมื่อ",
      myRequests: "คำขอซื้อแพ็กเกจ",
      noRequests: "ยังไม่มีคำขอ",
      status: { pending: "รอดำเนินการ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ" },
      upgrade: "อัปเกรดเป็น Pro",
      signedInAs: "เข้าสู่ระบบในชื่อ",
    },
    guide: {
      title: "DevilDev ใช้งานอย่างไร",
      sub: "แค่ไม่กี่ขั้นตอนก็ได้คีย์จริง",
      steps: [
        {
          title: "1. สมัครสมาชิก",
          body: "สมัครด้วยชื่อผู้ใช้ อีเมล และรหัสผ่าน ทุกบัญชีใหม่เริ่มต้นที่แพ็กเกจฟรี ใช้ได้วันละ 5 ลิงก์",
        },
        {
          title: "2. วางลิงก์",
          body: "วางลิงก์ที่ถูกย่อหรือถูกล็อกลงในช่องแล้วกดบายพาส ระบบประมวลผลบนเซิร์ฟเวอร์ของเรา ไม่ต้องติดตั้งส่วนเสริมใด ๆ",
        },
        {
          title: "3. คัดลอกผลลัพธ์",
          body: "คีย์หรือปลายทางจะแสดงภายในไม่กี่วินาที พร้อมเวลาที่ใช้และวันหมดอายุ (ถ้ามี) กดคัดลอกได้ทันที",
        },
        {
          title: "4. อัปเกรดเมื่อต้องการมากขึ้น",
          body: "Pro ปลดล็อกการใช้งานไม่จำกัด คิวเร็วกว่า และเก็บประวัติทั้งหมดไว้ในบัญชีของคุณ",
        },
      ],
      faqTitle: "คำถามที่พบบ่อย",
      faq: [
        {
          q: "รองรับลิงก์แบบไหนบ้าง?",
          a: "รองรับผู้ให้บริการลิงก์ล็อกและลิงก์ย่อยอดนิยมส่วนใหญ่ หากลิงก์ไม่รองรับ ระบบจะแจ้งให้ทราบทันที",
        },
        {
          q: "ชำระเงิน Pro อย่างไร?",
          a: "กดปุ่มซื้อในแพ็กเกจ Pro แล้วติดต่อเราทาง Discord ทีมงานจะเปิดสิทธิ์ให้ด้วยตนเอง — Discord เป็นช่องทางเดียวที่เป็นทางการ",
        },
        { q: "โควตารายวันรีเซ็ตไหม?", a: "รีเซ็ตทุกวันเวลา 00:00 UTC สำหรับแพ็กเกจฟรี" },
        {
          q: "เก็บลิงก์ของฉันไว้ไหม?",
          a: "เก็บลิงก์และผลลัพธ์ไว้เพื่อแสดงประวัติของคุณและตรวจสอบการใช้งานผิดปกติ มีเพียงคุณและผู้ดูแลเท่านั้นที่เห็น",
        },
      ],
    },
    policy: {
      title: "ข้อกำหนดและนโยบาย",
      sub: "กรุณาอ่านก่อนใช้งาน DevilDev",
      sections: [
        {
          title: "การใช้งานที่ยอมรับได้",
          body: "DevilDev เป็นเครื่องมืออำนวยความสะดวก ห้ามใช้เพื่อกิจกรรมผิดกฎหมาย เข้าถึงเนื้อหาที่ไม่มีสิทธิ์ หรือโจมตีบริการใด ๆ ห้ามดึงข้อมูลอัตโนมัติ ขายต่อสิทธิ์ หรือแชร์บัญชี",
        },
        {
          title: "บัญชีผู้ใช้",
          body: "คุณต้องรับผิดชอบบัญชีและรหัสผ่านของตนเอง หนึ่งคนต่อหนึ่งบัญชี บัญชีที่ใช้งานผิดวัตถุประสงค์อาจถูกระงับโดยไม่คืนเงิน",
        },
        {
          title: "การชำระเงินและการคืนเงิน",
          body: "แพ็กเกจ Pro ราคา 129 เปิดใช้งานโดยทีมงานหลังติดต่อทาง Discord เนื่องจากเปิดสิทธิ์ทันทีหลังชำระเงิน จึงไม่มีนโยบายคืนเงิน ยกเว้นระบบใช้งานไม่ได้เป็นเวลานาน",
        },
        {
          title: "ความพร้อมใช้งาน",
          body: "ระบบบายพาสพึ่งพาผู้ให้บริการภายนอก เราไม่รับประกันอัตราความสำเร็จหรือเวลาให้บริการ และฟีเจอร์อาจเปลี่ยนแปลงได้",
        },
        {
          title: "ความเป็นส่วนตัว",
          body: "เราเก็บอีเมล ชื่อผู้ใช้ แพ็กเกจ และลิงก์ที่คุณส่งพร้อมผลลัพธ์ เราไม่ขายข้อมูลของคุณ หากต้องการลบบัญชี ติดต่อเราทาง Discord",
        },
        {
          title: "ติดต่อเรา",
          body: "Discord เป็นช่องทางเดียวที่เป็นทางการสำหรับการซื้อและซัพพอร์ต หากมีผู้ติดต่อจากช่องทางอื่นถือว่าไม่ใช่เรา",
        },
      ],
    },
    admin: {
      title: "ระบบผู้ดูแล",
      sub: "จัดการผู้ใช้ แพ็กเกจ คำสั่งซื้อ และช่องทางติดต่อ",
      tabs: { users: "ผู้ใช้", plans: "แพ็กเกจ", requests: "คำสั่งซื้อ", settings: "ตั้งค่า" },
      users: "ผู้ใช้",
      user: "ผู้ใช้",
      planCol: "แพ็กเกจ",
      usedCol: "วันนี้ / ทั้งหมด",
      actions: "จัดการ",
      setPlan: "ตั้งแพ็กเกจ",
      ban: "ระงับ",
      unban: "ปลดระงับ",
      banned: "ถูกระงับ",
      save: "บันทึก",
      saved: "บันทึกแล้ว",
      newPlan: "เพิ่มแพ็กเกจ",
      code: "รหัส",
      nameEn: "ชื่อ (EN)",
      nameTh: "ชื่อ (TH)",
      descEn: "คำอธิบาย (EN)",
      descTh: "คำอธิบาย (TH)",
      price: "ราคา",
      dailyLimit: "จำกัดต่อวัน",
      dailyLimitHint: "เว้นว่างไว้ = ไม่จำกัด",
      featuresEn: "ฟีเจอร์ (EN, บรรทัดละข้อ)",
      featuresTh: "ฟีเจอร์ (TH, บรรทัดละข้อ)",
      active: "เปิดใช้งาน",
      sortOrder: "ลำดับ",
      delete: "ลบ",
      approve: "อนุมัติและเปิดสิทธิ์",
      reject: "ปฏิเสธ",
      discordUrl: "ลิงก์เชิญ Discord",
      discordTag: "ชื่อผู้ใช้ Discord",
      stats: {
        users: "ผู้ใช้ทั้งหมด",
        pro: "ผู้ใช้ Pro",
        pending: "คำขอที่รออยู่",
        bypasses: "ครั้งที่บายพาส",
      },
      denied: "เฉพาะผู้ดูแลระบบเท่านั้น",
    },
    common: {
      loading: "กำลังโหลด",
      back: "ย้อนกลับ",
      required: "กรุณากรอกข้อมูลนี้",
      error: "เกิดข้อผิดพลาด",
    },
  },
};
