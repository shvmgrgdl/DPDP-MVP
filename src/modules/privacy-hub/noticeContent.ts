/** Side-by-side English/Hindi preview content for the live and draft notices, plus the draft's changelog. */

export interface NoticeSection { key: string; title: { en: string; hi: string }; body: { en: string; hi: string } }

export const NOTICE_SUMMARY: { en: string; hi: string }[] = [
  { en: 'We use your child’s name, class and your contact details to run the school.', hi: 'हम आपके बच्चे का नाम, कक्षा और आपका संपर्क विवरण स्कूल चलाने के लिए उपयोग करते हैं।' },
  { en: 'Photos and videos are shared only the way you choose — private, inside school, or public.', hi: 'तस्वीरें और वीडियो केवल आपकी पसंद के अनुसार साझा होते हैं — निजी, स्कूल के भीतर, या सार्वजनिक।' },
  { en: 'You can change any choice, any time, in the parent app.', hi: 'आप कोई भी पसंद पेरेंट ऐप में कभी भी बदल सकते हैं।' },
  { en: 'CCTV, attendance and bus tracking are covered as child-safety exemptions — no separate consent form.', hi: 'सीसीटीवी, उपस्थिति और बस ट्रैकिंग बाल-सुरक्षा छूट के अंतर्गत आते हैं — अलग सहमति फ़ॉर्म की आवश्यकता नहीं।' },
  { en: 'Questions go to our named privacy contact and get answered in days, not months.', hi: 'प्रश्न हमारे नामित प्राइवेसी संपर्क के पास जाते हैं और महीनों में नहीं, दिनों में उत्तर मिलता है।' },
]

export const NOTICE_SECTIONS: NoticeSection[] = [
  {
    key: 'collect',
    title: { en: 'What we collect', hi: 'हम क्या एकत्र करते हैं' },
    body: {
      en: 'Name, date of birth, class, admission number, guardian contact details, attendance, marks, any health notes shared with us, live bus location during travel, and photos or videos from school events.',
      hi: 'नाम, जन्म तिथि, कक्षा, प्रवेश संख्या, अभिभावक संपर्क विवरण, उपस्थिति, अंक, साझा किए गए स्वास्थ्य नोट्स, यात्रा के दौरान बस की लाइव लोकेशन, और स्कूल कार्यक्रमों की तस्वीरें या वीडियो।',
    },
  },
  {
    key: 'cctv',
    title: { en: 'Campus cameras', hi: 'परिसर के कैमरे' },
    body: {
      en: 'CCTV footage from corridors, gates and buses is kept for 30 days and then deleted automatically, unless it is needed for an incident under review.',
      hi: 'गलियारों, गेटों और बसों की सीसीटीवी फुटेज 30 दिनों तक रखी जाती है और फिर स्वतः हटा दी जाती है, जब तक किसी घटना की समीक्षा के लिए आवश्यक न हो।',
    },
  },
  {
    key: 'photographers',
    title: { en: 'Event photographers', hi: 'कार्यक्रम फ़ोटोग्राफ़र' },
    body: {
      en: 'Photographers upload through a time-bound link for that event only, cannot download or keep copies on personal devices, and never see student names.',
      hi: 'फ़ोटोग्राफ़र केवल उस कार्यक्रम के लिए एक समय-सीमित लिंक के माध्यम से अपलोड करते हैं, व्यक्तिगत डिवाइस पर डाउनलोड या प्रतियां नहीं रख सकते, और कभी भी छात्र के नाम नहीं देखते।',
    },
  },
  {
    key: 'rights',
    title: { en: 'Your rights', hi: 'आपके अधिकार' },
    body: {
      en: 'See a summary of what we hold, ask us to correct or delete it, withdraw a choice, nominate someone to act for you, or raise a complaint — any time, from the app, the Privacy Centre or the school office.',
      hi: 'देखें कि हमारे पास क्या है, हमसे इसे सही करने या हटाने के लिए कहें, कोई पसंद वापस लें, अपनी ओर से कार्य करने के लिए किसी को नामांकित करें, या शिकायत दर्ज करें — ऐप, प्राइवेसी सेंटर या स्कूल कार्यालय से, किसी भी समय।',
    },
  },
]

export type ChangeKind = 'added' | 'clarified'
export const V22_CHANGES: { kind: ChangeKind; en: string; hi: string }[] = [
  { kind: 'added', en: 'New purpose disclosed: live bus location during travel, via the SafeRide app.', hi: 'नया उद्देश्य जोड़ा गया: SafeRide ऐप के माध्यम से यात्रा के दौरान बस की लाइव लोकेशन।' },
  { kind: 'clarified', en: 'CCTV footage retention made explicit: 30 days, unless under incident review.', hi: 'सीसीटीवी फुटेज प्रतिधारण स्पष्ट किया गया: 30 दिन, जब तक घटना समीक्षा के अंतर्गत न हो।' },
  { kind: 'clarified', en: 'Photographer access rules spelled out: time-bound links, no personal devices, no downloads.', hi: 'फ़ोटोग्राफ़र एक्सेस नियम स्पष्ट किए गए: समय-सीमित लिंक, कोई व्यक्तिगत डिवाइस नहीं, कोई डाउनलोड नहीं।' },
]
