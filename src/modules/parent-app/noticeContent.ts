/** Layered notice content shown in Setup and (read-only) linked from Home. Plain English + Hindi. */

export const NOTICE_SUMMARY: { en: string; hi: string }[] = [
  { en: 'We use your child’s name, class and your contact details to run the school.', hi: 'हम आपके बच्चे का नाम, कक्षा और आपका संपर्क विवरण स्कूल चलाने के लिए उपयोग करते हैं।' },
  { en: 'Photos and videos are shared only the way you choose — private, inside school, or public.', hi: 'तस्वीरें और वीडियो केवल आपकी पसंद के अनुसार साझा होते हैं — निजी, स्कूल के भीतर, या सार्वजनिक।' },
  { en: 'You can change any choice, any time, in this app.', hi: 'आप कोई भी पसंद इस ऐप में कभी भी बदल सकते हैं।' },
  { en: 'CCTV, attendance and bus tracking are covered as child-safety exemptions — no separate consent form.', hi: 'सीसीटीवी, उपस्थिति और बस ट्रैकिंग बाल-सुरक्षा छूट के अंतर्गत आते हैं — अलग सहमति फ़ॉर्म की आवश्यकता नहीं।' },
  { en: 'Questions go to our named privacy contact and get answered in days, not months.', hi: 'प्रश्न हमारे नामित प्राइवेसी संपर्क के पास जाते हैं और महीनों में नहीं, दिनों में उत्तर मिलता है।' },
]

export interface NoticeSection { key: string; title: { en: string; hi: string }; body: { en: string; hi: string } }

export const NOTICE_SECTIONS: NoticeSection[] = [
  {
    key: 'collect',
    title: { en: 'What we collect', hi: 'हम क्या एकत्र करते हैं' },
    body: {
      en: 'Name, date of birth, class, admission number, guardian contact details, attendance, marks, any health notes you share, and photos or videos from school events.',
      hi: 'नाम, जन्म तिथि, कक्षा, प्रवेश संख्या, अभिभावक संपर्क विवरण, उपस्थिति, अंक, आपके द्वारा साझा किए गए स्वास्थ्य नोट्स, और स्कूल कार्यक्रमों की तस्वीरें या वीडियो।',
    },
  },
  {
    key: 'why',
    title: { en: 'Why we use it', hi: 'हम इसका उपयोग क्यों करते हैं' },
    body: {
      en: 'To teach and assess your child, keep the campus safe, communicate with you, and — only where you allow it — share photos and celebrate school life.',
      hi: 'आपके बच्चे को पढ़ाने और आंकने के लिए, परिसर को सुरक्षित रखने के लिए, आपसे संवाद करने के लिए, और — केवल जहाँ आप अनुमति दें — तस्वीरें साझा करने और स्कूल जीवन का उत्सव मनाने के लिए।',
    },
  },
  {
    key: 'who',
    title: { en: 'Who can see it', hi: 'इसे कौन देख सकता है' },
    body: {
      en: 'Teachers and office staff who need it for their role, and vendors we have signed data-protection contracts with. We never sell data or use it for third-party advertising.',
      hi: 'शिक्षक और कार्यालय कर्मचारी जिन्हें अपनी भूमिका के लिए इसकी आवश्यकता है, और वे विक्रेता जिनके साथ हमने डेटा-सुरक्षा अनुबंध किए हैं। हम कभी डेटा नहीं बेचते या तीसरे पक्ष के विज्ञापन के लिए उपयोग नहीं करते।',
    },
  },
  {
    key: 'choices',
    title: { en: 'Your choices for photos & videos', hi: 'तस्वीरों और वीडियो के लिए आपकी पसंद' },
    body: {
      en: 'Purpose by purpose, you decide whether photos of your child go into the private class gallery, school noticeboards, the website and social media, printed materials, or paid ads. Paid ads stay off unless you turn them on.',
      hi: 'उद्देश्य दर उद्देश्य, आप तय करते हैं कि आपके बच्चे की तस्वीरें निजी कक्षा गैलरी, स्कूल नोटिसबोर्ड, वेबसाइट और सोशल मीडिया, मुद्रित सामग्री, या सशुल्क विज्ञापनों में जाएं। जब तक आप चालू न करें, सशुल्क विज्ञापन बंद रहते हैं।',
    },
  },
  {
    key: 'rights',
    title: { en: 'Your rights', hi: 'आपके अधिकार' },
    body: {
      en: 'See a summary of what we hold, ask us to correct or delete it, withdraw a choice, nominate someone to act for you, or raise a complaint — any time, from this app or the school office.',
      hi: 'देखें कि हमारे पास क्या है, हमसे इसे सही करने या हटाने के लिए कहें, कोई पसंद वापस लें, अपनी ओर से कार्य करने के लिए किसी को नामांकित करें, या शिकायत दर्ज करें — इस ऐप से या स्कूल कार्यालय से, किसी भी समय।',
    },
  },
]
