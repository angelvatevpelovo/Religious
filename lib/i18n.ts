export const locales = ["en", "bg"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "bg" ? "bg" : defaultLocale;
}

export const dictionaries = {
  en: {
    nav: {
      search: "Search",
      books: "Books",
      temples: "Temples",
      calendar: "Calendar",
      assistant: "AI Assistant",
      reminders: "Reminders",
      profile: "Profile",
      home: "Home",
      places: "Places",
      days: "Days",
      ai: "AI",
      remind: "Remind",
    },
    auth: {
      loginRegister: "Login / Register",
      favorites: "Favorites",
      logout: "Logout",
      accountEyebrow: "Account",
      accountTitle: "Login or create your RELIGIOUS account",
      accountDescription:
        "Save favorite verses, manage reminders and personalize your spiritual space.",
      welcomeBack: "Welcome back",
      continueMessage: "Use your email and password to continue.",
      email: "Email",
      password: "Password",
      login: "Login",
      register: "Register",
      loading: "Loading...",
      registrationSuccess:
        "Registration successful. Please check your email to confirm your account.",
      loginSuccess: "Login successful.",
    },
    language: {
      label: "Language",
      english: "English",
      bulgarian: "Bulgarian",
    },
    home: {
      heroEyebrow: "Sacred Modern",
      heroTitle: "A calm companion for spiritual life",
      heroDescription:
        "Explore sacred texts, prayers, temples, holy days and personal reminders in one respectful space designed for quiet focus.",
      searchScripture: "Search Scripture",
      askAssistant: "Ask AI Assistant",
      today: "Today",
      stillness: "Find stillness, wisdom and sacred places.",
      read: "Read",
      explore: "Explore",
      observe: "Observe",
      return: "Return",
      dailyEyebrow: "Daily Spiritual Feed",
      dailyTitle: "Today in RELIGIOUS",
      dailyDescription:
        "A fresh prayer, verse, sacred day and sacred place drawn from your existing library.",
      prayerOfDay: "Prayer of the Day",
      verseOfDay: "Verse of the Day",
      eventOfDay: "Religious Event of the Day",
      placeOfDay: "Sacred Place of the Day",
      noPrayer: "No prayer available",
      noPrayerDescription:
        "Add prayers to Supabase and one will appear here each day.",
      noVerse: "No verse available",
      noVerseDescription:
        "Import verses into Supabase and one will appear here each day.",
      noEvent: "No event available",
      noEventDescription:
        "Seed religious events and one will appear here each day.",
      noPlace: "No sacred place available",
      noPlaceDescription:
        "Add temples to Supabase and one will appear here each day.",
      dateNotSet: "Date not set",
      global: "Global",
      regional: "Regional",
      sacredPlace: "Sacred place",
      libraryEyebrow: "Library",
      libraryTitle: "Holy Books",
      libraryDescription:
        "Read chapters and verses from the sacred texts available in the app.",
      noBooks: "No holy books yet",
      sacredText: "Sacred Text",
      traditionsEyebrow: "Traditions",
      traditionsTitle: "Religions",
      traditionsDescription:
        "Move between traditions with a respectful, simple overview.",
      noReligions: "No religions yet",
    },
  },
  bg: {
    nav: {
      search: "Търсене",
      books: "Книги",
      temples: "Храмове",
      calendar: "Календар",
      assistant: "AI Асистент",
      reminders: "Напомняния",
      profile: "Профил",
      home: "Начало",
      places: "Места",
      days: "Дни",
      ai: "AI",
      remind: "Напомни",
    },
    auth: {
      loginRegister: "Вход / Регистрация",
      favorites: "Любими",
      logout: "Изход",
      accountEyebrow: "Акаунт",
      accountTitle: "Влез или създай RELIGIOUS акаунт",
      accountDescription:
        "Запазвай любими стихове, управлявай напомняния и персонализирай духовното си пространство.",
      welcomeBack: "Добре дошъл отново",
      continueMessage: "Използвай имейл и парола, за да продължиш.",
      email: "Имейл",
      password: "Парола",
      login: "Вход",
      register: "Регистрация",
      loading: "Зареждане...",
      registrationSuccess:
        "Регистрацията е успешна. Провери имейла си за потвърждение.",
      loginSuccess: "Входът е успешен.",
    },
    language: {
      label: "Език",
      english: "Английски",
      bulgarian: "Български",
    },
    home: {
      heroEyebrow: "Sacred Modern",
      heroTitle: "Спокоен спътник за духовния живот",
      heroDescription:
        "Изследвай свещени текстове, молитви, храмове, празници и лични напомняния в едно уважително пространство за тих фокус.",
      searchScripture: "Търси в Писанието",
      askAssistant: "Попитай AI Асистента",
      today: "Днес",
      stillness: "Намери тишина, мъдрост и свещени места.",
      read: "Чети",
      explore: "Разгледай",
      observe: "Следи",
      return: "Върни се",
      dailyEyebrow: "Дневен духовен поток",
      dailyTitle: "Днес в RELIGIOUS",
      dailyDescription:
        "Свежа молитва, стих, свещен ден и свещено място от съществуващата библиотека.",
      prayerOfDay: "Молитва на деня",
      verseOfDay: "Стих на деня",
      eventOfDay: "Религиозно събитие на деня",
      placeOfDay: "Свещено място на деня",
      noPrayer: "Няма налична молитва",
      noPrayerDescription:
        "Добави молитви в Supabase и всеки ден тук ще се показва една.",
      noVerse: "Няма наличен стих",
      noVerseDescription:
        "Импортирай стихове в Supabase и всеки ден тук ще се показва един.",
      noEvent: "Няма налично събитие",
      noEventDescription:
        "Добави религиозни събития и всеки ден тук ще се показва едно.",
      noPlace: "Няма налично свещено място",
      noPlaceDescription:
        "Добави храмове в Supabase и всеки ден тук ще се показва един.",
      dateNotSet: "Няма дата",
      global: "Глобално",
      regional: "Регионално",
      sacredPlace: "Свещено място",
      libraryEyebrow: "Библиотека",
      libraryTitle: "Свещени книги",
      libraryDescription:
        "Чети глави и стихове от наличните свещени текстове в приложението.",
      noBooks: "Все още няма свещени книги",
      sacredText: "Свещен текст",
      traditionsEyebrow: "Традиции",
      traditionsTitle: "Религии",
      traditionsDescription:
        "Преминавай между традициите с уважителен и ясен преглед.",
      noReligions: "Все още няма религии",
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];
