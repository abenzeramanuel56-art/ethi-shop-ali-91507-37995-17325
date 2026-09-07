// Abeni Express Terms & Conditions in the 4 supported languages.
// The Amharic text is the authoritative source; en/om/ti are faithful translations.

export interface TermsSection {
  title: string;
  paragraphs: string[];
}

export interface TermsDoc {
  title: string;
  notice: string;
  sections: TermsSection[];
}

export const TERMS: Record<"en" | "am" | "om" | "ti", TermsDoc> = {
  am: {
    title: "የአቤኒ ኤክስፕረስ (Abeni Express) የአገልግሎት ውል እና ስምምነት (Terms and Conditions)",
    notice:
      "ማሳሰቢያ፡ ይህንን መተግበሪያ በመጠቀምዎ እና በመመዝገብዎ ከዚህ በታች በተዘረዘሩት ሕጎች እና ደንቦች ሙሉ በሙሉ ለመተዳደር ተስማምተዋል ማለት ነው።",
    sections: [
      {
        title: "1. መግቢያ እና ስምምነት",
        paragraphs: [
          "አቤኒ ኤክስፕረስ በኢትዮጵያ ውስጥ የሚሠራ የዲጂታል ገበያ (Marketplace) መድረክ ነው። መተግበሪያውን መጠቀም ሲጀምሩ በዚህ ስምምነት ተስማምተዋል ማለት ነው።",
        ],
      },
      {
        title: "2. የተከለከሉ እቃዎች እና ሕገ-ወጥ ድርጊቶች",
        paragraphs: [
          "አደንዛዥ ዕፆች፣ ሕገ-ወጥ እቃዎች፣ ጎጂ ንጥረ ነገሮች እና በኢትዮጵያ ሕግ መሠረት ሽያጣቸው የተከለከለ ማንኛውም ዕቃ መሸጥ፣ መለወጥ ወይም ማጓጓዝ ጥብቅ የተከለከለ ነው።",
          "ሻጮች ለሚሸጡት ዕቃ ሙሉ ኃላፊነት አለባቸው። የዕቃው መግለጫ፣ ጥራት እና ዋጋ ከአክቱዋል ዕቃው ጋር 100 በመቶ መመሳሰል አለበት። ይህ ካልሆነ ገዢዎች ሙሉ ገንዘብ የመመለስ (Refund) መብት አላቸው።",
        ],
      },
      {
        title: "3. የአገልግሎት ትዕዛዞች እና የአገልግሎት ሰጪዎች ኃላፊነት",
        paragraphs: [
          "በባለሙያዎች እና አገልግሎት ሰጪዎች የሚሰጡ የአገልግሎት ትዕዛዞች ከተሰጡበት ጊዜ ጀምሮ በ 2 ሰዓታት ውስጥ መቀበል (Accept) አለባቸው፤ ካልተቀበሉ ትዕዛዙ በራሱ ይሰረዛል።",
          "አገልግሎት ሰጪዎች ማስተናገድ የማይችሏቸውን ትዕዛዞች መቀበል፣ ማጓጓዝ አለመቻል፣ ወይም ሳይሰሩ በ 24 ሰዓታት ውስጥ አለመሰረዝ መለያዎን (Account) እንዲታገድ ወይም እንዲዘጋ ያደርጋል።",
          "ደንበኛው አገልግሎቱ ከተጠናቀቀ በኋላ ለባለሙያው የሚሰጠውን የክፍያ ኮድ (Payment Code) ለመስጠት ፈቃደኛ ካልሆነ እና ባለሙያው የተሰራበትን ትክክለኛ ማረጋገጫ (Proof) ካቀረበ፣ አቤኒ ኤክስፕረስ ክፍያውን ለባለሙያው በቀጥታ የመልቀቅ ሙሉ መብት አለው።",
        ],
      },
      {
        title: "4. ምርትን ማረጋገጥ፣ ማድረስ እና ገንዘብ ተመላሽ (Refund) ማድረግ",
        paragraphs: [
          "ደንበኞች ዕቃውን ከአሽከርካሪው ከመረከባቸው በፊት በአሽከርካሪው ፊት መፈተሽ እና ማረጋገጥ አለባቸው።",
          "ገንዘብ ተመላሽ (Refund) በሚጠየቅበት ጊዜ ዕቃው የገባበትን ኦሪጅናል ሳጥን (Box) ጨምሮ ሁሉም ነገሮች መሟላት አለባቸው፤ እንዲሁም ዕቃው በትክክል የሚሰራ መሆን አለበት።",
          "ትክክለኛ የመመለሻ ጥያቄ ሲኖር፣ ለዕቃው ማጓጓዣ እና ለአሽከርካሪው የሚወጣው ወጪ በደንበኛው ወይም በሻጩ የሚሸፈን ይሆናል።",
        ],
      },
      {
        title: "5. የአሽከርካሪዎች እና የሎጂስቲክስ ደንቦች",
        paragraphs: [
          "ደንበኞች ከመተግበሪያው ውጭ ለአሽከርካሪዎች ምንም አይነት ተጨማሪ ክፍያ መክፈል የለባቸውም።",
          "አሽከርካሪዎች ማስተናገድ የማይችሏቸውን ትዕዛዞች መቀበል፣ ማድረስ አለመቻል ወይም በጊዜው አለመሰረዝ ከስራ ሊያግድ ወይም መለያቸውን ሊዘጋው ይችላል።",
        ],
      },
      {
        title: "6. የምርት አቅርቦት እና የዋጋ መለዋወጥ (Pricing & Inventory Availability)",
        paragraphs: [
          "የአክሲዮን እና ዋጋ ኃላፊነት፡ ሻጮች በመድረኩ ላይ የሚያስቀምጡትን የዕቃ ዋጋ እና አክሲዮን (Stock) በወቅቱ የማዘመን ሙሉ ኃላፊነት አለባቸው። በዋጋ ስህተት ወይም በእቃ አለቀ ምክንያት የሚፈጠሩ ስረዛዎች በሻጩ ላይ ተጠያቂነትን ያስከትላሉ።",
        ],
      },
      {
        title: "7. የቅምሻ፣ የአስተያየት እና የስም ማጥፋት ደንቦች (Ratings & Reviews)",
        paragraphs: [
          "ተጠቃሚዎች በመድረኩ ላይ የሚሰጧቸው አስተያየቶች፣ ደረጃዎች (Ratings) እና ግምገማዎች እውነተኛ እና በግል ተሞክሮ ላይ የተመሰረቱ መሆን አለባቸው።",
          "ሆን ተብሎ የንግድ ተወዳዳሪዎችን ስም ለማጥፋት፣ የውሸት ደረጃ ለመስጠት ወይም ተጠቃሚዎችን ለማሳሳት የሚደረግ ሙከራ መለያው እንዲዘጋ ያደርጋል።",
        ],
      },
      {
        title: "8. የአዕምሯዊ ንብረት መብት (Intellectual Property)",
        paragraphs: [
          "የ«አቤኒ ኤክስፕረስ» ስም፣ ሎጎ፣ የድር ጣቢያ ዲዛይን፣ መተግበሪያው (App) እና የኮድ ባለቤትነት ሙሉ በሙሉ የድርጅቱ ናቸው። ያለ ፍቃድ መጠቀም፣ መቅዳት ወይም ሌላ ቦታ ማሳየት በጥብቅ የተከለከለ ነው።",
        ],
      },
      {
        title: "9. የሶስተኛ ወገን ሊንኮች እና ማስታወቂያዎች (Third-Party Links)",
        paragraphs: [
          "በመድረኩ ላይ ሊኖሩ የሚችሉ ከሶስተኛ ወገን የሚመጡ ማስታወቂያዎች ወይም ሊንኮች ለሚፈጥሩት ማንኛውም ጉዳት ወይም ኪሳራ አቤኒ ኤክስፕረስ ኃላፊነት አይወስድም።",
        ],
      },
      {
        title: "10. መድረኩን በድንገት የማቋረጥ ወይም የማሻሻል መብት (Platform Modification & Downtime)",
        paragraphs: [
          "ቴክኒካዊ ችግሮች፣ የሰርቨር ማሻሻያዎች ወይም ከቁጥጥር ውጭ የሆኑ ምክንያቶች (Force Majeure) ሲያጋጥሙ መድረኩ ለጊዜው ሊቋረጥ ይችላል። ለዚህም መድረኩ ለተጠቃሚዎች የቅድመ ክፍያ ካሳ ለመክፈል ግዴታ የለበትም፤ ነገር ግን ያሉትን ገቢዎች ለመጠበቅ ጥረት ያደርጋል።",
        ],
      },
      {
        title: "11. ማጭበርበር፣ ሀሰተኛ መረጃ እና የፕላትፎርም ኃላፊነት",
        paragraphs: [
          "ማንኛውም የማጭበርበር ሙከራ፣ ሀሰተኛ የስክሪን ሾት (Fake Screenshot) መላክ ወይም ሕገ-ወጥ ድርጊት ወዲያውኑ መለያውን መዘጋት (Permanent Ban) ያስከትላል።",
          "የፕላትፎርም ኃላፊነት ወሰን፡ አቤኒ ኤክስፕረስ በኦፊሴላዊው መተግበሪያ ውስጥ ለሚፈጸሙ ግብይቶች እና ስራዎች ሙሉ ኃላፊነት ይወስዳል። ነገር ግን እንደ ቴሌግራም ባሉ ከሶስተኛ ወገን መተግበሪያዎች ጋር ከፕላትፎርሙ ውጭ ለሚደረጉ ግብይቶች እና ሽያጮች አቤኒ ኤክስፕረስ ምንም አይነት ኃላፊነት አይወስድም።",
        ],
      },
      {
        title: "12. የህግ ተጠያቂነት፣ የኬአይሲ (KYC) ደህንነት እና መረጃ ጥበቃ",
        paragraphs: [
          "የኬአይሲ (KYC) መረጃዎ ደህንነቱ በተጠበቀ ሁኔታ ይቀመጣል። ነገር ግን በአቤኒ ኤክስፕረስ መድረክ ላይ የሚንቀሳቀሰው ገንዘብ ከገንዘብ ማጠብ (Money Laundering) ወንጀል ጋር የተያያዘ ሆኖ ሲገኝ እና የፍርድ ቤት ትዕዛዝ ሲመጣ መረጃዎን ለህግ አካላት የማስተላለፍ ሙሉ መብት አለን።",
          "ማንኛውም ተጠቃሚ ከባድ ህጋዊ ወንጀል እስካልፈጸመ ድረስ የመኖሪያ ቦታዎን ወይም ሎኬሽንዎን (Location) ለሶስተኛ ወገን አናጋራም።",
          "ማንኛውም ሻጭ ወይም አገልግሎት ሰጪ በመድረኩ በኩል ሕገ-ወጥ ወይም ጎጂ ድርጊት ከፈጸመ፣ አቤኒ ኤክስፕረስ በኢትዮጵያ ሕግ መሠረት ኃላፊነቱን ለወሰደው አካል ላይ ሕጋዊ እርምጃ የመውሰድ እና የከሰረውን ካሳ የማስከፈል ሙሉ መብት አለው።",
        ],
      },
      {
        title: "13. የኮሚሽን ክፍያ፣ የገንዘብ ማውጣት (Withdrawal) እና የቅጣት ደንቦች",
        paragraphs: [
          "የኮሚሽን ተቀናሽ፡ አቤኒ ኤክስፕረስ መድረኩን በማስተዳደሩ ምክንያት በእያንዳንዱ የተሳካ ሽያጭ ወይም አገልግሎት ላይ የሚገባውን የአገልግሎት ክፍያ (ኮሚሽን) ከጠቅላላው ገንዘብ ላይ ቆርጦ ለሻጩ ወይም ለአገልግሎት ሰጪው ቀሪውን ያስተላልፋል።",
          "ገንዘብ የማውጣት ገደብ (Withdrawal Limit): የሻጮች እና አገልግሎት ሰጪዎች የሂሳብ ቀሪ ሂሳብ ቢያንስ 1,000 ብር እስኪደርስ ድረስ ገንዘብ ማውጣት (Withdraw) ማድረግ አይችሉም።",
          "የሂሳብ ቁጥር ስህተት፡ ተጠቃሚዎች የባንክ ሂሳብ ቁጥራቸውን ወይም ስማቸውን ስላት ገንዘቡ ቢጠፋ ወይም ቢዘገይ አቤኒ ኤክስፕረስ ምንም አይነት ኃላፊነት አይወስድም።",
          "የማስጠንቀቂያ እና የቅጣት ደንብ (Warnings & Deductions): ተጠቃሚዎች፣ ሻጮች ወይም አገልግሎት ሰጪዎች የፕላትፎርሙን ደንቦች ጥሰቁ ሶስት (3) ማስጠንቀቂያዎች ከተሰጧቸው በኋላ፣ አቤኒ ኤክስፕረስ ከሂሳባቸው ላይ 2 በመቶ (2%) ገቢ የመቀነስ (Deduct) ሙሉ መብት አለው።",
        ],
      },
    ],
  },

  en: {
    title: "Abeni Express Terms and Conditions",
    notice:
      "Notice: By using and registering on this application, you agree to be fully bound by the rules and regulations listed below.",
    sections: [
      {
        title: "1. Introduction and Agreement",
        paragraphs: [
          "Abeni Express is a digital marketplace platform operating in Ethiopia. When you start using the application, it means you have agreed to this agreement.",
        ],
      },
      {
        title: "2. Prohibited Items and Illegal Activities",
        paragraphs: [
          "Selling, exchanging or transporting narcotics, illegal goods, harmful substances, and any item whose sale is prohibited under Ethiopian law is strictly forbidden.",
          "Sellers bear full responsibility for the items they sell. The description, quality and price of the item must match the actual item 100 percent. If this is not the case, buyers have the right to a full refund.",
        ],
      },
      {
        title: "3. Service Orders and the Responsibility of Service Providers",
        paragraphs: [
          "Service orders given to professionals and service providers must be accepted within 2 hours from the time they are placed; if they are not accepted, the order is cancelled automatically.",
          "Service providers accepting orders they cannot handle, failing to deliver, or failing to cancel within 24 hours without performing the work will cause their account to be suspended or closed.",
          "If, after the service is completed, the customer refuses to give the professional the payment code, and the professional presents valid proof that the work was done, Abeni Express has the full right to release the payment directly to the professional.",
        ],
      },
      {
        title: "4. Verifying the Product, Delivery and Refunds",
        paragraphs: [
          "Customers must inspect and verify the item in front of the driver before accepting it from the driver.",
          "When a refund is requested, everything — including the original box the item came in — must be complete, and the item must be in proper working condition.",
          "When there is a valid return request, the cost of transporting the item and paying the driver will be covered by the customer or the seller.",
        ],
      },
      {
        title: "5. Driver and Logistics Rules",
        paragraphs: [
          "Customers must not pay drivers any additional fee outside of the application.",
          "Drivers accepting orders they cannot handle, failing to deliver, or failing to cancel on time may be suspended from work or have their account closed.",
        ],
      },
      {
        title: "6. Pricing and Inventory Availability",
        paragraphs: [
          "Stock and price responsibility: Sellers have full responsibility for keeping the price and stock of the items they list on the platform up to date. Cancellations caused by pricing errors or out-of-stock items result in liability for the seller.",
        ],
      },
      {
        title: "7. Ratings, Reviews and Defamation Rules",
        paragraphs: [
          "Comments, ratings and reviews given by users on the platform must be genuine and based on personal experience.",
          "Any deliberate attempt to defame business competitors, give false ratings, or mislead users will result in the account being closed.",
        ],
      },
      {
        title: "8. Intellectual Property",
        paragraphs: [
          "The \"Abeni Express\" name, logo, website design, application and code are entirely owned by the company. Using, copying or displaying them elsewhere without permission is strictly prohibited.",
        ],
      },
      {
        title: "9. Third-Party Links and Advertisements",
        paragraphs: [
          "Abeni Express takes no responsibility for any damage or loss caused by third-party advertisements or links that may appear on the platform.",
        ],
      },
      {
        title: "10. Platform Modification and Downtime",
        paragraphs: [
          "The platform may be temporarily interrupted due to technical problems, server upgrades, or reasons beyond our control (force majeure). For this, the platform is not obliged to pay users any advance compensation; however, it will make every effort to protect existing balances.",
        ],
      },
      {
        title: "11. Fraud, False Information and Platform Liability",
        paragraphs: [
          "Any attempt at fraud, sending a fake screenshot, or any illegal act will immediately result in a permanent ban of the account.",
          "Limit of platform liability: Abeni Express takes full responsibility for transactions and work carried out inside the official application. However, Abeni Express takes no responsibility whatsoever for transactions and sales made outside the platform through third-party applications such as Telegram.",
        ],
      },
      {
        title: "12. Legal Liability, KYC Security and Data Protection",
        paragraphs: [
          "Your KYC information is stored securely. However, when money moving on the Abeni Express platform is found to be connected to money laundering and a court order is issued, we have the full right to hand over your information to the legal authorities.",
          "Unless a user has committed a serious legal crime, we will not share your residence or location with any third party.",
          "If any seller or service provider commits an illegal or harmful act through the platform, Abeni Express has the full right to take legal action against the responsible party under Ethiopian law and to claim compensation for the losses incurred.",
        ],
      },
      {
        title: "13. Commission, Withdrawal and Penalty Rules",
        paragraphs: [
          "Commission deduction: Because Abeni Express administers the platform, it deducts its due service fee (commission) from the total amount of every successful sale or service and transfers the remainder to the seller or service provider.",
          "Withdrawal limit: Sellers and service providers cannot withdraw money until their account balance reaches at least 1,000 Birr.",
          "Account number errors: Abeni Express takes no responsibility whatsoever if money is lost or delayed because users entered their bank account number or name incorrectly.",
          "Warnings and deductions: After users, sellers or service providers have been given three (3) warnings for violating the platform's rules, Abeni Express has the full right to deduct 2 percent (2%) of their earnings from their account.",
        ],
      },
    ],
  },

  om: {
    title: "Waliigaltee Tajaajilaa fi Haalawwan Abeni Express",
    notice:
      "Beeksisa: Appilikeeshinii kana fayyadamuu fi itti galmaa'uu keessaniin, seerotaa fi dambiiwwan armaan gadii guutummaatti fudhattanii jirtu jechuudha.",
    sections: [
      {
        title: "1. Seensaa fi Waliigaltee",
        paragraphs: [
          "Abeni Express gabaa dijitaalaa (marketplace) Itoophiyaa keessatti hojjetuudha. Appilikeeshinicha fayyadamuu yeroo jalqabdan, waliigaltee kanaaf walii galtanii jirtu jechuudha.",
        ],
      },
      {
        title: "2. Meeshaalee Dhorkamanii fi Gochawwan Seeraan Alaa",
        paragraphs: [
          "Qorichoota sammuu hadoochan, meeshaalee seeraan alaa, wantoota miidhaa qaban akkasumas meeshaa kamiyyuu seera Itoophiyaatiin gurgurtaan isaa dhorkame gurguruun, jijjiiruun yookaan geejjibuun cimsee dhorkaadha.",
          "Gurgurtoonni meeshaa gurguran irratti itti gaafatamummaa guutuu qabu. Ibsi meeshaa, qulqullinni fi gatiin isaa meeshaa dhugaa waliin dhibbeentaa 100 walsimuu qaba. Kun yoo hin taane, bittoonni maallaqa isaanii guutummaatti deebifachuuf (refund) mirga qabu.",
        ],
      },
      {
        title: "3. Ajaja Tajaajilaa fi Itti Gaafatamummaa Kennitoota Tajaajilaa",
        paragraphs: [
          "Ajajni tajaajilaa ogeessotaa fi kennitoota tajaajilaatiif kenname yeroo kennamee irraa eegalee sa'aatii 2 keessatti fudhatamuu (accept) qaba; yoo hin fudhatamne ajajni ofumaan haqama.",
          "Kennitoonni tajaajilaa ajaja hojjechuu hin dandeenye fudhachuun, geejjibuu dadhabuun, yookaan osoo hin hojjetin sa'aatii 24 keessatti haquu dhabuun akkaawuntiin isaanii akka ugguramu yookaan cufamu taasisa.",
          "Erga tajaajilli xumurameen booda maamilichi koodii kaffaltii (payment code) ogeessichaaf kennuu yoo dide, ogeessichi immoo ragaa hojii hojjetame dhugaa yoo dhiyeesse, Abeni Express kaffaltii sana kallattiin ogeessichaaf gadhiisuuf mirga guutuu qaba.",
        ],
      },
      {
        title: "4. Oomisha Mirkaneessuu, Geessuu fi Maallaqa Deebisuu (Refund)",
        paragraphs: [
          "Maamiltoonni meeshaa konkolaachisaa irraa fudhachuun dura fuula konkolaachisaa duratti qoruu fi mirkaneeffachuu qabu.",
          "Yeroo maallaqni deebi'uu (refund) gaafatamu, saanduqa (box) isa jalqabaa dabalatee wantoonni hundi guutuu qabu; akkasumas meeshichi sirriitti hojjetu ta'uu qaba.",
          "Yeroo gaaffiin deebii sirrii jiru, baasiin geejjibaa meeshaatii fi kaffaltii konkolaachisaaf ba'u maamilichaan yookaan gurgurtaadhaan kaffalama.",
        ],
      },
      {
        title: "5. Dambiiwwan Konkolaachiftootaa fi Lojistiksii",
        paragraphs: [
          "Maamiltoonni appilikeeshinicha alatti konkolaachiftootaaf kaffaltii dabalataa kamiyyuu kaffaluu hin qaban.",
          "Konkolaachiftoonni ajaja hojjechuu hin dandeenye fudhachuun, geessuu dadhabuun yookaan yeroon haquu dhabuun hojii irraa uggurамuu yookaan akkaawuntii isaanii cufuu danda'a.",
        ],
      },
      {
        title: "6. Argamsa Oomishaa fi Jijjiirama Gatii",
        paragraphs: [
          "Itti gaafatamummaa istookii fi gatii: Gurgurtoonni gatii fi istookii meeshaa waltajjii irratti kaa'an yeroo isaatti haaromsuuf itti gaafatamummaa guutuu qabu. Haqamuun dogoggora gatiin yookaan meeshaan dhumuun uumamu itti gaafatamummaa gurgurtaa irratti fida.",
        ],
      },
      {
        title: "7. Dambiiwwan Yaadaa, Sadarkeessuu fi Maqaa Balleessuu",
        paragraphs: [
          "Yaadonni, sadarkaaleen (ratings) fi gamaaggamni fayyadamtoonni waltajjii irratti kennan dhugaa fi muuxannoo dhuunfaa irratti kan hundaa'e ta'uu qaba.",
          "Beekumsaan dorgomtoota daldalaa maqaa balleessuuf, sadarkaa sobaa kennuuf yookaan fayyadamtoota dogoggorsiisuuf yaaliin godhamu akkaawuntiin akka cufamu taasisa.",
        ],
      },
      {
        title: "8. Mirga Qabeenya Sammuu",
        paragraphs: [
          "Maqaan \"Abeni Express\", logoon, dizaayiniin marsariitii, appilikeeshiniin fi koodiin guutummaatti kan dhaabbatichaati. Hayyama malee itti fayyadamuun, garagalchuun yookaan bakka biraatti agarsiisuun cimsee dhorkaadha.",
        ],
      },
      {
        title: "9. Liinkii fi Beeksisa Qaama Sadaffaa",
        paragraphs: [
          "Beeksisootni yookaan liinkiiwwan qaama sadaffaa irraa dhufan waltajjii irratti argamuu danda'an miidhaa yookaan kasaaraa uuman kamiyyuuf Abeni Express itti gaafatamummaa hin fudhatu.",
        ],
      },
      {
        title: "10. Mirga Waltajjii Addaan Kutuu yookaan Fooyyessuu",
        paragraphs: [
          "Rakkoo teeknikaa, fooyya'iinsa sarvarii yookaan sababoota to'annoo keenyaan alaa (force majeure) yoo mudatan waltajjiin yeroof addaan cituu danda'a. Kanaafis waltajjiin fayyadamtootaaf beenyaa duraa kaffaluuf dirqama hin qabu; haa ta'u malee galiiwwan jiran eeguuf carraaqqii ni godha.",
        ],
      },
      {
        title: "11. Gowwoomsaa, Odeeffannoo Sobaa fi Itti Gaafatamummaa Waltajjii",
        paragraphs: [
          "Yaaliin gowwoomsaa kamiyyuu, suuraa iskiriinii sobaa (fake screenshot) erguun yookaan gochi seeraan alaa battalumatti akkaawuntiin bara baraan akka cufamu (permanent ban) taasisa.",
          "Daangaa itti gaafatamummaa waltajjii: Abeni Express daldala fi hojii appilikeeshinii ofiisaa keessatti raawwataman irratti itti gaafatamummaa guutuu ni fudhata. Haa ta'u malee, akka Telegram appilikeeshinota qaama sadaffaa waliin waltajjiin alatti daldalaa fi gurgurtaa godhamuuf Abeni Express itti gaafatamummaa homaatuu hin fudhatu.",
        ],
      },
      {
        title: "12. Itti Gaafatamummaa Seeraa, Nageenya KYC fi Eegumsa Odeeffannoo",
        paragraphs: [
          "Odeeffannoon KYC keessan haala nageenyi isaa eegameen olkaa'ama. Haa ta'u malee, maallaqni waltajjii Abeni Express irratti socho'u yakka maallaqa dhiquu (money laundering) waliin walqabatee yoo argame fi ajajni mana murtii yoo dhufe, odeeffannoo keessan qaamolee seeraatiif dabarsinee kennuuf mirga guutuu qabna.",
          "Fayyadamaan kamiyyuu yakka seeraa cimaa hin raawwanne yoo ta'e, iddoo jireenya keessanii yookaan bakka argama keessan (location) qaama sadaffaatiif hin qoodnu.",
          "Gurgurtaan yookaan kennaan tajaajilaa kamiyyuu karaa waltajjichaa gocha seeraan alaa yookaan miidhaa qabu yoo raawwate, Abeni Express seera Itoophiyaa bu'uura godhachuun qaama itti gaafatamu irratti tarkaanfii seeraa fudhachuu fi beenyaa kasaaraa gaafachuuf mirga guutuu qaba.",
        ],
      },
      {
        title: "13. Kaffaltii Komishinii, Maallaqa Baasuu (Withdrawal) fi Dambii Adabbii",
        paragraphs: [
          "Hir'ina komishinii: Abeni Express waltajjicha bulchuu isaatiif gurgurtaa yookaan tajaajila milkaa'e hunda irraa kaffaltii tajaajilaa (komishinii) isa malu maallaqa waliigalaa irraa hir'isee hafe gurgurtaadhaaf yookaan kennaa tajaajilaatiif dabarsa.",
          "Daangaa maallaqa baasuu: Gurgurtoonni fi kennitoonni tajaajilaa hanga hafteen herrega isaanii yoo xiqqaate Birrii 1,000 ga'utti maallaqa baafachuu hin danda'an.",
          "Dogoggora lakkoofsa herregaa: Fayyadamtoonni lakkoofsa herrega baankii isaanii yookaan maqaa isaanii dogoggoraan barreessuun maallaqni yoo bade yookaan yoo tureef Abeni Express itti gaafatamummaa homaatuu hin fudhatu.",
          "Dambii akeekkachiisaa fi hir'isuu: Fayyadamtoonni, gurgurtoonni yookaan kennitoonni tajaajilaa dambiiwwan waltajjii cabsanii akeekkachiisa sadii (3) erga kennameefii booda, Abeni Express galii isaanii irraa dhibbeentaa lama (2%) hir'isuuf mirga guutuu qaba.",
        ],
      },
    ],
  },

  ti: {
    title: "ውዕልን ኩነታት ኣገልግሎት ኣቤኒ ኤክስፕረስ (Abeni Express)",
    notice:
      "መዘኻኸሪ፡ ነዚ ኣፕሊኬሽን ብምጥቃምኩምን ብምምዝጋብኩምን፡ ኣብ ታሕቲ ተዘርዚሮም ዘለዉ ሕግታትን ደንብታትን ብምሉእ ንኽትግዝኡ ተሰማሚዕኩም ማለት እዩ።",
    sections: [
      {
        title: "1. መእተውን ስምምዕን",
        paragraphs: [
          "ኣቤኒ ኤክስፕረስ ኣብ ኢትዮጵያ ዝሰርሕ ዲጂታላዊ ዕዳጋ (Marketplace) መድረኽ እዩ። ነቲ ኣፕሊኬሽን ክትጥቀሙ ምስ ጀመርኩም፡ በዚ ስምምዕ ተሰማሚዕኩም ማለት እዩ።",
        ],
      },
      {
        title: "2. ክልኩላት ኣቕሑን ዘይሕጋዊ ተግባራትን",
        paragraphs: [
          "ዕጸ ፋርስ፡ ዘይሕጋዊ ኣቕሑ፡ ጐዳእቲ ነገራትን ብሕጊ ኢትዮጵያ መሸጣኦም ዝተኸልከለ ዝኾነ ይኹን ኣቕሓን ምሻጥ፡ ምልውዋጥ ወይ ምጕዕዓዝ ብትሪ ክልኩል እዩ።",
          "ሸየጥቲ ንዝሸጥዎ ኣቕሓ ምሉእ ሓላፍነት ኣለዎም። መግለጺ፡ ብቕዓትን ዋጋን እቲ ኣቕሓ ምስቲ ናይ ሓቂ ኣቕሓ 100 ሚእታዊት ክመሳሰል ኣለዎ። እዚ እንተዘይኮይኑ፡ ገዛእቲ ምሉእ ገንዘቦም ናይ ምምላስ (Refund) መሰል ኣለዎም።",
        ],
      },
      {
        title: "3. ትእዛዛት ኣገልግሎትን ሓላፍነት ወሃብቲ ኣገልግሎትን",
        paragraphs: [
          "ንክኢላታትን ወሃብቲ ኣገልግሎትን ዝወሃቡ ትእዛዛት ኣገልግሎት ካብ ዝተውሃቡሉ ግዜ ጀሚሮም ኣብ ውሽጢ 2 ሰዓታት ክቕበልዎም (Accept) ኣለዎም፤ እንተዘይተቐቢሎም እቲ ትእዛዝ ባዕሉ ይስረዝ።",
          "ወሃብቲ ኣገልግሎት ከማልእዎም ዘይክእሉ ትእዛዛት ምቕባል፡ ምብጻሕ ምስኣን፡ ወይ ከይሰርሑ ኣብ ውሽጢ 24 ሰዓታት ዘይምስራዝ መለለዪኦም (Account) ክእገድ ወይ ክዕጾ ይገብር።",
          "እቲ ዓሚል ድሕሪ ምዝዛም እቲ ኣገልግሎት ንኽኢላ ዝወሃብ ናይ ክፍሊት ኮድ (Payment Code) ክህብ ፍቓደኛ እንተዘይኮይኑን እቲ ክኢላ ግቡእ መረጋገጺ (Proof) እንተቕሪቡን፡ ኣቤኒ ኤክስፕረስ ነቲ ክፍሊት ብቐጥታ ንኽኢላ ናይ ምልቃቕ ምሉእ መሰል ኣለዎ።",
        ],
      },
      {
        title: "4. ንፍርያት ምርግጋጽ፡ ምብጻሕን ገንዘብ ምምላስን (Refund)",
        paragraphs: [
          "ዓማዊል ነቲ ኣቕሓ ካብ ሓጋዚ ኣውቲስታ ቅድሚ ምርካቦም ኣብ ቅድሚ እቲ ኣውቲስታ ክምርምርዎን ከረጋግጽዎን ኣለዎም።",
          "ገንዘብ ናይ ምምላስ (Refund) ሕቶ ኣብ ዝቐርበሉ እዋን፡ እቲ ኣቕሓ ዝኣተወሉ ኦሪጅናል ሳጹን (Box) ሓዊሱ ኩሉ ነገር ክማላእ ኣለዎ፤ ከምኡ’ውን እቲ ኣቕሓ ብግቡእ ዝሰርሕ ክኸውን ኣለዎ።",
          "ቅኑዕ ናይ ምምላስ ሕቶ ኣብ ዝህልወሉ እዋን፡ ንመጓዓዝያ እቲ ኣቕሓን ንኽፍሊት እቲ ኣውቲስታን ዝወጽእ ወጻኢ ብዓሚል ወይ ብሸያጢ ዝሽፈን ይኸውን።",
        ],
      },
      {
        title: "5. ሕግታት ኣውቲስታታትን ሎጂስቲክስን",
        paragraphs: [
          "ዓማዊል ካብቲ ኣፕሊኬሽን ወጻኢ ንኣውቲስታታት ዝኾነ ተወሳኺ ክፍሊት ክኸፍሉ የብሎምን።",
          "ኣውቲስታታት ከማልእዎም ዘይክእሉ ትእዛዛት ምቕባል፡ ምብጻሕ ምስኣን ወይ ብግዜኡ ዘይምስራዝ ካብ ስራሕ ከእግዶም ወይ መለለዪኦም ክዕጾ ይኽእል።",
        ],
      },
      {
        title: "6. ቀረብ ፍርያትን ምልውዋጥ ዋጋን",
        paragraphs: [
          "ሓላፍነት ስቶክን ዋጋን፡ ሸየጥቲ ኣብ መድረኽ ዘቐምጥዎ ዋጋን ስቶክን ብግዜኡ ናይ ምሕዳስ ምሉእ ሓላፍነት ኣለዎም። ብጌጋ ዋጋ ወይ ብምውዳእ ኣቕሓ ዝፍጠሩ ስረዛታት ኣብ ልዕሊ እቲ ሸያጢ ተሓታትነት የስዕቡ።",
        ],
      },
      {
        title: "7. ሕግታት ርእይቶ፡ ደረጃን ስም ምጽላምን",
        paragraphs: [
          "ተጠቀምቲ ኣብ መድረኽ ዝህብዎም ርእይቶታት፡ ደረጃታት (Ratings) ከምኡ’ውን ገምጋማት ናይ ሓቂን ኣብ ውልቃዊ ተመኩሮ ዝተመስረቱን ክኾኑ ኣለዎም።",
          "ብተንኮል ንንግዳዊ ተወዳደርቲ ስም ንምጽላም፡ ናይ ሓሶት ደረጃ ንምሃብ ወይ ተጠቀምቲ ንምድንጋር ዝግበር ፈተነ መለለዪኡ ክዕጾ ይገብር።",
        ],
      },
      {
        title: "8. መሰል ኣእምሮኣዊ ንብረት",
        paragraphs: [
          "ስም «ኣቤኒ ኤክስፕረስ»፡ ሎጎ፡ ዲዛይን ወብሳይት፡ እቲ ኣፕሊኬሽንን ኮድን ብምሉኡ ናይቲ ትካል እዩ። ብዘይ ፍቓድ ምጥቃም፡ ምቕዳሕ ወይ ኣብ ካልእ ቦታ ምርኣይ ብትሪ ክልኩል እዩ።",
        ],
      },
      {
        title: "9. ናይ ሳልሳይ ወገን ሊንክታትን መወዓውዒታትን",
        paragraphs: [
          "ኣብ መድረኽ ክህልዉ ዝኽእሉ ካብ ሳልሳይ ወገን ዝመጹ መወዓውዒታት ወይ ሊንክታት ንዝፈጥርዎ ዝኾነ ጉድኣት ወይ ክሳራ ኣቤኒ ኤክስፕረስ ሓላፍነት ኣይወስድን።",
        ],
      },
      {
        title: "10. መሰል ንመድረኽ ናይ ምቁራጽ ወይ ምምሕያሽ",
        paragraphs: [
          "ቴክኒካዊ ጸገማት፡ ምምሕያሽ ሰርቨር ወይ ካብ ቁጽጽር ወጻኢ ዝኾኑ ምኽንያታት (Force Majeure) ኣብ ዘጋጥሙሉ እዋን እቲ መድረኽ ንግዜኡ ክቋረጽ ይኽእል። ንዚ’ውን እቲ መድረኽ ንተጠቀምቲ ናይ ቅድመ ክፍሊት ካሕሳ ናይ ምኽፋል ግዴታ የብሉን፤ እንተኾነ ግን ዘለዉ እቶታት ንምሕላው ጻዕሪ ይገብር።",
        ],
      },
      {
        title: "11. ምትላል፡ ናይ ሓሶት ሓበሬታን ሓላፍነት መድረኽን",
        paragraphs: [
          "ዝኾነ ናይ ምትላል ፈተነ፡ ናይ ሓሶት ስክሪንሾት (Fake Screenshot) ምልኣኽ ወይ ዘይሕጋዊ ተግባር ብቕጽበት መለለዪ ንኽዕጾ (Permanent Ban) የስዕብ።",
          "ደረት ሓላፍነት መድረኽ፡ ኣቤኒ ኤክስፕረስ ኣብ ውሽጢ እቲ ወግዓዊ ኣፕሊኬሽን ንዝፍጸሙ ንግዳዊ ልውውጣትን ስራሓትን ምሉእ ሓላፍነት ይወስድ። እንተኾነ ግን ከም ተለግራም ብዝኣመሰሉ ናይ ሳልሳይ ወገን ኣፕሊኬሽናት ካብቲ መድረኽ ወጻኢ ንዝግበሩ ልውውጣትን መሸጣታትን ኣቤኒ ኤክስፕረስ ዝኾነ ሓላፍነት ኣይወስድን።",
        ],
      },
      {
        title: "12. ሕጋዊ ተሓታትነት፡ ድሕነት KYC ከምኡ’ውን ሓለዋ ሓበሬታ",
        paragraphs: [
          "ናይ KYC ሓበሬታኹም ብውሑስ ኩነታት ይዕቀብ። እንተኾነ ግን ኣብ መድረኽ ኣቤኒ ኤክስፕረስ ዝንቀሳቐስ ገንዘብ ምስ ገበን ምሕጻብ ገንዘብ (Money Laundering) ዝተኣሳሰር ኮይኑ ምስ ዝርከብን ትእዛዝ ቤት ፍርዲ ምስ ዝመጽእን ሓበሬታኹም ንሕጋዊ ኣካላት ናይ ምትሕልላፍ ምሉእ መሰል ኣለና።",
          "ዝኾነ ተጠቃሚ ከቢድ ሕጋዊ ገበን ክሳብ ዘይፈጸመ፡ መንበሪ ቦታኹም ወይ ኣበይ ከም ዘለኹም (Location) ንሳልሳይ ወገን ኣይነካፍልን።",
          "ዝኾነ ሸያጢ ወይ ወሃቢ ኣገልግሎት ብመንገዲ እቲ መድረኽ ዘይሕጋዊ ወይ ጐዳኢ ተግባር እንተፈጺሙ፡ ኣቤኒ ኤክስፕረስ ብመሰረት ሕጊ ኢትዮጵያ ኣብ ልዕሊ እቲ ሓላፍነት ዝወሰደ ኣካል ሕጋዊ ስጉምቲ ናይ ምውሳድን ዝወረደ ክሳራ ናይ ምኽፋልን ምሉእ መሰል ኣለዎ።",
        ],
      },
      {
        title: "13. ክፍሊት ኮሚሽን፡ ገንዘብ ምውጻእ (Withdrawal) ከምኡ’ውን ሕግታት መቕጻዕቲ",
        paragraphs: [
          "ተቐናሲ ኮሚሽን፡ ኣቤኒ ኤክስፕረስ ነቲ መድረኽ ብምምሕዳሩ ምኽንያት ኣብ ነፍሲ ወከፍ ዕዉት መሸጣ ወይ ኣገልግሎት ዝግብኦ ናይ ኣገልግሎት ክፍሊት (ኮሚሽን) ካብ ጠቕላላ ገንዘብ ቆሪጹ እቲ ተረፍ ንሸያጢ ወይ ንወሃቢ ኣገልግሎት የመሓላልፍ።",
          "ደረት ገንዘብ ምውጻእ (Withdrawal Limit)፡ ሸየጥትን ወሃብቲ ኣገልግሎትን ተረፍ ሒሳቦም እንተወሓደ 1,000 ብር ክሳብ ዝበጽሕ ገንዘብ ከውጽኡ ኣይክእሉን።",
          "ጌጋ ቁጽሪ ሒሳብ፡ ተጠቀምቲ ቁጽሪ ባንክ ሒሳቦም ወይ ስሞም ብጌጋ ብምምላኦም እቲ ገንዘብ እንተጠፍአ ወይ እንተደንጐየ ኣቤኒ ኤክስፕረስ ዝኾነ ሓላፍነት ኣይወስድን።",
          "ሕጊ መጠንቀቕታን ተቐናሲን (Warnings & Deductions)፡ ተጠቀምቲ፡ ሸየጥቲ ወይ ወሃብቲ ኣገልግሎት ሕግታት እቲ መድረኽ ጢሒሶም ሰለስተ (3) መጠንቀቕታታት ድሕሪ ምውሳዶም፡ ኣቤኒ ኤክስፕረስ ካብ ሒሳቦም 2 ሚእታዊት (2%) እቶት ናይ ምቕናስ (Deduct) ምሉእ መሰል ኣለዎ።",
        ],
      },
    ],
  },
};
