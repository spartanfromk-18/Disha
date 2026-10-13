/* i18n.js — English + Hindi response templates. */
export const STRINGS = {
  'en-IN': {
    listening: 'Listening… speak now.',
    working: 'Working on it…',
    heard: 'Heard',
    says: 'Disha says',
    needLocation: 'I need your location for that. Please allow location access and try again.',
    servicesDown: "I couldn't reach the map service. Please try again.",
    placesDown: "The places service is down right now. Try saying 'take me to pharmacy' and I'll open it in Maps.",
    locExplain: 'I need your location — please allow it when your phone asks.',
    whereAmI: (a) => 'You are at ' + a + '.',
    noAddress: "I couldn't get the street address, but I have your coordinates.",
    remembered: (l) => l + ' saved. Say "take me ' + l + '" any time to go there.',
    noFavorite: (l) => 'I don\'t have ' + l + ' saved yet. Say "remember ' + l + '" while you are there.',
    openingNav: (d) => 'Opening walking navigation to ' + d + '.',
    placeNotFound: (p) => 'I couldn\'t find ' + p + '. Try being more specific.',
    nearNone: "I couldn't find any listed places nearby. Try asking for a pharmacy or hospital by name.",
    nearLead: 'Near you: ',
    spotSaved: 'Spot remembered. Say "take me back" when you want to return.',
    noSpot: 'No spot remembered yet. Say "remember this spot" first.',
    backChime: "Guiding you back. I'll beep faster as you get closer.",
    arrived: 'You have arrived.',
    shared: 'Opening WhatsApp to share your trip.',
    shareText: 'Track my trip, I am here:',
    helpNoContact: 'No emergency contact saved. Say "my emergency number is" followed by the number.',
    emergencySaved: 'Emergency contact saved.',
    helpLead: 'Help message ready. ',
    langName: 'English',
    notUnderstood: 'I didn\'t catch that. Try "where am I", "take me home", or "what\'s near me".',
    stopped: 'Stopped.',
    noSR: "Voice input isn't supported in this browser — the buttons below do everything by tap."
  },
  'hi-IN': {
    listening: 'सुन रही हूँ… बोलिए।',
    working: 'काम हो रहा है…',
    heard: 'सुना',
    says: 'दिशा कहती है',
    needLocation: 'इसके लिए मुझे आपकी लोकेशन चाहिए। लोकेशन की अनुमति दें और फिर कोशिश करें।',
    servicesDown: 'मैप सेवा से संपर्क नहीं हो पाया। कृपया फिर कोशिश करें।',
    placesDown: 'आसपास की सेवा अभी उपलब्ध नहीं है। "फार्मेसी ले चलो" कहें, मैं मैप्स में खोल दूँगी।',
    locExplain: 'मुझे आपकी लोकेशन चाहिए — फ़ोन पूछे तो अनुमति दें।',
    whereAmI: (a) => 'आप यहाँ हैं: ' + a + '।',
    noAddress: 'गली का पता नहीं मिल पाया, लेकिन आपके निर्देशांक मिल गए हैं।',
    remembered: (l) => l + ' सहेज लिया। कभी भी "' + l + ' ले चलो" कहें।',
    noFavorite: (l) => l + ' अभी सहेजा नहीं है। वहाँ जाकर "' + l + ' याद रखो" कहें।',
    openingNav: (d) => d + ' के लिए पैदल नेविगेशन खोल रही हूँ।',
    placeNotFound: (p) => p + ' नहीं मिला। थोड़ा विस्तार से बताएँ।',
    nearNone: 'आसपास कोई दर्ज जगह नहीं मिली। किसी फार्मेसी या अस्पताल का नाम लेकर पूछें।',
    nearLead: 'आपके पास: ',
    spotSaved: 'जगह याद रख ली। वापस आने के लिए "वापस ले चलो" कहें।',
    noSpot: 'अभी कोई जगह याद नहीं है। पहले "यह जगह याद रखो" कहें।',
    backChime: 'वापस ले चल रही हूँ। नज़दीक आते ही बीप तेज़ होगी।',
    arrived: 'आप पहुँच गए हैं।',
    shared: 'आपकी यात्रा साझा करने के लिए व्हाट्सऐप खोल रही हूँ।',
    shareText: 'मेरी यात्रा ट्रैक करें, मैं यहाँ हूँ:',
    helpNoContact: 'आपातकालीन संपर्क सहेजा नहीं है। "मेरा आपातकालीन नंबर है" के बाद नंबर बोलें।',
    emergencySaved: 'आपातकालीन संपर्क सहेज लिया।',
    helpLead: 'मदद का संदेश तैयार है। ',
    langName: 'हिंदी',
    notUnderstood: '"मैं कहाँ हूँ", "घर ले चलो", या "आसपास क्या है" कहकर देखें।',
    stopped: 'रुक गई।',
    noSR: 'इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है — नीचे दिए बटन टैप से सब कुछ होता है।'
  }
};

/** tr(lang, key, arg?) — templates may be strings or (arg) => string. */
export function tr(lang, key, arg) {
  const table = STRINGS[lang] || STRINGS['en-IN'];
  const v = table[key];
  return typeof v === 'function' ? v(arg) : v;
}
