export type Locale = "en" | "ar";
export type RouteIconKey =
  | "dashboard"
  | "create"
  | "calendar"
  | "queue"
  | "published"
  | "analytics"
  | "channels"
  | "pages"
  | "ai"
  | "media"
  | "settings";

export const supportedLocales: Locale[] = ["en", "ar"];

export type ShellRoute = {
  to: string;
  href: string;
  label: string;
  keywords: string;
  iconKey: RouteIconKey;
  end?: boolean;
};

export type GuideStep = {
  id: "dashboard" | "channels" | "create" | "queue" | "analytics";
  title: string;
  body: string;
  href: string;
};

const dictionaries = {
  en: {
    dir: "ltr",
    languageName: "English",
    switchLanguage: "Switch to Arabic",
    workspaceName: "Creator OS",
    workspaceStatus: "Silent Mode - Live",
    primaryNavigation: "Primary",
    primaryMobileNavigation: "Primary mobile",
    liveStackTitle: "Live stack active",
    liveStackBody: "Publishing, storage, scheduler and AI fallback connected.",
    logout: "Logout",
    newBadge: "New",
    topbar: {
      searchPlaceholder: "Search posts, channels, drafts...",
      noRoute: "No matching workspace route.",
      createPost: "Create post",
      notifications: "Notifications",
      activity: "Activity",
      creatorAi: "Creator AI",
      assistant: "Assistant",
      notificationsList: [
        "Scheduler is watching due posts.",
        "AI fallback is available.",
        "Media storage is connected.",
      ],
    },
    guide: {
      label: "Getting started guide",
      eyebrow: "Start here",
      progress: "Step",
      close: "Dismiss guide",
      reopen: "Open guide",
      previous: "Back",
      next: "Next",
      finish: "Finish",
      openStep: "Open this step",
      complete: "You are ready to run the workspace.",
    },
    routes: {
      dashboard: { label: "Dashboard", keywords: "home overview growth" },
      create: { label: "Create", keywords: "compose publish schedule draft post" },
      calendar: { label: "Calendar", keywords: "plan scheduled posts month week list" },
      queue: { label: "Queue", keywords: "drafts scheduled failed pending" },
      published: { label: "Published", keywords: "sent live history" },
      analytics: { label: "Analytics", keywords: "metrics reach engagement reports" },
      channels: { label: "Channels", keywords: "connect meta instagram facebook linkedin" },
      pages: { label: "Pages", keywords: "facebook pages instagram linked assets" },
      ai: { label: "AI Assistant", keywords: "rewrite caption assistant ideas" },
      media: { label: "Media Library", keywords: "upload assets images videos" },
      settings: { label: "Settings", keywords: "billing team workspace integrations" },
    },
    mobile: {
      home: "Home",
      stats: "Stats",
    },
    guideSteps: [
      {
        id: "dashboard",
        title: "Read the workspace health",
        body: "Start at the dashboard to see publishing status, scheduled work, recent posts, and growth signals.",
        href: "/dashboard",
      },
      {
        id: "channels",
        title: "Connect the right channels",
        body: "Open Channels to connect Facebook, Instagram, LinkedIn, and see which accounts need action.",
        href: "/channels",
      },
      {
        id: "create",
        title: "Create or schedule a post",
        body: "Use Create to write once, attach media, choose destinations, save drafts, schedule, or publish safely.",
        href: "/create",
      },
      {
        id: "queue",
        title: "Watch the publishing queue",
        body: "Queue shows scheduled, failed, and retryable posts so you know exactly what will go live next.",
        href: "/queue",
      },
      {
        id: "analytics",
        title: "Learn what is working",
        body: "Analytics explains reach, engagement, top content, and the next best decisions for growth.",
        href: "/analytics",
      },
    ] satisfies GuideStep[],
  },
  ar: {
    dir: "rtl",
    languageName: "العربية",
    switchLanguage: "Switch to English",
    workspaceName: "نظام المبدع",
    workspaceStatus: "الوضع الهادئ - مباشر",
    primaryNavigation: "التنقل الرئيسي",
    primaryMobileNavigation: "تنقل الموبايل الرئيسي",
    liveStackTitle: "النظام شغال",
    liveStackBody: "النشر، التخزين، الجدولة، وبديل الذكاء الاصطناعي متصلين.",
    logout: "تسجيل الخروج",
    newBadge: "جديد",
    topbar: {
      searchPlaceholder: "ابحث عن بوستات، قنوات، مسودات...",
      noRoute: "لا يوجد مسار مطابق داخل مساحة العمل.",
      createPost: "إنشاء بوست",
      notifications: "الإشعارات",
      activity: "النشاط",
      creatorAi: "ذكاء المبدع",
      assistant: "مساعد",
      notificationsList: [
        "المجدول يراقب البوستات المستحقة.",
        "بديل الذكاء الاصطناعي متاح.",
        "تخزين الميديا متصل.",
      ],
    },
    guide: {
      label: "دليل البدء",
      eyebrow: "ابدأ من هنا",
      progress: "خطوة",
      close: "إغلاق الدليل",
      reopen: "فتح الدليل",
      previous: "السابق",
      next: "التالي",
      finish: "إنهاء",
      openStep: "افتح الخطوة",
      complete: "جاهز تبدأ تدير مساحة العمل.",
    },
    routes: {
      dashboard: { label: "لوحة التحكم", keywords: "الرئيسية النظرة العامة النمو داشبورد" },
      create: { label: "إنشاء", keywords: "كتابة نشر جدولة مسودة بوست" },
      calendar: { label: "التقويم", keywords: "خطة بوستات مجدولة شهر اسبوع قائمة" },
      queue: { label: "الطابور", keywords: "مسودات مجدول فشل انتظار" },
      published: { label: "المنشور", keywords: "اتنشر مباشر سجل" },
      analytics: { label: "التحليلات", keywords: "أرقام وصول تفاعل تقارير" },
      channels: { label: "القنوات", keywords: "ربط ميتا انستجرام فيسبوك لينكدان" },
      pages: { label: "الصفحات", keywords: "صفحات فيسبوك انستجرام أصول مربوطة" },
      ai: { label: "مساعد AI", keywords: "إعادة كتابة كابشن أفكار مساعد" },
      media: { label: "مكتبة الميديا", keywords: "رفع صور فيديوهات ملفات" },
      settings: { label: "الإعدادات", keywords: "دفع فريق مساحة عمل تكاملات" },
    },
    mobile: {
      home: "الرئيسية",
      stats: "الأرقام",
    },
    guideSteps: [
      {
        id: "dashboard",
        title: "افهم حالة مساحة العمل",
        body: "ابدأ من لوحة التحكم عشان تشوف حالة النشر، البوستات المجدولة، آخر المنشورات، وإشارات النمو.",
        href: "/dashboard",
      },
      {
        id: "channels",
        title: "اربط القنوات الصح",
        body: "افتح القنوات لربط فيسبوك، انستجرام، لينكدان، ومعرفة أي حساب محتاج إجراء.",
        href: "/channels",
      },
      {
        id: "create",
        title: "اكتب أو جدولی بوست",
        body: "استخدم إنشاء عشان تكتب مرة واحدة، ترفع ميديا، تختار الحسابات، تحفظ مسودة، تجدول، أو تنشر بأمان.",
        href: "/create",
      },
      {
        id: "queue",
        title: "راجع طابور النشر",
        body: "الطابور يوضح البوستات المجدولة والفاشلة والقابلة لإعادة المحاولة، فتفضل عارف إيه اللي هيتنشر.",
        href: "/queue",
      },
      {
        id: "analytics",
        title: "اتعلم من الأداء",
        body: "التحليلات توضح الوصول، التفاعل، أفضل محتوى، والقرارات الجاية للنمو.",
        href: "/analytics",
      },
    ] satisfies GuideStep[],
  },
} as const;

export function normalizeLocale(locale: string | null | undefined): Locale {
  return supportedLocales.includes(locale as Locale) ? (locale as Locale) : "en";
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export function isRtlLocale(locale: Locale) {
  return getDictionary(locale).dir === "rtl";
}

export function getShellRoutes(locale: Locale): ShellRoute[] {
  const routes = getDictionary(locale).routes;

  return [
    { to: "/dashboard", href: "/dashboard", label: routes.dashboard.label, keywords: routes.dashboard.keywords, iconKey: "dashboard", end: true },
    { to: "/create", href: "/create", label: routes.create.label, keywords: routes.create.keywords, iconKey: "create" },
    { to: "/calendar", href: "/calendar", label: routes.calendar.label, keywords: routes.calendar.keywords, iconKey: "calendar" },
    { to: "/queue", href: "/queue", label: routes.queue.label, keywords: routes.queue.keywords, iconKey: "queue" },
    { to: "/published", href: "/published", label: routes.published.label, keywords: routes.published.keywords, iconKey: "published" },
    { to: "/analytics", href: "/analytics", label: routes.analytics.label, keywords: routes.analytics.keywords, iconKey: "analytics" },
    { to: "/channels", href: "/channels", label: routes.channels.label, keywords: routes.channels.keywords, iconKey: "channels" },
    { to: "/pages", href: "/pages", label: routes.pages.label, keywords: routes.pages.keywords, iconKey: "pages" },
    { to: "/ai-agent", href: "/ai-agent", label: routes.ai.label, keywords: routes.ai.keywords, iconKey: "ai" },
    { to: "/media", href: "/media", label: routes.media.label, keywords: routes.media.keywords, iconKey: "media" },
    { to: "/settings", href: "/settings", label: routes.settings.label, keywords: routes.settings.keywords, iconKey: "settings" },
  ];
}

export function getDockRoutes(locale: Locale): ShellRoute[] {
  const routes = getDictionary(locale).routes;

  return [
    { to: "/create", href: "/create", label: routes.create.label, keywords: routes.create.keywords, iconKey: "create" },
    { to: "/calendar", href: "/calendar", label: routes.calendar.label, keywords: routes.calendar.keywords, iconKey: "calendar" },
    { to: "/analytics", href: "/analytics", label: routes.analytics.label, keywords: routes.analytics.keywords, iconKey: "analytics" },
    { to: "/pages", href: "/pages", label: routes.pages.label, keywords: routes.pages.keywords, iconKey: "pages" },
    { to: "/ai-agent", href: "/ai-agent", label: routes.ai.label, keywords: routes.ai.keywords, iconKey: "ai" },
    { to: "/media", href: "/media", label: routes.media.label, keywords: routes.media.keywords, iconKey: "media" },
    { to: "/settings", href: "/settings", label: routes.settings.label, keywords: routes.settings.keywords, iconKey: "settings" },
  ];
}

export function getMobileRoutes(locale: Locale): ShellRoute[] {
  const dictionary = getDictionary(locale);
  const routes = dictionary.routes;

  return [
    { to: "/dashboard", href: "/dashboard", label: dictionary.mobile.home, keywords: routes.dashboard.keywords, iconKey: "dashboard", end: true },
    { to: "/calendar", href: "/calendar", label: routes.calendar.label, keywords: routes.calendar.keywords, iconKey: "calendar" },
    { to: "/create", href: "/create", label: routes.create.label, keywords: routes.create.keywords, iconKey: "create" },
    { to: "/analytics", href: "/analytics", label: dictionary.mobile.stats, keywords: routes.analytics.keywords, iconKey: "analytics" },
    { to: "/pages", href: "/pages", label: routes.pages.label, keywords: routes.pages.keywords, iconKey: "pages" },
  ];
}

export function getGuideSteps(locale: Locale): GuideStep[] {
  return [...getDictionary(locale).guideSteps];
}

export function getGuideStepIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
