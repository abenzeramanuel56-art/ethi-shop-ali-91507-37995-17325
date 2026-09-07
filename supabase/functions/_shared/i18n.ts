// Localized copy shared by receipt + terms notifications.
export type Lang = "en" | "am" | "om" | "ti";

export const SITE_URL = "https://abeniexpress.online";

export function pickLang(v: unknown): Lang {
  return v === "am" || v === "om" || v === "ti" ? v : "en";
}

type ReceiptStrings = {
  title: string;
  intro: (name: string) => string;
  orderId: string;
  store: string;
  date: string;
  items: string;
  total: string;
  buyer: string;
  address: string;
  footer: string;
};

export const RECEIPT: Record<Lang, ReceiptStrings> = {
  en: {
    title: "🧾 Payment approved — your receipt",
    intro: (n) => `Hi ${n}, your payment has been verified. Here is your official receipt.`,
    orderId: "Order ID",
    store: "Store",
    date: "Date",
    items: "Items",
    total: "Total paid",
    buyer: "Buyer",
    address: "Delivery",
    footer: "Thank you for shopping with Abeni Express.",
  },
  am: {
    title: "🧾 ክፍያዎ ጸድቋል — ደረሰኝዎ",
    intro: (n) => `ሰላም ${n}፣ ክፍያዎ ተረጋግጧል። ኦፊሴላዊ ደረሰኝዎ ይህ ነው።`,
    orderId: "የትዕዛዝ መለያ",
    store: "መደብር",
    date: "ቀን",
    items: "ዕቃዎች",
    total: "ጠቅላላ የተከፈለ",
    buyer: "ገዢ",
    address: "የማድረሻ አድራሻ",
    footer: "አቤኒ ኤክስፕረስን ስለተጠቀሙ እናመሰግናለን።",
  },
  om: {
    title: "🧾 Kaffaltiin mirkanaa'eera — nagahee kee",
    intro: (n) => `Akkam ${n}, kaffaltiin kee mirkanaa'eera. Nagaheen kee kunooti.`,
    orderId: "Lakkoofsa ajaja",
    store: "Suuqii",
    date: "Guyyaa",
    items: "Meeshaalee",
    total: "Waliigala kaffalame",
    buyer: "Bitataa",
    address: "Geejjiba",
    footer: "Abeni Express fayyadamuu keessaniif galatoomaa.",
  },
  ti: {
    title: "🧾 ክፍሊት ጸዲቑ — ቅብሊትካ",
    intro: (n) => `ሰላም ${n}፡ ክፍሊትካ ተረጋጊጹ። ወግዓዊ ቅብሊትካ እንሆ።`,
    orderId: "መለለዪ ትእዛዝ",
    store: "ድኳን",
    date: "ዕለት",
    items: "ኣቕሑ",
    total: "ጠቕላላ ዝተኸፍለ",
    buyer: "ዓዳጋይ",
    address: "ኣድራሻ ምብጻሕ",
    footer: "ንኣበኒ ኤክስፕረስ ስለ ዝተጠቐምካ የቐንየልና።",
  },
};

export const TERMS_MSG: Record<Lang, { title: string; body: string }> = {
  en: {
    title: "Abeni Express — Terms & Conditions",
    body:
      "Welcome to Abeni Express. By registering you agree to our Terms and Conditions:\n\n" +
      "1. Abeni Express is a digital marketplace operating in Ethiopia.\n" +
      "2. Selling illegal or prohibited goods is strictly forbidden; sellers are fully responsible for their items and buyers may claim a full refund on mismatched items.\n" +
      "3. Service orders must be accepted within 2 hours or they cancel automatically; ignoring or failing orders can suspend your account.\n" +
      "4. Customers must inspect items in front of the driver; refunds require the original box and a working item, and return delivery costs are paid by the customer or seller.\n" +
      "5. Never pay drivers outside the app.\n" +
      "6. Sellers must keep price and stock up to date.\n" +
      "7. Reviews must be genuine; fake reviews close accounts.\n" +
      "8. The Abeni Express name, logo and app are our intellectual property.\n" +
      "9. We are not liable for third-party links or ads.\n" +
      "10. The platform may be temporarily unavailable for maintenance or force majeure.\n" +
      "11. Fraud or fake payment screenshots cause a permanent ban. Deals made outside the official app (e.g. on Telegram) are not our responsibility.\n" +
      "12. Your KYC data is stored securely and only shared with authorities under a court order.\n" +
      "13. A commission is deducted from each successful sale, withdrawals start at 1,000 ETB, wrong bank details are your responsibility, and after 3 warnings we may deduct 2% from your balance.\n\n" +
      `Full terms: ${SITE_URL}/terms`,
  },
  am: {
    title: "አቤኒ ኤክስፕረስ — የአገልግሎት ውል እና ስምምነት",
    body:
      "እንኳን ወደ አቤኒ ኤክስፕረስ በደህና መጡ። በመመዝገብዎ ከዚህ በታች ባሉት ሕጎች ለመተዳደር ተስማምተዋል፦\n\n" +
      "1. አቤኒ ኤክስፕረስ በኢትዮጵያ የሚሠራ የዲጂታል ገበያ መድረክ ነው።\n" +
      "2. ሕገ-ወጥ እና የተከለከሉ ዕቃዎችን መሸጥ ጥብቅ የተከለከለ ነው፤ ሻጮች ለዕቃቸው ሙሉ ኃላፊነት አለባቸው፤ ካልተመሳሰለ ገዢዎች ሙሉ ገንዘብ የመመለስ መብት አላቸው።\n" +
      "3. የአገልግሎት ትዕዛዞች በ2 ሰዓት ውስጥ መቀበል አለባቸው፤ ካልሆነ በራሱ ይሰረዛል፤ ችላ ማለት መለያ ያሳግዳል።\n" +
      "4. ደንበኞች ዕቃውን በአሽከርካሪው ፊት መፈተሽ አለባቸው፤ ተመላሽ ሲጠየቅ ኦሪጅናል ሳጥን እና የሚሰራ ዕቃ ያስፈልጋል፤ የመመለሻ ወጪ በደንበኛው ወይም በሻጩ ይሸፈናል።\n" +
      "5. ከመተግበሪያው ውጭ ለአሽከርካሪዎች ተጨማሪ ክፍያ አይከፈልም።\n" +
      "6. ሻጮች ዋጋ እና አክሲዮን ማዘመን አለባቸው።\n" +
      "7. አስተያየቶች እውነተኛ መሆን አለባቸው፤ ሐሰተኛ ደረጃ መለያ ያዘጋል።\n" +
      "8. የአቤኒ ኤክስፕረስ ስም፣ ሎጎ እና መተግበሪያ የድርጅቱ ንብረት ናቸው።\n" +
      "9. ለሶስተኛ ወገን ሊንኮች እና ማስታወቂያዎች ኃላፊነት አንወስድም።\n" +
      "10. በጥገና ወይም ከቁጥጥር ውጭ በሆኑ ምክንያቶች መድረኩ ለጊዜው ሊቋረጥ ይችላል።\n" +
      "11. ማጭበርበር ወይም ሀሰተኛ የክፍያ ስክሪን ሾት መለያ በቋሚነት ያዘጋል፤ ከመተግበሪያው ውጭ (ለምሳሌ በቴሌግራም) ለሚደረጉ ግብይቶች ኃላፊነት አንወስድም።\n" +
      "12. የKYC መረጃዎ ደህንነቱ ተጠብቆ ይቀመጣል፤ በፍርድ ቤት ትዕዛዝ ብቻ ለህግ አካላት ይተላለፋል።\n" +
      "13. በእያንዳንዱ ሽያጭ ኮሚሽን ይቀነሳል፤ ገንዘብ ማውጣት ከ1,000 ብር ይጀምራል፤ የተሳሳተ የሂሳብ ቁጥር ኃላፊነቱ የእርስዎ ነው፤ ከ3 ማስጠንቀቂያ በኋላ 2% ሊቀነስ ይችላል።\n\n" +
      `ሙሉ ውል፦ ${SITE_URL}/terms`,
  },
  om: {
    title: "Abeni Express — Haala Tajaajilaa",
    body:
      "Baga nagaan gara Abeni Express dhuftan. Galmaa'uu keessaniin haala armaan gadii fudhattaniittu:\n\n" +
      "1. Abeni Express waltajjii gabaa dijitaalaa Itoophiyaa keessatti hojjatu dha.\n" +
      "2. Meeshaalee seeraan alaa gurguruun cimsee dhorkaadha; gurgurtootni meeshaa isaaniif itti gaafatamu, bitattootnis maallaqa isaanii deebifachuu danda'u.\n" +
      "3. Ajajni tajaajilaa sa'aatii 2 keessatti fudhatamuu qaba; yoo hin taane ofumaan haqama.\n" +
      "4. Maamiltootni fuula konkolaachisaa duratti meeshaa qorachuu qabu; deebisuuf saanduqni jalqabaa fi meeshaan hojjetu barbaachisa.\n" +
      "5. Konkolaachiftootaaf appii alatti kaffaltii dabalataa hin kaffalinaa.\n" +
      "6. Gurgurtootni gatii fi kuusaa haaromsuu qabu.\n" +
      "7. Yaadni dhugaa ta'uu qaba; sobni herrega cufa.\n" +
      "8. Maqaan, logoon fi appiin Abeni Express qabeenya keenya.\n" +
      "9. Hidhaalee fi beeksisa qaama sadaffaatiif itti hin gaafatamnu.\n" +
      "10. Waltajjiin yeroof addaan cituu danda'a.\n" +
      "11. Gowwoomsaan yookaan suuraan kaffaltii sobaa herrega bara baraan cufa; gurgurtaa appii alaa (fkn Telegram) irratti itti hin gaafatamnu.\n" +
      "12. Odeeffannoon KYC keessan nageenyaan kaa'ama; ajaja mana murtiitiin qofa dabarfama.\n" +
      "13. Gurgurtaa milkaa'e hunda irraa komishiniin hir'ifama; baasiin Birrii 1,000 irraa jalqaba; akeekkachiisa 3 booda 2% hir'ifamuu danda'a.\n\n" +
      `Haala guutuu: ${SITE_URL}/terms`,
  },
  ti: {
    title: "ኣበኒ ኤክስፕረስ — ውዕልን ቅጥዕታትን",
    body:
      "ናብ ኣበኒ ኤክስፕረስ እንቋዕ ብደሓን መጻእካ። ብምምዝጋብካ ነዞም ሕግታት ተሰማሚዕካ ኣለኻ፦\n\n" +
      "1. ኣበኒ ኤክስፕረስ ኣብ ኢትዮጵያ ዝሰርሕ ዲጂታላዊ ዕዳጋ መድረኽ እዩ።\n" +
      "2. ዘይሕጋዊ ኣቕሑ ምሻጥ ተሓጊዱ እዩ፤ ሸየጥቲ ምሉእ ሓላፍነት ኣለዎም፤ ዓደግቲ ገንዘቦም ናይ ምምላስ መሰል ኣለዎም።\n" +
      "3. ትእዛዛት ኣገልግሎት ኣብ 2 ሰዓት ክቕበሉ ኣለዎም፤ እንተዘይኮነ ባዕሉ ይስረዝ።\n" +
      "4. ዓማዊል ኣብ ቅድሚ መራሒ መኪና ኣቕሓ ክምርምሩ ኣለዎም፤ ንመመላሲ ኦሪጅናል ሳንዱቕን ዝሰርሕ ኣቕሓን የድሊ።\n" +
      "5. ካብ መተግበሪ ወጻኢ ንመራሕቲ መኪና ተወሳኺ ክፍሊት ኣይክፈልን።\n" +
      "6. ሸየጥቲ ዋጋን ክምችትን ከሓድሱ ኣለዎም።\n" +
      "7. ርእይቶታት ናይ ሓቂ ክኾኑ ኣለዎም፤ ሓሶት ሕሳብ የዕጹ።\n" +
      "8. ስም፡ ሎጎን መተግበሪን ኣበኒ ኤክስፕረስ ንብረትና እዩ።\n" +
      "9. ንናይ ሳልሳይ ወገን ሊንክታት ሓላፍነት ኣይንወስድን።\n" +
      "10. መድረኽ ንግዚኡ ክቋረጽ ይኽእል እዩ።\n" +
      "11. ምትላል ወይ ናይ ሓሶት ስክሪንሾት ንሓዋሩ የዕጹ፤ ካብ መተግበሪ ወጻኢ (ንኣብነት ቴሌግራም) ንዝግበር ንግዲ ሓላፍነት የብልናን።\n" +
      "12. ሓበሬታ KYC ብውሑስ ይተሓዝ፤ ብትእዛዝ ቤት ፍርዲ ጥራይ ይመሓላለፍ።\n" +
      "13. ካብ ነፍሲ ወከፍ ሽያጥ ኮሚሽን ይጉዐት፤ ገንዘብ ምውጻእ ካብ 1,000 ብር ይጅምር፤ ድሕሪ 3 መጠንቀቕታ 2% ክጉዐት ይኽእል።\n\n" +
      `ምሉእ ውዕል: ${SITE_URL}/terms`,
  },
};
