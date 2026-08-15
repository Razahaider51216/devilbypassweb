// Minimal PromptPay EMV payload generator (client-safe, no external deps)
// Builds EMVCo TLV fields for PromptPay with CRC16-CCITT (0x1021, init 0xFFFF)

function tlv(id: string, value: string) {
  const len = value.length.toString().padStart(2, "0");
  return id + len + value;
}

function crc16ccitt(input: string) {
  // input is ASCII string; compute CRC16-CCITT (initial 0xFFFF)
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizePhone(phone: string) {
  let p = (phone || "").replace(/[^0-9+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  // Normalize to EMV PromptPay phone format which uses 0066 prefix
  if (p.startsWith("0066")) return p;
  if (p.startsWith("66")) return "00" + p; // 66... -> 0066...
  if (p.startsWith("0")) return "0066" + p.slice(1); // 0xxxxxxxx -> 0066xxxxxxxx
  // If it's an international number without 66, assume it's already correct and prefix 00
  if (/^[1-9][0-9]+$/.test(p)) return "00" + p;
  return p;
}

export function buildPromptPayPayload(phone: string, amount?: number, merchantName = "DevilDev") {
  const mPhone = normalizePhone(phone || "");
  // Merchant Account Information (GUI + account)
  const gui = tlv("00", "A000000677010111");
  // Subfield 01 holds the phone/account payload for PromptPay
  const acc = tlv("01", mPhone);
  const mai = tlv("29", gui + acc);

  const payloadFormat = tlv("00", "01");
  const poi = tlv("01", "12"); // dynamic
  const merchantNameField = tlv("59", merchantName);
  const country = tlv("58", "TH");
  const currency = tlv("53", "764");
  let amtField = "";
  if (typeof amount === "number") {
    // Format with two decimals, omit trailing zeros per EMV guidance but many apps accept 2 decimals
    amtField = tlv("54", amount.toFixed(2));
  }

  let raw = payloadFormat + poi + mai + currency + amtField + country + merchantNameField;
  // CRC placeholder
  raw += "6304";
  const crc = crc16ccitt(raw);
  raw += crc;
  return raw;
}

export default { buildPromptPayPayload };
