import { FileText, ShieldCheck } from "lucide-react";
import { InfoPageShell } from "@/components/devildev/InfoPageShell";
import { usePreferredLanguage } from "@/hooks/usePreferredLanguage";
import type { Lang } from "@/lib/i18n";

type DocumentKind = "terms" | "privacy";

type LegalCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  summary: string;
  sections: { title: string; body: string[] }[];
};

const documents: Record<DocumentKind, Record<Lang, LegalCopy>> = {
  terms: {
    th: {
      eyebrow: "ข้อตกลงการใช้งาน",
      title: "ข้อกำหนดการให้บริการ",
      intro:
        "ข้อกำหนดเหล่านี้อธิบายสิทธิ หน้าที่ และขอบเขตการใช้งานบริการ DevilDev โปรดอ่านก่อนเริ่มใช้งาน",
      updated: "ปรับปรุงล่าสุด 14 สิงหาคม 2026",
      summary:
        "เมื่อสร้างบัญชีหรือใช้งาน DevilDev ถือว่าคุณยอมรับข้อกำหนดฉบับนี้ หากไม่ยอมรับ กรุณาหยุดใช้บริการ",
      sections: [
        {
          title: "1. การใช้บริการ",
          body: [
            "DevilDev ให้บริการประมวลผลลิงก์ย่อหรือลิงก์ที่ถูกล็อกซึ่งระบบรองรับ คุณต้องมีอายุและความสามารถตามกฎหมายในการยอมรับข้อตกลงนี้",
            "คุณต้องใช้บริการกับลิงก์และเนื้อหาที่คุณมีสิทธิ์เข้าถึงเท่านั้น และรับผิดชอบต่อข้อมูลที่ส่งเข้าระบบทั้งหมด",
          ],
        },
        {
          title: "2. การใช้งานที่ไม่อนุญาต",
          body: [
            "ห้ามใช้บริการเพื่อเข้าถึงเนื้อหาโดยไม่ได้รับอนุญาต ละเมิดลิขสิทธิ์ ก่อกวนระบบ เผยแพร่มัลแวร์ ฉ้อโกง หรือทำกิจกรรมที่ผิดกฎหมาย",
            "ห้ามใช้บอต สคริปต์ หรือวิธีอัตโนมัติเพื่อหลีกเลี่ยงข้อจำกัด ใช้งานเกินโควตา ทดสอบช่องโหว่ หรือรบกวนผู้ใช้รายอื่น",
          ],
        },
        {
          title: "3. บัญชีและความปลอดภัย",
          body: [
            "บัญชี DevilDev เชื่อมกับ Discord โปรดดูแลบัญชี Discord ของคุณและแจ้งเราทันทีเมื่อสงสัยว่าบัญชีถูกเข้าถึงโดยไม่ได้รับอนุญาต",
            "เราอาจจำกัด ระงับ หรือยกเลิกบัญชีที่ละเมิดข้อกำหนด สร้างความเสี่ยงต่อระบบ หรือใช้งานในลักษณะที่ผิดปกติ",
          ],
        },
        {
          title: "4. แพ็กเกจ การชำระเงิน และการคืนเงิน",
          body: [
            "ราคา โควตา ระยะเวลา และคุณสมบัติของแต่ละแพ็กเกจจะแสดงก่อนชำระเงิน สิทธิ์แบบชำระเงินเริ่มเมื่อระบบยืนยันรายการสำเร็จ",
            "เว้นแต่กฎหมายกำหนดไว้เป็นอย่างอื่น การชำระเงินที่เปิดใช้งานสิทธิ์แล้วไม่สามารถคืนเงินได้ หากระบบขัดข้องต่อเนื่อง โปรดติดต่อฝ่ายสนับสนุนเพื่อให้เราตรวจสอบเป็นกรณีไป",
          ],
        },
        {
          title: "5. ความพร้อมใช้งาน",
          body: [
            "บริการบางส่วนพึ่งพาผู้ให้บริการภายนอก เราจึงไม่รับประกันว่าทุกลิงก์จะประมวลผลสำเร็จหรือบริการจะพร้อมใช้งานตลอดเวลา",
            "เราอาจปรับปรุง เปลี่ยนแปลง หรือยุติคุณสมบัติบางส่วนเพื่อความปลอดภัย ประสิทธิภาพ หรือข้อกำหนดทางกฎหมาย",
          ],
        },
        {
          title: "6. ทรัพย์สินทางปัญญา",
          body: [
            "ตัวบริการ การออกแบบ ซอฟต์แวร์ และเครื่องหมาย DevilDev เป็นของผู้พัฒนาหรือผู้ให้อนุญาต การใช้บริการไม่ได้โอนกรรมสิทธิ์ใด ๆ ให้คุณ",
            "คุณยังคงเป็นเจ้าของข้อมูลที่ส่งเข้าระบบ และให้สิทธิ์เราใช้ข้อมูลนั้นเท่าที่จำเป็นต่อการให้บริการและรักษาความปลอดภัย",
          ],
        },
        {
          title: "7. ข้อจำกัดความรับผิด",
          body: [
            "บริการมีให้ตามสภาพและตามความพร้อม ภายใต้ขอบเขตที่กฎหมายอนุญาต เราไม่รับผิดชอบต่อความเสียหายทางอ้อม การสูญเสียข้อมูล รายได้ หรือโอกาสจากการใช้หรือไม่สามารถใช้บริการ",
            "ความรับผิดรวมของเราจะไม่เกินจำนวนที่คุณชำระให้ DevilDev ในช่วง 3 เดือนก่อนเกิดเหตุที่เป็นข้อเรียกร้อง",
          ],
        },
        {
          title: "8. การเปลี่ยนแปลงและการติดต่อ",
          body: [
            "เราอาจแก้ไขข้อกำหนดนี้และจะแสดงวันที่ปรับปรุงไว้บนหน้านี้ การใช้บริการต่อหลังข้อกำหนดใหม่มีผลถือเป็นการยอมรับ",
            "หากมีคำถามเกี่ยวกับข้อกำหนด โปรดติดต่อผ่านหน้า Support ซึ่งเป็นช่องทางทางการของเรา",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Service agreement",
      title: "Terms of Service",
      intro:
        "These terms explain your rights, responsibilities and the limits that apply when using DevilDev. Please read them before using the service.",
      updated: "Last updated August 14, 2026",
      summary:
        "By creating an account or using DevilDev, you agree to these terms. If you do not agree, please stop using the service.",
      sections: [
        {
          title: "1. Using the service",
          body: [
            "DevilDev processes supported shortened or locked links. You must have the legal capacity to accept this agreement.",
            "Only submit links and content you are authorized to access. You are responsible for everything you submit to the service.",
          ],
        },
        {
          title: "2. Prohibited use",
          body: [
            "Do not use DevilDev for unauthorized access, copyright infringement, system abuse, malware, fraud or any illegal activity.",
            "Do not use bots or automation to evade limits, exceed quotas, probe vulnerabilities or interfere with other users.",
          ],
        },
        {
          title: "3. Accounts and security",
          body: [
            "Your DevilDev account is linked to Discord. Protect your Discord account and notify us if you suspect unauthorized access.",
            "We may limit, suspend or close accounts that violate these terms, create a security risk or show abusive activity.",
          ],
        },
        {
          title: "4. Plans, payment and refunds",
          body: [
            "Prices, quotas, durations and plan features are shown before payment. Paid access starts after the transaction is confirmed.",
            "Unless required by law, activated purchases are non-refundable. Contact support if an extended service outage affects your purchase.",
          ],
        },
        {
          title: "5. Availability",
          body: [
            "Some functionality relies on third-party providers. We do not guarantee that every link will succeed or that the service will always be available.",
            "We may update, change or discontinue features for security, performance or legal reasons.",
          ],
        },
        {
          title: "6. Intellectual property",
          body: [
            "The service, design, software and DevilDev marks belong to the developer or its licensors. Using the service does not transfer ownership to you.",
            "You retain ownership of submitted data and grant us permission to process it only as needed to operate and secure the service.",
          ],
        },
        {
          title: "7. Limitation of liability",
          body: [
            "The service is provided as is and as available. To the extent permitted by law, we are not liable for indirect damages or loss of data, revenue or opportunity.",
            "Our total liability will not exceed the amount you paid DevilDev during the three months before the event giving rise to the claim.",
          ],
        },
        {
          title: "8. Changes and contact",
          body: [
            "We may update these terms and will show the revision date on this page. Continued use after an update means you accept the revised terms.",
            "Questions about these terms can be sent through our official Support page.",
          ],
        },
      ],
    },
  },
  privacy: {
    th: {
      eyebrow: "ความเป็นส่วนตัวของคุณ",
      title: "นโยบายความเป็นส่วนตัว",
      intro:
        "นโยบายนี้อธิบายว่า DevilDev เก็บ ใช้ และปกป้องข้อมูลของคุณอย่างไรเมื่อคุณใช้เว็บไซต์และบริการของเรา",
      updated: "ปรับปรุงล่าสุด 14 สิงหาคม 2026",
      summary:
        "เราเก็บข้อมูลเท่าที่จำเป็นต่อการให้บริการ รักษาความปลอดภัย และดูแลบัญชีของคุณ เราไม่ขายข้อมูลส่วนบุคคลของคุณ",
      sections: [
        {
          title: "1. ข้อมูลที่เราเก็บ",
          body: [
            "ข้อมูลบัญชีจาก Discord เช่น รหัสผู้ใช้ ชื่อที่แสดง ชื่อผู้ใช้ รูปโปรไฟล์ และอีเมล รวมถึงแพ็กเกจ วันที่สมัคร และสถานะบัญชี เราไม่เก็บรหัสผ่าน Discord",
            "ข้อมูลการใช้งาน เช่น ลิงก์ที่ส่ง ผลลัพธ์ สถานะ เวลาประมวลผล จำนวนครั้งที่ใช้ และข้อมูลทางเทคนิคที่จำเป็นต่อการตรวจสอบข้อผิดพลาดและการใช้งานผิดปกติ",
          ],
        },
        {
          title: "2. วิธีที่เราใช้ข้อมูล",
          body: [
            "เราใช้ข้อมูลเพื่อยืนยันตัวตน ประมวลผลคำขอ แสดงประวัติ จัดการโควตาและแพ็กเกจ ชำระเงิน ให้การสนับสนุน และปรับปรุงความเสถียรของระบบ",
            "เราอาจใช้ข้อมูลเพื่อป้องกันการฉ้อโกง บังคับใช้ข้อกำหนด ตรวจสอบเหตุการณ์ด้านความปลอดภัย และปฏิบัติตามกฎหมาย",
          ],
        },
        {
          title: "3. ฐานและระยะเวลาการเก็บ",
          body: [
            "เราประมวลผลข้อมูลเพื่อให้บริการตามสัญญา เพื่อประโยชน์โดยชอบในการรักษาความปลอดภัย หรือตามที่กฎหมายกำหนด",
            "เราเก็บข้อมูลเฉพาะเท่าที่จำเป็นต่อวัตถุประสงค์ดังกล่าว ข้อมูลบางส่วนอาจคงอยู่ในสำรองข้อมูลหรือบันทึกความปลอดภัยตามรอบการลบที่เหมาะสม",
          ],
        },
        {
          title: "4. การเปิดเผยข้อมูล",
          body: [
            "เราอาจใช้ผู้ให้บริการโฮสติ้ง ฐานข้อมูล การยืนยันตัวตน การชำระเงิน และการตรวจสอบระบบ ซึ่งเข้าถึงข้อมูลเฉพาะส่วนที่จำเป็นต่อหน้าที่ของตน",
            "เราอาจเปิดเผยข้อมูลเมื่อกฎหมายกำหนด เพื่อปกป้องสิทธิและความปลอดภัย หรือเมื่อมีการโอนกิจการโดยผู้รับโอนต้องปฏิบัติตามนโยบายนี้",
          ],
        },
        {
          title: "5. คุกกี้และที่จัดเก็บในอุปกรณ์",
          body: [
            "เราใช้คุกกี้หรือ local storage ที่จำเป็นสำหรับสถานะการเข้าสู่ระบบ ภาษา ธีม การนับเวลารอ และประวัติการใช้งานบนอุปกรณ์",
            "คุณสามารถล้างข้อมูลเหล่านี้ผ่านการตั้งค่าเบราว์เซอร์ แต่คุณสมบัติบางอย่างอาจต้องเข้าสู่ระบบหรือตั้งค่าใหม่",
          ],
        },
        {
          title: "6. ความปลอดภัย",
          body: [
            "เราใช้มาตรการทางเทคนิคและการจัดการที่เหมาะสม เช่น การควบคุมสิทธิ์ การเข้ารหัสระหว่างส่ง และการบันทึกเหตุการณ์ อย่างไรก็ตาม ไม่มีระบบออนไลน์ใดปลอดภัยได้ทั้งหมด",
            "โปรดเปิดใช้มาตรการรักษาความปลอดภัยของ Discord และแจ้งเราทันทีหากพบกิจกรรมที่น่าสงสัย",
          ],
        },
        {
          title: "7. สิทธิของคุณ",
          body: [
            "คุณสามารถขอเข้าถึง แก้ไข หรือลบบัญชีและข้อมูลส่วนบุคคล รวมถึงคัดค้านหรือจำกัดการประมวลผลบางประเภทได้ตามกฎหมายที่ใช้บังคับ",
            "เราจำเป็นต้องตรวจสอบตัวตนก่อนดำเนินการ และอาจเก็บข้อมูลบางส่วนไว้เมื่อกฎหมายหรือความปลอดภัยกำหนด",
          ],
        },
        {
          title: "8. การเปลี่ยนแปลงและการติดต่อ",
          body: [
            "เราอาจปรับปรุงนโยบายนี้เมื่อบริการหรือกฎหมายเปลี่ยนแปลง โดยจะแสดงวันที่ล่าสุดบนหน้านี้",
            "หากต้องการใช้สิทธิหรือสอบถามเรื่องข้อมูลส่วนบุคคล โปรดติดต่อเราผ่านหน้า Support",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Your privacy",
      title: "Privacy Policy",
      intro:
        "This policy explains how DevilDev collects, uses and protects information when you use our website and services.",
      updated: "Last updated August 14, 2026",
      summary:
        "We collect only what we need to provide the service, protect it and manage your account. We do not sell your personal information.",
      sections: [
        {
          title: "1. Information we collect",
          body: [
            "Discord account data such as user ID, display name, username, avatar and email, plus your plan, registration date and account status. We do not store your Discord password.",
            "Usage data such as submitted links, results, status, processing time, usage counts and technical information needed to diagnose errors or abuse.",
          ],
        },
        {
          title: "2. How we use information",
          body: [
            "We use information to authenticate you, process requests, show history, manage quotas and plans, handle payments, provide support and improve reliability.",
            "We may also use it to prevent fraud, enforce our terms, investigate security incidents and comply with law.",
          ],
        },
        {
          title: "3. Legal basis and retention",
          body: [
            "We process information to perform our contract with you, for legitimate security interests or to meet legal obligations.",
            "We keep information only as long as needed for those purposes. Some data may remain in backups or security logs under reasonable deletion schedules.",
          ],
        },
        {
          title: "4. Sharing information",
          body: [
            "We may use hosting, database, authentication, payment and monitoring providers that access only the information needed to perform their role.",
            "We may disclose information when required by law, to protect rights and safety, or during a business transfer where the recipient must honor this policy.",
          ],
        },
        {
          title: "5. Cookies and device storage",
          body: [
            "We use necessary cookies or local storage for login state, language, theme, cooldown timers and on-device history.",
            "You can clear this data in your browser, but some features may require you to sign in or configure them again.",
          ],
        },
        {
          title: "6. Security",
          body: [
            "We use reasonable technical and organizational safeguards, including access controls, encryption in transit and event logging. No online system can be completely secure.",
            "Use Discord's account-security features and contact us promptly if you notice suspicious activity.",
          ],
        },
        {
          title: "7. Your rights",
          body: [
            "Depending on applicable law, you may ask to access, correct or delete your account and personal data, or object to or restrict certain processing.",
            "We need to verify your identity before acting and may retain limited data where required by law or security needs.",
          ],
        },
        {
          title: "8. Changes and contact",
          body: [
            "We may update this policy when the service or law changes and will show the latest date on this page.",
            "To make a privacy request or ask a question, contact us through the Support page.",
          ],
        },
      ],
    },
  },
};

export function LegalDocumentPage({ kind }: { kind: DocumentKind }) {
  const { lang, changeLang } = usePreferredLanguage();
  const copy = documents[kind][lang];
  const Icon = kind === "terms" ? FileText : ShieldCheck;

  return (
    <InfoPageShell lang={lang} onLangChange={changeLang}>
      <article className="mt-7 sm:mt-10">
        <header className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <Icon className="h-3.5 w-3.5" /> {copy.eyebrow}
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            {copy.intro}
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {copy.updated}
          </p>
        </header>

        <aside className="mt-9 rounded-2xl border border-border bg-card p-5 text-sm leading-7 sm:p-6">
          {copy.summary}
        </aside>

        <div className="mt-5 divide-y divide-border rounded-3xl border border-border bg-card px-5 sm:px-8">
          {copy.sections.map((section) => (
            <section
              key={section.title}
              className="py-7 sm:grid sm:grid-cols-[210px_1fr] sm:gap-8 sm:py-9"
            >
              <h2 className="text-sm font-bold leading-6">{section.title}</h2>
              <div className="mt-3 space-y-3 sm:mt-0">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </InfoPageShell>
  );
}
