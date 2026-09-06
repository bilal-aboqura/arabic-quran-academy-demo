import type { PageSectionType, Prisma } from "@prisma/client";
import { globalArabicTemplate, arabicDemoPreset } from './global-arabic';

export const WEBSITE_TEMPLATE_CODES = [
  "personal-teacher", "modern-academy", "premium-dark", "clean-education", "course-funnel", "bold-youth", "math-classroom", "global-arabic-quran",
] as const;
export type WebsiteTemplateCode = (typeof WEBSITE_TEMPLATE_CODES)[number];

export type TemplateSectionDefinition = {
  type: PageSectionType;
  variant: string;
  config: Prisma.JsonObject;
};

export type SystemWebsiteTemplate = {
  code: WebsiteTemplateCode;
  name: string;
  nameAr: string;
  description: string;
  category: string;
  version: number;
  defaultTheme: Prisma.JsonObject;
  sections: TemplateSectionDefinition[];
  supportedFeatures: string[];
};

export const SYSTEM_WEBSITE_TEMPLATES: readonly SystemWebsiteTemplate[] = [
  {
    "supportedFeatures": [
      "rtl",
      "ltr",
      "seo",
      "courses",
      "teachers",
      "testimonials",
      "contact",
      "brandColors"
    ],
    "version": 1,
    "code": "personal-teacher",
    "name": "Personal Teacher",
    "nameAr": "مدرسك",
    "category": "Individual teacher",
    "description": "قالب لمدرس، بيعرّف الطلاب بأسلوب الشرح وبيسهّل اختيار الكورس والصف الدراسي.",
    "defaultTheme": {
      "mode": "light",
      "font": "Cairo",
      "composition": "portrait-led",
      "radius": "soft",
      "accent": "#f59e0b"
    },
    "sections": [
      {
        "type": "HERO",
        "variant": "portrait",
        "config": {
          "title": "نفهم الكيمياء سوا، خطوة بخطوة",
          "body": "من أول فكرة لحد حل السؤال، هنرتب المنهج ونربط كل درس باللي قبله. اختار صفك وابدأ معايا."
        }
      },
      {
        "type": "SOCIAL_PROOF",
        "variant": "authority",
        "config": {
          "title": "مع بعض، خطوة بخطوة",
          "body": "ابدأ بالمحتوى المناسب ليك وكمل مذاكرتك من حسابك."
        }
      },
      {
        "type": "COURSES",
        "variant": "featured",
        "config": {
          "title": "اختار الكورس اللي يناسبك",
          "body": "شوف محتوى الكورس والصف الدراسي والسعر، وحدد هتبدأ بإيه."
        }
      },
      {
        "type": "FEATURES",
        "variant": "personal",
        "config": {
          "title": "هنذاكر إزاي مع بعض؟",
          "body": "شرح نفهمه، وتدريب نطبقه، ومراجعة نرتب بيها أفكارنا.",
          "items": [
            {
              "title": "نفهم الفكرة الأول",
              "body": "نبسط كل جزء بأمثلة، ونربطه باللي اتعلمناه قبل كده."
            },
            {
              "title": "نجرب ونحل",
              "body": "نطبق على أسئلة بأفكار مختلفة، ونفهم ليه اخترنا كل خطوة."
            },
            {
              "title": "نراجع اللي اتعلمناه",
              "body": "نرجع للنقط المهمة، ونعرف إيه اللي لسه محتاج تدريب."
            }
          ]
        }
      },
      {
        "type": "RESULTS",
        "variant": "stories",
        "config": {
          "title": "طلاب وكورسات على المنصة",
          "body": "كل خطوة في المذاكرة بتفرق."
        }
      },
      {
        "type": "TESTIMONIALS",
        "variant": "quotes",
        "config": {
          "title": "الطلاب بيقولوا إيه؟",
          "body": "شوف تجارب الطلاب مع الشرح والمذاكرة."
        }
      },
      {
        "type": "FAQ",
        "variant": "accordion",
        "config": {
          "title": "في حاجة حابب تعرفها؟",
          "body": "دي إجابات تساعدك قبل ما تبدأ.",
          "items": [
            {
              "title": "أختار الكورس المناسب إزاي؟",
              "body": "اختار صفك الدراسي، وبعدها افتح تفاصيل الكورس وشوف المحتوى والمستوى المطلوب. لو محتار، تواصل مع المدرس قبل الاشتراك."
            },
            {
              "title": "ألاقي كورساتي فين؟",
              "body": "سجل دخولك بنفس الحساب اللي اشتركت بيه، وافتح لوحة الطالب عشان توصل للكورسات بتاعتك."
            },
            {
              "title": "أعرف مواعيد الدروس ونظام الاشتراك منين؟",
              "body": "راجع التفاصيل في صفحة الكورس. ولو معلومة مش واضحة، اسأل المدرس عن المواعيد ومدة الوصول للمحتوى قبل الدفع."
            }
          ]
        }
      },
      {
        "type": "CTA",
        "variant": "personal",
        "config": {
          "title": "جاهز تبدأ معايا؟",
          "body": "اختار الكورس المناسب ليك. ولو محتار، تواصل معايا ونشوف تبدأ منين."
        }
      }
    ]
  },
  {
    "supportedFeatures": [
      "rtl",
      "ltr",
      "seo",
      "courses",
      "teachers",
      "testimonials",
      "contact",
      "brandColors"
    ],
    "version": 1,
    "code": "modern-academy",
    "name": "Modern Academy",
    "nameAr": "مدرسين مع بعض",
    "category": "Multi-teacher academy",
    "description": "قالب لمجموعة مدرسين، بيجمع المواد والكورسات في مكان واضح وسهل.",
    "defaultTheme": {
      "mode": "light",
      "font": "Tajawal",
      "composition": "catalog",
      "radius": "structured",
      "accent": "#38bdf8"
    },
    "sections": [
      {
        "type": "HERO",
        "variant": "academy",
        "config": {
          "title": "مدرسينك وموادك، كلهم في مكان واحد",
          "body": "اختار صفك والمادة اللي محتاجها، واتعرف على المدرس ومحتوى الكورس قبل ما تبدأ معانا."
        }
      },
      {
        "type": "CATEGORIES",
        "variant": "rail",
        "config": {
          "title": "اختار المادة اللي محتاجها",
          "body": "اختار صفك عشان توصل للكورسات المناسبة ليك."
        }
      },
      {
        "type": "COURSES",
        "variant": "catalog",
        "config": {
          "title": "اختار الكورس اللي يناسبك",
          "body": "شوف محتوى الكورس والصف الدراسي والسعر، وحدد هتبدأ بإيه."
        }
      },
      {
        "type": "TEACHERS",
        "variant": "roster",
        "config": {
          "title": "اتعرف على مدرسينك",
          "body": "شوف مدرس كل مادة والكورسات اللي بيشرحها، واختار اللي يناسبك."
        }
      },
      {
        "type": "STATS",
        "variant": "band",
        "config": {
          "title": "بنتعلم ونتقدم مع بعض",
          "body": "مدرسين وطلاب بيجمعهم مكان واحد للتعلم."
        }
      },
      {
        "type": "FEATURES",
        "variant": "academy",
        "config": {
          "title": "هنذاكر إزاي مع بعض؟",
          "body": "شرح نفهمه، وتدريب نطبقه، ومراجعة نرتب بيها أفكارنا.",
          "items": [
            {
              "title": "نفهم الفكرة الأول",
              "body": "نبسط كل جزء بأمثلة، ونربطه باللي اتعلمناه قبل كده."
            },
            {
              "title": "نجرب ونحل",
              "body": "نطبق على أسئلة بأفكار مختلفة، ونفهم ليه اخترنا كل خطوة."
            },
            {
              "title": "نراجع اللي اتعلمناه",
              "body": "نرجع للنقط المهمة، ونعرف إيه اللي لسه محتاج تدريب."
            }
          ]
        }
      },
      {
        "type": "TESTIMONIALS",
        "variant": "spotlight",
        "config": {
          "title": "الطلاب بيقولوا إيه؟",
          "body": "شوف تجارب الطلاب مع الشرح والمذاكرة."
        }
      },
      {
        "type": "FAQ",
        "variant": "columns",
        "config": {
          "title": "في حاجة حابب تعرفها؟",
          "body": "دي إجابات تساعدك قبل ما تبدأ.",
          "items": [
            {
              "title": "أختار الكورس المناسب إزاي؟",
              "body": "اختار صفك الدراسي، وبعدها افتح تفاصيل الكورس وشوف المحتوى والمستوى المطلوب. لو محتار، تواصل مع المدرس قبل الاشتراك."
            },
            {
              "title": "ألاقي كورساتي فين؟",
              "body": "سجل دخولك بنفس الحساب اللي اشتركت بيه، وافتح لوحة الطالب عشان توصل للكورسات بتاعتك."
            },
            {
              "title": "أعرف مواعيد الدروس ونظام الاشتراك منين؟",
              "body": "راجع التفاصيل في صفحة الكورس. ولو معلومة مش واضحة، اسأل المدرس عن المواعيد ومدة الوصول للمحتوى قبل الدفع."
            }
          ]
        }
      },
      {
        "type": "CTA",
        "variant": "academy",
        "config": {
          "title": "جاهز تبدأ معانا؟",
          "body": "شوف المواد والكورسات، واختار أول خطوة في مذاكرتك."
        }
      }
    ]
  },
  {
    "supportedFeatures": [
      "rtl",
      "ltr",
      "seo",
      "courses",
      "teachers",
      "testimonials",
      "contact",
      "brandColors"
    ],
    "version": 1,
    "code": "premium-dark",
    "name": "Premium Dark",
    "nameAr": "معمل الفيزياء",
    "category": "Science & technical",
    "description": "قالب لمدرس، بيعرّف الطلاب بأسلوب الشرح وبيسهّل اختيار الكورس والصف الدراسي.",
    "defaultTheme": {
      "mode": "dark",
      "font": "Alexandria",
      "composition": "cinematic",
      "radius": "sharp",
      "accent": "#00f0ff"
    },
    "sections": [
      {
        "type": "HERO",
        "variant": "cinematic",
        "config": {
          "title": "الفيزياء مش حفظ قوانين. خلينا نفهمها.",
          "body": "هنفهم الفكرة، نرسم المسألة، ونحلها خطوة بخطوة. من الأساسيات لأسئلة محتاجة تفكير."
        }
      },
      {
        "type": "COURSES",
        "variant": "spotlight",
        "config": {
          "title": "اختار الكورس اللي يناسبك",
          "body": "شوف محتوى الكورس والصف الدراسي والسعر، وحدد هتبدأ بإيه."
        }
      },
      {
        "type": "ABOUT",
        "variant": "authority",
        "config": {
          "title": "نتعرف على بعض",
          "body": "أنا هنا عشان أساعدك تفهم المادة وتعرف تفكر في السؤال. هنبدأ بالأساسيات، وبعدها نطبق سوا على أفكار مختلفة."
        }
      },
      {
        "type": "RESULTS",
        "variant": "metrics",
        "config": {
          "title": "طلاب وكورسات على المنصة",
          "body": "كل خطوة في المذاكرة بتفرق."
        }
      },
      {
        "type": "FEATURES",
        "variant": "packages",
        "config": {
          "title": "هنذاكر إزاي مع بعض؟",
          "body": "شرح نفهمه، وتدريب نطبقه، ومراجعة نرتب بيها أفكارنا.",
          "items": [
            {
              "title": "نفهم الفكرة الأول",
              "body": "نبسط كل جزء بأمثلة، ونربطه باللي اتعلمناه قبل كده."
            },
            {
              "title": "نجرب ونحل",
              "body": "نطبق على أسئلة بأفكار مختلفة، ونفهم ليه اخترنا كل خطوة."
            },
            {
              "title": "نراجع اللي اتعلمناه",
              "body": "نرجع للنقط المهمة، ونعرف إيه اللي لسه محتاج تدريب."
            }
          ]
        }
      },
      {
        "type": "TESTIMONIALS",
        "variant": "dark",
        "config": {
          "title": "الطلاب بيقولوا إيه؟",
          "body": "شوف تجارب الطلاب مع الشرح والمذاكرة."
        }
      },
      {
        "type": "FAQ",
        "variant": "minimal",
        "config": {
          "title": "في حاجة حابب تعرفها؟",
          "body": "دي إجابات تساعدك قبل ما تبدأ.",
          "items": [
            {
              "title": "أختار الكورس المناسب إزاي؟",
              "body": "اختار صفك الدراسي، وبعدها افتح تفاصيل الكورس وشوف المحتوى والمستوى المطلوب. لو محتار، تواصل مع المدرس قبل الاشتراك."
            },
            {
              "title": "ألاقي كورساتي فين؟",
              "body": "سجل دخولك بنفس الحساب اللي اشتركت بيه، وافتح لوحة الطالب عشان توصل للكورسات بتاعتك."
            },
            {
              "title": "أعرف مواعيد الدروس ونظام الاشتراك منين؟",
              "body": "راجع التفاصيل في صفحة الكورس. ولو معلومة مش واضحة، اسأل المدرس عن المواعيد ومدة الوصول للمحتوى قبل الدفع."
            }
          ]
        }
      },
      {
        "type": "CTA",
        "variant": "cinematic",
        "config": {
          "title": "جاهز تبدأ معايا؟",
          "body": "اختار الكورس المناسب ليك. ولو محتار، تواصل معايا ونشوف تبدأ منين."
        }
      }
    ]
  },
  {
    "supportedFeatures": [
      "rtl",
      "ltr",
      "seo",
      "courses",
      "teachers",
      "testimonials",
      "contact",
      "brandColors"
    ],
    "version": 1,
    "code": "clean-education",
    "name": "Clean Education",
    "nameAr": "شرح ببساطة",
    "category": "Languages & broad education",
    "description": "قالب لمدرس، بيعرّف الطلاب بأسلوب الشرح وبيسهّل اختيار الكورس والصف الدراسي.",
    "defaultTheme": {
      "mode": "light",
      "font": "Noto Kufi Arabic",
      "composition": "calm",
      "radius": "minimal",
      "accent": "#0d9488"
    },
    "sections": [
      {
        "type": "HERO",
        "variant": "calm",
        "config": {
          "title": "الإنجليزي أبسط لما تبدأ صح",
          "body": "كلمات وقواعد وتدريب على القراءة والكتابة. هنمشي في المنهج واحدة واحدة، وكل درس نبني عليه اللي بعده."
        }
      },
      {
        "type": "CATEGORIES",
        "variant": "pills",
        "config": {
          "title": "إنت في أنهي صف؟",
          "body": "اختار صفك عشان توصل للكورسات المناسبة ليك."
        }
      },
      {
        "type": "COURSES",
        "variant": "clean",
        "config": {
          "title": "اختار الكورس اللي يناسبك",
          "body": "شوف محتوى الكورس والصف الدراسي والسعر، وحدد هتبدأ بإيه."
        }
      },
      {
        "type": "ABOUT",
        "variant": "editorial",
        "config": {
          "title": "نتعرف على بعض",
          "body": "أنا هنا عشان أساعدك تفهم المادة وتعرف تفكر في السؤال. هنبدأ بالأساسيات، وبعدها نطبق سوا على أفكار مختلفة."
        }
      },
      {
        "type": "FEATURES",
        "variant": "process",
        "config": {
          "title": "هنذاكر إزاي مع بعض؟",
          "body": "شرح نفهمه، وتدريب نطبقه، ومراجعة نرتب بيها أفكارنا.",
          "items": [
            {
              "title": "نفهم الفكرة الأول",
              "body": "نبسط كل جزء بأمثلة، ونربطه باللي اتعلمناه قبل كده."
            },
            {
              "title": "نجرب ونحل",
              "body": "نطبق على أسئلة بأفكار مختلفة، ونفهم ليه اخترنا كل خطوة."
            },
            {
              "title": "نراجع اللي اتعلمناه",
              "body": "نرجع للنقط المهمة، ونعرف إيه اللي لسه محتاج تدريب."
            }
          ]
        }
      },
      {
        "type": "TESTIMONIALS",
        "variant": "simple",
        "config": {
          "title": "الطلاب بيقولوا إيه؟",
          "body": "شوف تجارب الطلاب مع الشرح والمذاكرة."
        }
      },
      {
        "type": "FAQ",
        "variant": "accordion",
        "config": {
          "title": "في حاجة حابب تعرفها؟",
          "body": "دي إجابات تساعدك قبل ما تبدأ.",
          "items": [
            {
              "title": "أختار الكورس المناسب إزاي؟",
              "body": "اختار صفك الدراسي، وبعدها افتح تفاصيل الكورس وشوف المحتوى والمستوى المطلوب. لو محتار، تواصل مع المدرس قبل الاشتراك."
            },
            {
              "title": "ألاقي كورساتي فين؟",
              "body": "سجل دخولك بنفس الحساب اللي اشتركت بيه، وافتح لوحة الطالب عشان توصل للكورسات بتاعتك."
            },
            {
              "title": "أعرف مواعيد الدروس ونظام الاشتراك منين؟",
              "body": "راجع التفاصيل في صفحة الكورس. ولو معلومة مش واضحة، اسأل المدرس عن المواعيد ومدة الوصول للمحتوى قبل الدفع."
            }
          ]
        }
      },
      {
        "type": "CONTACT",
        "variant": "clean",
        "config": {
          "title": "محتاج تسأل عن حاجة؟",
          "body": "لو محتار في اختيار الكورس أو عندك سؤال عن الاشتراك، ابعتلنا."
        }
      }
    ]
  },
  {
    "supportedFeatures": [
      "rtl",
      "ltr",
      "seo",
      "courses",
      "teachers",
      "testimonials",
      "contact",
      "brandColors"
    ],
    "version": 1,
    "code": "course-funnel",
    "name": "Course Funnel",
    "nameAr": "كورس مع مدرسك",
    "category": "Single offer",
    "description": "قالب لمدرس، بيعرّف الطلاب بأسلوب الشرح وبيسهّل اختيار الكورس والصف الدراسي.",
    "defaultTheme": {
      "mode": "light",
      "font": "Cairo",
      "composition": "funnel",
      "radius": "compact",
      "accent": "#e11d48"
    },
    "sections": [
      {
        "type": "HERO",
        "variant": "conversion",
        "config": {
          "title": "رتب مراجعتك، وادخل الامتحان فاهم",
          "body": "راجع الأفكار الأساسية، اتدرب على أسئلة متنوعة، واعرف إيه اللي محتاج ترجعله. شوف تفاصيل الكورس وخطته قبل الاشتراك."
        }
      },
      {
        "type": "COURSES",
        "variant": "primary-offer",
        "config": {
          "title": "اختار الكورس اللي يناسبك",
          "body": "شوف محتوى الكورس والصف الدراسي والسعر، وحدد هتبدأ بإيه."
        }
      },
      {
        "type": "FEATURES",
        "variant": "benefits",
        "config": {
          "title": "هنذاكر إزاي مع بعض؟",
          "body": "شرح نفهمه، وتدريب نطبقه، ومراجعة نرتب بيها أفكارنا.",
          "items": [
            {
              "title": "نفهم الفكرة الأول",
              "body": "نبسط كل جزء بأمثلة، ونربطه باللي اتعلمناه قبل كده."
            },
            {
              "title": "نجرب ونحل",
              "body": "نطبق على أسئلة بأفكار مختلفة، ونفهم ليه اخترنا كل خطوة."
            },
            {
              "title": "نراجع اللي اتعلمناه",
              "body": "نرجع للنقط المهمة، ونعرف إيه اللي لسه محتاج تدريب."
            }
          ]
        }
      },
      {
        "type": "SOCIAL_PROOF",
        "variant": "deliverables",
        "config": {
          "title": "مع بعض، خطوة بخطوة",
          "body": "ابدأ بالمحتوى المناسب ليك وكمل مذاكرتك من حسابك."
        }
      },
      {
        "type": "ABOUT",
        "variant": "authority",
        "config": {
          "title": "نتعرف على بعض",
          "body": "أنا هنا عشان أساعدك تفهم المادة وتعرف تفكر في السؤال. هنبدأ بالأساسيات، وبعدها نطبق سوا على أفكار مختلفة."
        }
      },
      {
        "type": "RESULTS",
        "variant": "proof",
        "config": {
          "title": "طلاب وكورسات على المنصة",
          "body": "كل خطوة في المذاكرة بتفرق."
        }
      },
      {
        "type": "VIDEO",
        "variant": "curriculum",
        "config": {
          "title": "خد فكرة عن الكورس",
          "body": "شوف المحتوى وترتيب الدروس عشان تعرف هتتعلم إيه."
        }
      },
      {
        "type": "TESTIMONIALS",
        "variant": "funnel",
        "config": {
          "title": "الطلاب بيقولوا إيه؟",
          "body": "شوف تجارب الطلاب مع الشرح والمذاكرة."
        }
      },
      {
        "type": "CTA",
        "variant": "offer",
        "config": {
          "title": "جاهز تبدأ معايا؟",
          "body": "اختار الكورس المناسب ليك. ولو محتار، تواصل معايا ونشوف تبدأ منين."
        }
      },
      {
        "type": "FAQ",
        "variant": "accordion",
        "config": {
          "title": "في حاجة حابب تعرفها؟",
          "body": "دي إجابات تساعدك قبل ما تبدأ.",
          "items": [
            {
              "title": "أختار الكورس المناسب إزاي؟",
              "body": "اختار صفك الدراسي، وبعدها افتح تفاصيل الكورس وشوف المحتوى والمستوى المطلوب. لو محتار، تواصل مع المدرس قبل الاشتراك."
            },
            {
              "title": "ألاقي كورساتي فين؟",
              "body": "سجل دخولك بنفس الحساب اللي اشتركت بيه، وافتح لوحة الطالب عشان توصل للكورسات بتاعتك."
            },
            {
              "title": "أعرف مواعيد الدروس ونظام الاشتراك منين؟",
              "body": "راجع التفاصيل في صفحة الكورس. ولو معلومة مش واضحة، اسأل المدرس عن المواعيد ومدة الوصول للمحتوى قبل الدفع."
            }
          ]
        }
      },
      {
        "type": "CONTACT",
        "variant": "final",
        "config": {
          "title": "محتاج تسأل عن حاجة؟",
          "body": "لو محتار في اختيار الكورس أو عندك سؤال عن الاشتراك، ابعتلنا."
        }
      }
    ]
  },
  {
    "supportedFeatures": [
      "rtl",
      "ltr",
      "seo",
      "courses",
      "teachers",
      "testimonials",
      "contact",
      "brandColors"
    ],
    "version": 1,
    "code": "bold-youth",
    "name": "Bold Youth",
    "nameAr": "يلا نفهم",
    "category": "Gen-Z secondary",
    "description": "قالب لمدرس، بيعرّف الطلاب بأسلوب الشرح وبيسهّل اختيار الكورس والصف الدراسي.",
    "defaultTheme": {
      "mode": "light",
      "font": "Changa",
      "composition": "centered-academy",
      "radius": "soft",
      "accent": "#0f766e"
    },
    "sections": [
      {
        "type": "HERO",
        "variant": "dynamic",
        "config": {
          "title": "يلا نفهمها، ونحلها بإيدينا",
          "body": "مش محتاج تحفظ الحل. تعال نفهم الفكرة ونجرب عليها، ونمشي في المنهج بخطوات واضحة تناسب مستواك."
        }
      },
      {
        "type": "COURSES",
        "variant": "trending",
        "config": {
          "title": "اختار الكورس اللي يناسبك",
          "body": "شوف محتوى الكورس والصف الدراسي والسعر، وحدد هتبدأ بإيه."
        }
      },
      {
        "type": "CATEGORIES",
        "variant": "blocks",
        "config": {
          "title": "إنت في أنهي صف؟",
          "body": "اختار صفك عشان توصل للكورسات المناسبة ليك."
        }
      },
      {
        "type": "RESULTS",
        "variant": "bold",
        "config": {
          "title": "طلاب وكورسات على المنصة",
          "body": "كل خطوة في المذاكرة بتفرق."
        }
      },
      {
        "type": "ABOUT",
        "variant": "poster",
        "config": {
          "title": "نتعرف على بعض",
          "body": "أنا هنا عشان أساعدك تفهم المادة وتعرف تفكر في السؤال. هنبدأ بالأساسيات، وبعدها نطبق سوا على أفكار مختلفة."
        }
      },
      {
        "type": "TESTIMONIALS",
        "variant": "ticker",
        "config": {
          "title": "الطلاب بيقولوا إيه؟",
          "body": "شوف تجارب الطلاب مع الشرح والمذاكرة."
        }
      },
      {
        "type": "FAQ",
        "variant": "bold",
        "config": {
          "title": "في حاجة حابب تعرفها؟",
          "body": "دي إجابات تساعدك قبل ما تبدأ.",
          "items": [
            {
              "title": "أختار الكورس المناسب إزاي؟",
              "body": "اختار صفك الدراسي، وبعدها افتح تفاصيل الكورس وشوف المحتوى والمستوى المطلوب. لو محتار، تواصل مع المدرس قبل الاشتراك."
            },
            {
              "title": "ألاقي كورساتي فين؟",
              "body": "سجل دخولك بنفس الحساب اللي اشتركت بيه، وافتح لوحة الطالب عشان توصل للكورسات بتاعتك."
            },
            {
              "title": "أعرف مواعيد الدروس ونظام الاشتراك منين؟",
              "body": "راجع التفاصيل في صفحة الكورس. ولو معلومة مش واضحة، اسأل المدرس عن المواعيد ومدة الوصول للمحتوى قبل الدفع."
            }
          ]
        }
      },
      {
        "type": "CTA",
        "variant": "bold",
        "config": {
          "title": "جاهز تبدأ معايا؟",
          "body": "اختار الكورس المناسب ليك. ولو محتار، تواصل معايا ونشوف تبدأ منين."
        }
      }
    ]
  },
  {
    "supportedFeatures": [
      "rtl",
      "ltr",
      "seo",
      "courses",
      "teachers",
      "testimonials",
      "contact",
      "brandColors"
    ],
    "version": 1,
    "code": "math-classroom",
    "name": "Math Classroom",
    "nameAr": "افتكاسة الماث",
    "category": "Math & school stages",
    "description": "قالب لمدرس، بيعرّف الطلاب بأسلوب الشرح وبيسهّل اختيار الكورس والصف الدراسي.",
    "defaultTheme": {
      "mode": "light",
      "font": "Cairo",
      "composition": "math-portrait",
      "radius": "rounded",
      "primary": "#d8133a",
      "accent": "#d8133a"
    },
    "sections": [
      {
        "type": "HERO",
        "variant": "math-portrait",
        "config": {
          "title": "لكل مسألة فكرة. يلا نكتشفها سوا.",
          "body": "هنا بنبسط الماث، من أول قانون لحد آخر خطوة في الحل. اختار صفك وتعال نتدرب سوا."
        }
      },
      {
        "type": "FEATURES",
        "variant": "classroom-tools",
        "config": {
          "title": "هنذاكر إزاي مع بعض؟",
          "body": "شرح نفهمه، وتدريب نطبقه، ومراجعة نرتب بيها أفكارنا.",
          "items": [
            {
              "title": "نفهم الفكرة الأول",
              "body": "نبسط كل جزء بأمثلة، ونربطه باللي اتعلمناه قبل كده."
            },
            {
              "title": "نجرب ونحل",
              "body": "نطبق على أسئلة بأفكار مختلفة، ونفهم ليه اخترنا كل خطوة."
            },
            {
              "title": "نراجع اللي اتعلمناه",
              "body": "نرجع للنقط المهمة، ونعرف إيه اللي لسه محتاج تدريب."
            }
          ]
        }
      },
      {
        "type": "CATEGORIES",
        "variant": "illustrated-stages",
        "config": {
          "title": "إنت في أنهي صف؟",
          "body": "اختار صفك عشان توصل للكورسات المناسبة ليك."
        }
      },
      {
        "type": "COURSES",
        "variant": "classroom-catalog",
        "config": {
          "title": "اختار الكورس اللي يناسبك",
          "body": "شوف محتوى الكورس والصف الدراسي والسعر، وحدد هتبدأ بإيه."
        }
      },
      {
        "type": "TESTIMONIALS",
        "variant": "student-notes",
        "config": {
          "title": "الطلاب بيقولوا إيه؟",
          "body": "شوف تجارب الطلاب مع الشرح والمذاكرة."
        }
      },
      {
        "type": "FAQ",
        "variant": "classroom-questions",
        "config": {
          "title": "في حاجة حابب تعرفها؟",
          "body": "دي إجابات تساعدك قبل ما تبدأ.",
          "items": [
            {
              "title": "أختار الكورس المناسب إزاي؟",
              "body": "اختار صفك الدراسي، وبعدها افتح تفاصيل الكورس وشوف المحتوى والمستوى المطلوب. لو محتار، تواصل مع المدرس قبل الاشتراك."
            },
            {
              "title": "ألاقي كورساتي فين؟",
              "body": "سجل دخولك بنفس الحساب اللي اشتركت بيه، وافتح لوحة الطالب عشان توصل للكورسات بتاعتك."
            },
            {
              "title": "أعرف مواعيد الدروس ونظام الاشتراك منين؟",
              "body": "راجع التفاصيل في صفحة الكورس. ولو معلومة مش واضحة، اسأل المدرس عن المواعيد ومدة الوصول للمحتوى قبل الدفع."
            }
          ]
        }
      },
      {
        "type": "CTA",
        "variant": "classroom-enrollment",
        "config": {
          "title": "جاهز تبدأ معايا؟",
          "body": "اختار الكورس المناسب ليك. ولو محتار، تواصل معايا ونشوف تبدأ منين."
        }
      }
    ]
  },
  globalArabicTemplate,
];

export function getSystemTemplate(code: string) { return SYSTEM_WEBSITE_TEMPLATES.find(template => template.code === code) ?? null; }

export const TEMPLATE_DEMO_DATA = {
  "siteName": "منصة مدرسك",
  "teacherName": "مستر أحمد منصور",
  "about": "نفهم ونحل ونراجع سوا، خطوة بخطوة.",
  "primaryColor": "#2563eb",
  "secondaryColor": "#0f172a",
  "heroImageUrl": "/instructor.png"
};

export type TemplateDemoPreset = {
  siteName: string;
  platformNameEn: string;
  teacherName: string;
  teacherSubject: string;
  about: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  badge: string;
  heroImageUrl: string;
  courses: Array<{
    id: string;
    slug: string;
    title: string;
    titleAr: string;
    shortDesc: string;
    shortDescEn: string;
    price: number;
    category: { name: string; nameAr: string };
    badge?: string;
  }>;
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    nameAr: string;
    description: string | null;
    imageUrl: string | null;
    _count: { courses: number };
  }>;
  teachers: Array<{
    id: string;
    name: string;
    teacherSubject: string;
    teacherAvatarUrl: string;
    bio?: string;
  }>;
  testimonials: Array<{
    id: string;
    text: string;
    textEn: string | null;
    authorName: string;
    authorTitle: string;
    authorTitleEn: string | null;
    imageUrl: string | null;
    badge?: string;
  }>;
  stats: { courses: number; students: number; teachers: number; enrollments: number };
};

export const TEMPLATE_DEMO_PRESETS: Record<WebsiteTemplateCode, TemplateDemoPreset> = {
  'global-arabic-quran': arabicDemoPreset,
  "math-classroom": {
    "siteName": "منصة افتكاسة",
    "platformNameEn": "Eftekaasa Maths",
    "teacherName": "مستر أحمد",
    "teacherSubject": "الرياضيات للمرحلة الإعدادية والثانوية",
    "about": "هنا بنبسط الماث، من أول قانون لحد آخر خطوة في الحل. اختار صفك وتعال نتدرب سوا.",
    "primaryColor": "#d8133a",
    "secondaryColor": "#312530",
    "accentColor": "#d8133a",
    "badge": "شرح وتدريب ومراجعة",
    "heroImageUrl": "https://pub-408189476e4b42698a2bb8f228134d7d.r2.dev/courses/1784393403499-o5ap1u50.png",
    "courses": [
      {
        "id": "math-c1",
        "slug": "algebra-foundations",
        "title": "School subject foundations",
        "titleAr": "الرياضيات — نبدأ من الأساسيات",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 250,
        "category": {
          "name": "Preparatory Year 1",
          "nameAr": "أولى إعدادي"
        }
      },
      {
        "id": "math-c2",
        "slug": "geometry",
        "title": "Lessons and practice",
        "titleAr": "الرياضيات — شرح وتدريب",
        "shortDesc": "شرح لأفكار المنهج وتدريب يساعدك تعرف تستخدم اللي فهمته.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 300,
        "category": {
          "name": "Preparatory Year 2",
          "nameAr": "تانية إعدادي"
        }
      },
      {
        "id": "math-c3",
        "slug": "math-first-steps",
        "title": "Revision and questions",
        "titleAr": "الرياضيات — مراجعة وحل أسئلة",
        "shortDesc": "نرتب أهم الأفكار ونحل أسئلة متنوعة، ونراجع النقط اللي محتاجة تركيز.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 0,
        "category": {
          "name": "Preparatory Year 3",
          "nameAr": "تالتة إعدادي"
        }
      }
    ],
    "categories": [
      {
        "id": "category-0",
        "slug": "prep-1",
        "name": "Preparatory Year 1",
        "nameAr": "أولى إعدادي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": "https://pub-408189476e4b42698a2bb8f228134d7d.r2.dev/courses/1784119304338-rfnbeupe.png",
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-1",
        "slug": "prep-2",
        "name": "Preparatory Year 2",
        "nameAr": "تانية إعدادي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": "https://pub-408189476e4b42698a2bb8f228134d7d.r2.dev/courses/1784119308208-bz432csv.png",
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-2",
        "slug": "prep-3",
        "name": "Preparatory Year 3",
        "nameAr": "تالتة إعدادي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": "https://pub-408189476e4b42698a2bb8f228134d7d.r2.dev/courses/1784119311571-mg5cq1g5.png",
        "_count": {
          "courses": 1
        }
      }
    ],
    "teachers": [
      {
        "id": "teacher-demo",
        "name": "مستر أحمد",
        "teacherSubject": "الرياضيات للمرحلة الإعدادية والثانوية",
        "teacherAvatarUrl": "https://pub-408189476e4b42698a2bb8f228134d7d.r2.dev/courses/1784393403499-o5ap1u50.png",
        "bio": "هنا بنبسط الماث، من أول قانون لحد آخر خطوة في الحل. اختار صفك وتعال نتدرب سوا."
      }
    ],
    "testimonials": [
      {
        "id": "math-review-1",
        "text": "لما فهمت سبب كل خطوة، بقيت أعرف أبدأ حل السؤال بنفسي.",
        "textEn": null,
        "authorName": "ضحى أشرف",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      },
      {
        "id": "math-review-2",
        "text": "التدريب بعد الشرح ساعدني أعرف النقط اللي محتاج أراجعها.",
        "textEn": null,
        "authorName": "سيف محمد",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      }
    ],
    "stats": {
      "courses": 3,
      "teachers": 1,
      "students": 0,
      "enrollments": 0
    }
  },
  "personal-teacher": {
    "siteName": "منصة مستر طارق رضوان",
    "platformNameEn": "Mr Tarek Chemistry",
    "teacherName": "مستر طارق رضوان",
    "teacherSubject": "الكيمياء للمرحلة الإعدادية والثانوية",
    "about": "من أول فكرة لحد حل السؤال، هنرتب المنهج ونربط كل درس باللي قبله. اختار صفك وابدأ معايا.",
    "primaryColor": "#0f766e",
    "secondaryColor": "#134e4a",
    "accentColor": "#f59e0b",
    "badge": "شرح وتدريب ومراجعة",
    "heroImageUrl": "/instructor.png",
    "courses": [
      {
        "id": "c1",
        "slug": "chemistry-thanawya",
        "title": "School subject foundations",
        "titleAr": "الكيمياء — نبدأ من الأساسيات",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 420,
        "category": {
          "name": "Secondary Year 1",
          "nameAr": "أولى ثانوي"
        }
      },
      {
        "id": "c2",
        "slug": "organic-chemistry-mastery",
        "title": "Lessons and practice",
        "titleAr": "الكيمياء — شرح وتدريب",
        "shortDesc": "شرح لأفكار المنهج وتدريب يساعدك تعرف تستخدم اللي فهمته.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 290,
        "category": {
          "name": "Secondary Year 2",
          "nameAr": "تانية ثانوي"
        }
      },
      {
        "id": "c3",
        "slug": "revision-marathon",
        "title": "Revision and questions",
        "titleAr": "الكيمياء — مراجعة وحل أسئلة",
        "shortDesc": "نرتب أهم الأفكار ونحل أسئلة متنوعة، ونراجع النقط اللي محتاجة تركيز.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 220,
        "category": {
          "name": "Secondary Year 3",
          "nameAr": "تالتة ثانوي"
        }
      }
    ],
    "categories": [
      {
        "id": "category-0",
        "slug": "secondary-1",
        "name": "Secondary Year 1",
        "nameAr": "أولى ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-1",
        "slug": "secondary-2",
        "name": "Secondary Year 2",
        "nameAr": "تانية ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-2",
        "slug": "secondary-3",
        "name": "Secondary Year 3",
        "nameAr": "تالتة ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      }
    ],
    "teachers": [
      {
        "id": "teacher-demo",
        "name": "مستر طارق رضوان",
        "teacherSubject": "الكيمياء للمرحلة الإعدادية والثانوية",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "من أول فكرة لحد حل السؤال، هنرتب المنهج ونربط كل درس باللي قبله. اختار صفك وابدأ معايا."
      }
    ],
    "testimonials": [
      {
        "id": "rev1",
        "text": "لما فهمت سبب كل خطوة، بقيت أعرف أبدأ حل السؤال بنفسي.",
        "textEn": null,
        "authorName": "أحمد كمال",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      },
      {
        "id": "rev2",
        "text": "التدريب بعد الشرح ساعدني أعرف النقط اللي محتاج أراجعها.",
        "textEn": null,
        "authorName": "مريم عبد الله",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      }
    ],
    "stats": {
      "courses": 3,
      "teachers": 1,
      "students": 0,
      "enrollments": 0
    }
  },
  "modern-academy": {
    "siteName": "منصة آفاق التعليمية",
    "platformNameEn": "Afaq Teachers",
    "teacherName": "فريق آفاق",
    "teacherSubject": "المواد الدراسية للمرحلة الإعدادية والثانوية",
    "about": "اختار صفك والمادة اللي محتاجها، واتعرف على المدرس ومحتوى الكورس قبل ما تبدأ معانا.",
    "primaryColor": "#2563eb",
    "secondaryColor": "#0f172a",
    "accentColor": "#38bdf8",
    "badge": "شرح وتدريب ومراجعة",
    "heroImageUrl": "/instructor.png",
    "courses": [
      {
        "id": "c1",
        "slug": "advanced-physics",
        "title": "School subject foundations",
        "titleAr": "الفيزياء — شرح وتدريب",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 480,
        "category": {
          "name": "Physics",
          "nameAr": "الفيزياء"
        }
      },
      {
        "id": "c2",
        "slug": "pure-math",
        "title": "Lessons and practice",
        "titleAr": "الرياضيات — تأسيس وتطبيق",
        "shortDesc": "شرح لأفكار المنهج وتدريب يساعدك تعرف تستخدم اللي فهمته.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 450,
        "category": {
          "name": "Mathematics",
          "nameAr": "الرياضيات"
        }
      },
      {
        "id": "c3",
        "slug": "english-fluency",
        "title": "Revision and questions",
        "titleAr": "الإنجليزي — كلمات وقواعد",
        "shortDesc": "نرتب أهم الأفكار ونحل أسئلة متنوعة، ونراجع النقط اللي محتاجة تركيز.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 350,
        "category": {
          "name": "Languages",
          "nameAr": "اللغة الإنجليزية"
        }
      },
      {
        "id": "c4",
        "slug": "biology-olympiad",
        "title": "School lessons",
        "titleAr": "الأحياء — فهم ومراجعة",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 400,
        "category": {
          "name": "Biology",
          "nameAr": "الأحياء"
        }
      }
    ],
    "categories": [
      {
        "id": "category-0",
        "slug": "physics",
        "name": "Physics",
        "nameAr": "الفيزياء",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-1",
        "slug": "math",
        "name": "Mathematics",
        "nameAr": "الرياضيات",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-2",
        "slug": "english",
        "name": "Languages",
        "nameAr": "اللغة الإنجليزية",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-3",
        "slug": "biology",
        "name": "Biology",
        "nameAr": "الأحياء",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      }
    ],
    "teachers": [
      {
        "id": "t1",
        "name": "مستر عادل منصور",
        "teacherSubject": "الفيزياء",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "شرح الأساسيات والتدريب على أفكار المنهج خطوة بخطوة."
      },
      {
        "id": "t2",
        "name": "مستر محمود شاكر",
        "teacherSubject": "الرياضيات",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "شرح الأساسيات والتدريب على أفكار المنهج خطوة بخطوة."
      },
      {
        "id": "t3",
        "name": "مستر هاني سامي",
        "teacherSubject": "اللغة الإنجليزية",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "شرح الأساسيات والتدريب على أفكار المنهج خطوة بخطوة."
      }
    ],
    "testimonials": [
      {
        "id": "rev1",
        "text": "لما فهمت سبب كل خطوة، بقيت أعرف أبدأ حل السؤال بنفسي.",
        "textEn": null,
        "authorName": "زياد الشافعي",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      },
      {
        "id": "rev2",
        "text": "التدريب بعد الشرح ساعدني أعرف النقط اللي محتاج أراجعها.",
        "textEn": null,
        "authorName": "د. سامح رضوان",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      }
    ],
    "stats": {
      "courses": 4,
      "teachers": 3,
      "students": 0,
      "enrollments": 0
    }
  },
  "premium-dark": {
    "siteName": "الفيزياء مع مستر حسام",
    "platformNameEn": "Physics with Mr Hossam",
    "teacherName": "مستر حسام الأحمدي",
    "teacherSubject": "الفيزياء للمرحلة الإعدادية والثانوية",
    "about": "هنفهم الفكرة، نرسم المسألة، ونحلها خطوة بخطوة. من الأساسيات لأسئلة محتاجة تفكير.",
    "primaryColor": "#38bdf8",
    "secondaryColor": "#0b0f19",
    "accentColor": "#00f0ff",
    "badge": "شرح وتدريب ومراجعة",
    "heroImageUrl": "/instructor.png",
    "courses": [
      {
        "id": "c1",
        "slug": "quantum-physics-elite",
        "title": "School subject foundations",
        "titleAr": "الفيزياء — نبدأ من الأساسيات",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 550,
        "category": {
          "name": "Secondary Year 1",
          "nameAr": "أولى ثانوي"
        }
      },
      {
        "id": "c2",
        "slug": "differential-calculus",
        "title": "Lessons and practice",
        "titleAr": "الفيزياء — شرح وتدريب",
        "shortDesc": "شرح لأفكار المنهج وتدريب يساعدك تعرف تستخدم اللي فهمته.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 490,
        "category": {
          "name": "Secondary Year 2",
          "nameAr": "تانية ثانوي"
        }
      },
      {
        "id": "c3",
        "slug": "olympiad-problem-solving",
        "title": "Revision and questions",
        "titleAr": "الفيزياء — مراجعة وحل أسئلة",
        "shortDesc": "نرتب أهم الأفكار ونحل أسئلة متنوعة، ونراجع النقط اللي محتاجة تركيز.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 380,
        "category": {
          "name": "Secondary Year 3",
          "nameAr": "تالتة ثانوي"
        }
      }
    ],
    "categories": [
      {
        "id": "category-0",
        "slug": "secondary-1",
        "name": "Secondary Year 1",
        "nameAr": "أولى ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-1",
        "slug": "secondary-2",
        "name": "Secondary Year 2",
        "nameAr": "تانية ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-2",
        "slug": "secondary-3",
        "name": "Secondary Year 3",
        "nameAr": "تالتة ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      }
    ],
    "teachers": [
      {
        "id": "teacher-demo",
        "name": "مستر حسام الأحمدي",
        "teacherSubject": "الفيزياء للمرحلة الإعدادية والثانوية",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "هنفهم الفكرة، نرسم المسألة، ونحلها خطوة بخطوة. من الأساسيات لأسئلة محتاجة تفكير."
      }
    ],
    "testimonials": [
      {
        "id": "rev1",
        "text": "لما فهمت سبب كل خطوة، بقيت أعرف أبدأ حل السؤال بنفسي.",
        "textEn": null,
        "authorName": "عمر خيري",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      },
      {
        "id": "rev2",
        "text": "التدريب بعد الشرح ساعدني أعرف النقط اللي محتاج أراجعها.",
        "textEn": null,
        "authorName": "نور حسام",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      }
    ],
    "stats": {
      "courses": 3,
      "teachers": 1,
      "students": 0,
      "enrollments": 0
    }
  },
  "clean-education": {
    "siteName": "الإنجليزي مع مستر نور",
    "platformNameEn": "English with Mr Noor",
    "teacherName": "مستر نور أحمد",
    "teacherSubject": "اللغة الإنجليزية للمرحلة الإعدادية والثانوية",
    "about": "كلمات وقواعد وتدريب على القراءة والكتابة. هنمشي في المنهج واحدة واحدة، وكل درس نبني عليه اللي بعده.",
    "primaryColor": "#0d9488",
    "secondaryColor": "#134e4a",
    "accentColor": "#f97316",
    "badge": "شرح وتدريب ومراجعة",
    "heroImageUrl": "/instructor.png",
    "courses": [
      {
        "id": "c1",
        "slug": "german-a1-a2",
        "title": "School subject foundations",
        "titleAr": "اللغة الإنجليزية — نبدأ من الأساسيات",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 380,
        "category": {
          "name": "Secondary Year 1",
          "nameAr": "أولى ثانوي"
        }
      },
      {
        "id": "c2",
        "slug": "english-conversation",
        "title": "Lessons and practice",
        "titleAr": "اللغة الإنجليزية — شرح وتدريب",
        "shortDesc": "شرح لأفكار المنهج وتدريب يساعدك تعرف تستخدم اللي فهمته.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 340,
        "category": {
          "name": "Secondary Year 2",
          "nameAr": "تانية ثانوي"
        }
      },
      {
        "id": "c3",
        "slug": "french-delph",
        "title": "Revision and questions",
        "titleAr": "اللغة الإنجليزية — مراجعة وحل أسئلة",
        "shortDesc": "نرتب أهم الأفكار ونحل أسئلة متنوعة، ونراجع النقط اللي محتاجة تركيز.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 390,
        "category": {
          "name": "Secondary Year 3",
          "nameAr": "تالتة ثانوي"
        }
      }
    ],
    "categories": [
      {
        "id": "category-0",
        "slug": "secondary-1",
        "name": "Secondary Year 1",
        "nameAr": "أولى ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-1",
        "slug": "secondary-2",
        "name": "Secondary Year 2",
        "nameAr": "تانية ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-2",
        "slug": "secondary-3",
        "name": "Secondary Year 3",
        "nameAr": "تالتة ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      }
    ],
    "teachers": [
      {
        "id": "teacher-demo",
        "name": "مستر نور أحمد",
        "teacherSubject": "اللغة الإنجليزية للمرحلة الإعدادية والثانوية",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "كلمات وقواعد وتدريب على القراءة والكتابة. هنمشي في المنهج واحدة واحدة، وكل درس نبني عليه اللي بعده."
      }
    ],
    "testimonials": [
      {
        "id": "rev1",
        "text": "لما فهمت سبب كل خطوة، بقيت أعرف أبدأ حل السؤال بنفسي.",
        "textEn": null,
        "authorName": "ياسمين شريف",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      },
      {
        "id": "rev2",
        "text": "التدريب بعد الشرح ساعدني أعرف النقط اللي محتاج أراجعها.",
        "textEn": null,
        "authorName": "كريم يوسف",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      }
    ],
    "stats": {
      "courses": 3,
      "teachers": 1,
      "students": 0,
      "enrollments": 0
    }
  },
  "course-funnel": {
    "siteName": "المراجعة مع مستر أحمد",
    "platformNameEn": "Revision with Mr Ahmed",
    "teacherName": "مستر أحمد منصور",
    "teacherSubject": "الفيزياء للمرحلة الإعدادية والثانوية",
    "about": "راجع الأفكار الأساسية، اتدرب على أسئلة متنوعة، واعرف إيه اللي محتاج ترجعله. شوف تفاصيل الكورس وخطته قبل الاشتراك.",
    "primaryColor": "#e11d48",
    "secondaryColor": "#18181b",
    "accentColor": "#f59e0b",
    "badge": "شرح وتدريب ومراجعة",
    "heroImageUrl": "/instructor.png",
    "courses": [
      {
        "id": "c1",
        "slug": "thanawya-physics-masterclass",
        "title": "School subject foundations",
        "titleAr": "الفيزياء — نبدأ من الأساسيات",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 650,
        "category": {
          "name": "Secondary Year 1",
          "nameAr": "أولى ثانوي"
        }
      }
    ],
    "categories": [
      {
        "id": "category-0",
        "slug": "secondary-1",
        "name": "Secondary Year 1",
        "nameAr": "أولى ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      }
    ],
    "teachers": [
      {
        "id": "teacher-demo",
        "name": "مستر أحمد منصور",
        "teacherSubject": "الفيزياء للمرحلة الإعدادية والثانوية",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "راجع الأفكار الأساسية، اتدرب على أسئلة متنوعة، واعرف إيه اللي محتاج ترجعله. شوف تفاصيل الكورس وخطته قبل الاشتراك."
      }
    ],
    "testimonials": [
      {
        "id": "rev1",
        "text": "لما فهمت سبب كل خطوة، بقيت أعرف أبدأ حل السؤال بنفسي.",
        "textEn": null,
        "authorName": "محمد هاني",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      },
      {
        "id": "rev2",
        "text": "التدريب بعد الشرح ساعدني أعرف النقط اللي محتاج أراجعها.",
        "textEn": null,
        "authorName": "سارة طارق",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      }
    ],
    "stats": {
      "courses": 1,
      "teachers": 1,
      "students": 0,
      "enrollments": 0
    }
  },
  "bold-youth": {
    "siteName": "يلا نفهم مع مستر حسام",
    "platformNameEn": "Learn with Mr Hossam",
    "teacherName": "مستر حسام بيبو",
    "teacherSubject": "الفيزياء للمرحلة الإعدادية والثانوية",
    "about": "مش محتاج تحفظ الحل. تعال نفهم الفكرة ونجرب عليها، ونمشي في المنهج بخطوات واضحة تناسب مستواك.",
    "primaryColor": "#0891b2",
    "secondaryColor": "#2459d5",
    "accentColor": "#0f766e",
    "badge": "شرح وتدريب ومراجعة",
    "heroImageUrl": "/instructor.png",
    "courses": [
      {
        "id": "c1",
        "slug": "fast-physics-hacks",
        "title": "School subject foundations",
        "titleAr": "الفيزياء — نبدأ من الأساسيات",
        "shortDesc": "هنراجع الأساسيات بأمثلة بسيطة، وبعدها نحل عليها خطوة بخطوة.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 299,
        "category": {
          "name": "Secondary Year 1",
          "nameAr": "أولى ثانوي"
        }
      },
      {
        "id": "c2",
        "slug": "math-speed-run",
        "title": "Lessons and practice",
        "titleAr": "الفيزياء — شرح وتدريب",
        "shortDesc": "شرح لأفكار المنهج وتدريب يساعدك تعرف تستخدم اللي فهمته.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 250,
        "category": {
          "name": "Secondary Year 2",
          "nameAr": "تانية ثانوي"
        }
      },
      {
        "id": "c3",
        "slug": "night-before-exam",
        "title": "Revision and questions",
        "titleAr": "الفيزياء — مراجعة وحل أسئلة",
        "shortDesc": "نرتب أهم الأفكار ونحل أسئلة متنوعة، ونراجع النقط اللي محتاجة تركيز.",
        "shortDescEn": "School lessons with guided explanations, practice and revision.",
        "price": 180,
        "category": {
          "name": "Secondary Year 3",
          "nameAr": "تالتة ثانوي"
        }
      }
    ],
    "categories": [
      {
        "id": "category-0",
        "slug": "secondary-1",
        "name": "Secondary Year 1",
        "nameAr": "أولى ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-1",
        "slug": "secondary-2",
        "name": "Secondary Year 2",
        "nameAr": "تانية ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      },
      {
        "id": "category-2",
        "slug": "secondary-3",
        "name": "Secondary Year 3",
        "nameAr": "تالتة ثانوي",
        "description": "شرح وتدريب ومراجعة",
        "imageUrl": null,
        "_count": {
          "courses": 1
        }
      }
    ],
    "teachers": [
      {
        "id": "teacher-demo",
        "name": "مستر حسام بيبو",
        "teacherSubject": "الفيزياء للمرحلة الإعدادية والثانوية",
        "teacherAvatarUrl": "/instructor.png",
        "bio": "مش محتاج تحفظ الحل. تعال نفهم الفكرة ونجرب عليها، ونمشي في المنهج بخطوات واضحة تناسب مستواك."
      }
    ],
    "testimonials": [
      {
        "id": "rev1",
        "text": "لما فهمت سبب كل خطوة، بقيت أعرف أبدأ حل السؤال بنفسي.",
        "textEn": null,
        "authorName": "مروان إيهاب",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      },
      {
        "id": "rev2",
        "text": "التدريب بعد الشرح ساعدني أعرف النقط اللي محتاج أراجعها.",
        "textEn": null,
        "authorName": "شهد عادل",
        "authorTitle": "طالب بالثانوي — مثال للمعاينة",
        "authorTitleEn": "Secondary student — demo example",
        "imageUrl": null
      }
    ],
    "stats": {
      "courses": 3,
      "teachers": 1,
      "students": 0,
      "enrollments": 0
    }
  }
};
