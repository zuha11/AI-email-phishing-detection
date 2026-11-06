
import {
  BriefcaseBusiness,
  CheckCircle2,
  Megaphone,
  Users,
  CreditCard,
  UserRound,
  CalendarDays,
  Headphones,
  Plane,
  Newspaper,
  Mail,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "https://127.0.0.1:5000/api/poc4/categorize-inbox";

type CategoryDefinition = {
  name: string;
  description: string;
  icon: typeof Mail;
  className: string;
  aliases: string[];
};

type CategoryEmail = {
  id: string;
  sender: string;
  address: string;
  subject: string;
  preview: string;
  time: string;
  category: string;
  raw: Record<string, unknown>;
};

const categories: CategoryDefinition[] = [
  {
    name: "Business",
    description: "Business and professional communication",
    icon: BriefcaseBusiness,
    className: "work",
    aliases: ["business"],
  },
  {
    name: "Customer Support",
    description: "Customer service and support emails",
    icon: Headphones,
    className: "support",
    aliases: ["customer support", "support"],
  },
  {
    name: "Events & Invitations",
    description: "Events, meetings and invitations",
    icon: CalendarDays,
    className: "events",
    aliases: ["events & invitations", "events and invitations"],
  },
  {
    name: "Finance & Bills",
    description: "Bills, payments and financial updates",
    icon: CreditCard,
    className: "finance",
    aliases: [
      "finance & bills",
      "finance and bills",
      "banking / finance",
    ],
  },
  {
    name: "Job Application",
    description: "Job applications and recruitment",
    icon: UserRound,
    className: "jobs",
    aliases: ["job application", "jobs"],
  },
  {
    name: "Newsletters",
    description: "Newsletters and email updates",
    icon: Newspaper,
    className: "newsletters",
    aliases: ["newsletters", "newsletter"],
  },
  {
    name: "Personal",
    description: "Personal conversations and messages",
    icon: Users,
    className: "personal",
    aliases: ["personal", "social"],
  },
  {
    name: "Promotions",
    description: "Offers, deals and promotional emails",
    icon: Megaphone,
    className: "promotions",
    aliases: ["promotions", "shopping"],
  },
  {
    name: "Reminders",
    description: "Reminders and important follow-ups",
    icon: CheckCircle2,
    className: "reminders",
    aliases: ["reminders"],
  },
  {
    name: "Travel & Bookings",
    description: "Travel plans and booking confirmations",
    icon: Plane,
    className: "travel",
    aliases: ["travel & bookings", "travel and bookings"],
  },
];

function categoryKey(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readString(
  item: Record<string, unknown>,
  keys: string[],
  fallback = ""
): string {
  for (const key of keys) {
    const value = item[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

function normalizeCategory(value: string): string {
  const normalized = categoryKey(value);

  const found = categories.find((category) =>
    [category.name, ...category.aliases].some(
      (alias) => categoryKey(alias) === normalized
    )
  );

  return found?.name ?? value.trim();
}

function normalizeEmail(
  item: Record<string, unknown>,
  index: number
): CategoryEmail {
  const nestedPrediction =
    item.prediction && typeof item.prediction === "object"
      ? (item.prediction as Record<string, unknown>)
      : {};

  const categoryValue = readString(
    item,
    [
      "primary_category",
      "predicted_category",
      "predicted_label",
      "category",
      "label",
      "predicted_class",
    ],
    readString(
      nestedPrediction,
      [
        "primary_category",
        "predicted_category",
        "category",
        "label",
      ],
      "Unclassified"
    )
  );

  const fromValue = readString(
    item,
    [
      "sender",
      "from",
      "from_email",
      "email_address",
      "email",
      "address",
    ],
    "Unknown sender"
  );

  const subject = readString(item, ["subject", "title"], "(No subject)");

  const preview = readString(
    item,
    ["snippet", "preview", "body", "text", "message"],
    "No message preview available."
  );

  return {
    id: readString(
      item,
      ["id", "email_id", "message_id", "uid"],
      String(index)
    ),
    sender: readString(item, ["sender_name", "from_name"], fromValue),
    address: fromValue,
    subject,
    preview,
    time: readString(
      item,
      ["date", "time", "received_at", "timestamp"]
    ),
    category: normalizeCategory(categoryValue),
    raw: item,
  };
}

function extractEmails(payload: unknown): CategoryEmail[] {
  const arrayKeys = [
    "emails",
    "results",
    "categorized_emails",
    "data",
    "messages",
    "items",
  ];

  function findArray(value: unknown, depth = 0): unknown[] {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value || typeof value !== "object" || depth > 3) {
      return [];
    }

    const object = value as Record<string, unknown>;

    for (const key of arrayKeys) {
      if (Array.isArray(object[key])) {
        return object[key] as unknown[];
      }
    }

    for (const key of arrayKeys) {
      const nested = object[key];

      if (nested && typeof nested === "object") {
        const result = findArray(nested, depth + 1);

        if (result.length > 0) {
          return result;
        }
      }
    }

    return [];
  }

  return findArray(payload)
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) &&
        typeof item === "object" &&
        !Array.isArray(item)
    )
    .map((item, index) => normalizeEmail(item, index));
}

function Categories() {
  const [emails, setEmails] = useState<CategoryEmail[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );
  const [selectedEmail, setSelectedEmail] = useState<CategoryEmail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadCategorizedEmails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload === "object"
            ? readString(payload as Record<string, unknown>, [
                "error",
                "message",
              ])
            : "";

        throw new Error(
          message || `Server returned HTTP ${response.status}.`
        );
      }

      if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        (payload as Record<string, unknown>).success === false
      ) {
        throw new Error(
          readString(
            payload as Record<string, unknown>,
            ["error", "message"],
            "The backend could not categorize the emails."
          )
        );
      }

      const result = extractEmails(payload);

      console.log("POC4 API payload:", payload);
      console.log("POC4 extracted emails:", result.length);
      console.log(
        "POC4 normalized categories:",
        result.map((email) => ({
          id: email.id,
          category: email.category,
          originalCategory: email.raw.primary_category,
        }))
      );

      setEmails(result);
      setLastUpdated(new Date().toLocaleTimeString());

      if (result.length === 0) {
        console.warn("POC4 returned no extractable email records.");
      }
    } catch (err) {
      console.error("POC4 loading failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the email categorization service."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategorizedEmails();
  }, [loadCategorizedEmails]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const category of categories) {
      counts[category.name] = 0;
    }

    for (const email of emails) {
      const sourceCategory =
        readString(email.raw, [
          "primary_category",
          "predicted_category",
          "predicted_label",
          "category",
          "label",
          "predicted_class",
        ]) || email.category;

      const normalizedKey = categoryKey(sourceCategory);

      const matchedCategory = categories.find((category) =>
        [category.name, ...category.aliases].some(
          (alias) => categoryKey(alias) === normalizedKey
        )
      );

      if (matchedCategory) {
        counts[matchedCategory.name] += 1;
      } else {
        console.warn(
          "POC4 category did not match:",
          sourceCategory,
          normalizedKey
        );
      }
    }

    console.log("POC4 final category counts:", counts);

    return counts;
  }, [emails]);

  const visibleEmails = useMemo(
    () =>
      selectedCategory
        ? emails.filter(
            (email) =>
              categoryKey(email.category) === categoryKey(selectedCategory)
          )
        : [],
    [emails, selectedCategory]
  );

  return (
    <main className="category-page">
      <style>{`
        .category-page {
          flex: 1;
          min-width: 0;
          min-height: 100vh;
          background: #f8f9fc;
          color: #202124;
          overflow-y: auto;
          font-family: inherit;
        }

        .category-page *,
        .category-page *::before,
        .category-page *::after {
          box-sizing: border-box;
        }

        .category-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 38px 55px;
        }

        .category-intro-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 24px;
        }

        .category-intro {
          min-width: 0;
        }

        .category-intro h1 {
          margin: 0;
          font-size: 25px;
          line-height: 1.3;
          font-weight: 750;
          letter-spacing: -.45px;
        }

        .category-intro p {
          margin: 9px 0 0;
          color: #777985;
          font-size: 14px;
          line-height: 1.7;
        }

        .category-refresh {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #e6e7ef;
          border-radius: 10px;
          background: #fff;
          color: #424354;
          padding: 10px 13px;
          cursor: pointer;
          font-size: 13px;
          white-space: nowrap;
        }

        .category-refresh:hover:not(:disabled) {
          background: #f7f4ff;
          border-color: #d9cef8;
        }

        .category-refresh:disabled {
          opacity: .6;
          cursor: wait;
        }

        .category-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 22px;
        }

        .category-summary span {
          border: 1px solid #e9e7f4;
          background: #fff;
          border-radius: 10px;
          padding: 10px 13px;
          color: #777985;
          font-size: 12px;
        }

        .category-summary strong {
          color: #292a35;
          margin-right: 5px;
          font-size: 14px;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .category-card {
          min-height: 176px;
          padding: 24px 26px;
          border: 1px solid #efeff4;
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 5px 17px rgba(38,35,77,.035);
          text-align: left;
          cursor: pointer;
          transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .category-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 9px 24px rgba(38,35,77,.07);
        }

        .category-card.selected {
          border: 2px solid #8751d8;
          padding: 23px 25px;
          box-shadow: 0 9px 25px rgba(119,75,207,.1);
        }

        .category-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
        }

        .category-icon.finance { color: #4268c7; background: #edf2ff; }
        .category-icon.education { color: #7561d8; background: #f1edff; }
        .category-icon.shopping,
        .category-icon.support { color: #26966f; background: #eaf8f2; }
        .category-icon.work,
        .category-icon.jobs { color: #6d50bd; background: #f0ebff; }
        .category-icon.promotions { color: #d66a46; background: #fff0ea; }
        .category-icon.personal { color: #c45178; background: #fff0f5; }
        .category-icon.events,
        .category-icon.reminders { color: #58728d; background: #edf3f8; }
        .category-icon.newsletters { color: #4268c7; background: #edf2ff; }
        .category-icon.travel { color: #2787a4; background: #e9f8fc; }

        .category-card-name {
          font-size: 16px;
          font-weight: 600;
          color: #24252b;
          margin-bottom: 7px;
        }

        .category-card-description {
          font-size: 12px;
          color: #999ba5;
          line-height: 1.5;
        }

        .category-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 18px;
        }

        .category-count-text {
          color: #999ba5;
          font-size: 12px;
        }

        .category-count {
          font-size: 14px;
          font-weight: 700;
          color: #6d50bd;
        }

        .category-ai-info {
          margin-top: 26px;
          padding: 19px 22px;
          border-radius: 16px;
          background: #f1ecff;
          border: 1px solid #e5dcff;
          display: flex;
          align-items: flex-start;
          gap: 13px;
        }

        .category-ai-icon {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          border-radius: 9px;
          background: #e3d9ff;
          color: #6840b7;
          display: grid;
          place-items: center;
        }

        .category-ai-text {
          color: #6a548c;
          font-size: 13px;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }

        .category-ai-text strong {
          color: #56369c;
        }

        .category-message {
          margin: 20px 0;
          padding: 15px 17px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .category-message.error {
          color: #9f3038;
          background: #fff0f1;
          border: 1px solid #ffdadd;
        }

        .category-message.neutral {
          color: #66677a;
          background: #fff;
          border: 1px solid #e9e9f0;
        }

        .category-email-section {
          margin-top: 28px;
          border: 1px solid #ececf3;
          border-radius: 16px;
          background: #fff;
          overflow: hidden;
        }

        .category-email-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 19px 22px;
          border-bottom: 1px solid #eeeef4;
        }

        .category-email-heading h2 {
          margin: 0;
          font-size: 17px;
        }

        .category-email-heading p {
          margin: 5px 0 0;
          font-size: 12px;
          color: #9295a2;
        }

        .category-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: transparent;
          color: #6840b7;
          cursor: pointer;
          font-size: 13px;
        }

        .category-email-list {
          display: flex;
          flex-direction: column;
        }

        .category-email-item {
          display: flex;
          gap: 13px;
          padding: 17px 22px;
          border-bottom: 1px solid #f0f0f5;
          transition: background .15s ease;
          outline-offset: -3px;
        }

        .category-email-item:hover {
          background: #faf8ff;
        }

        .category-email-item:focus-visible {
          outline: 2px solid #8751d8;
        }

        .category-email-item:last-child {
          border-bottom: 0;
        }

        .category-email-avatar {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: #6840b7;
          background: #f1ecff;
        }

        .category-email-main {
          min-width: 0;
          flex: 1;
        }

        .category-email-sender {
          font-size: 13px;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .category-email-address {
          margin-left: 7px;
          color: #999ba5;
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .category-email-subject {
          margin-top: 5px;
          font-size: 13px;
          color: #343541;
          overflow-wrap: anywhere;
        }

        .category-email-preview {
          margin-top: 5px;
          color: #888a96;
          font-size: 12px;
          line-height: 1.55;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .category-email-time {
          color: #999ba5;
          font-size: 11px;
          white-space: nowrap;
        }

        .category-help {
          position: fixed;
          right: 24px;
          bottom: 22px;
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 50%;
          background: #111217;
          color: #fff;
          font-size: 21px;
          cursor: pointer;
          box-shadow: 0 5px 16px rgba(0,0,0,.2);
        }

        /* GLOBAL DARK MODE */

        [data-theme="dark"] .category-page {
          background: var(--sm-dark-page, #11111b);
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .category-intro h1 {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .category-intro p {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .category-refresh {
          background: var(--sm-dark-input, #242334);
          border-color: var(--sm-dark-border, #343143);
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .category-refresh:hover:not(:disabled) {
          background: #302b43;
          border-color: #62558a;
        }

        [data-theme="dark"] .category-summary span {
          background: var(--sm-dark-card, #1c1b29);
          border-color: var(--sm-dark-border, #343143);
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .category-summary strong {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .category-card {
          background: var(--sm-dark-card, #1c1b29);
          border-color: var(--sm-dark-border, #343143);
          box-shadow: 0 5px 17px rgba(0,0,0,.15);
        }

        [data-theme="dark"] .category-card:hover {
          background: #242234;
          box-shadow: 0 9px 24px rgba(0,0,0,.25);
        }

        [data-theme="dark"] .category-card.selected {
          border-color: #9572e8;
          box-shadow: 0 9px 25px rgba(119,75,207,.2);
        }

        [data-theme="dark"] .category-card-name {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .category-card-description {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .category-count-text {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .category-count {
          color: #b6a0ff;
        }

        [data-theme="dark"] .category-icon.finance,
        [data-theme="dark"] .category-icon.newsletters {
          background: #263353;
          color: #a9c1ff;
        }

        [data-theme="dark"] .category-icon.education,
        [data-theme="dark"] .category-icon.work,
        [data-theme="dark"] .category-icon.jobs {
          background: #34294f;
          color: #c4b1ff;
        }

        [data-theme="dark"] .category-icon.shopping,
        [data-theme="dark"] .category-icon.support {
          background: #1d3d35;
          color: #85e0bd;
        }

        [data-theme="dark"] .category-icon.promotions {
          background: #493027;
          color: #ffb38e;
        }

        [data-theme="dark"] .category-icon.personal {
          background: #49283b;
          color: #f5a6c7;
        }

        [data-theme="dark"] .category-icon.events,
        [data-theme="dark"] .category-icon.reminders {
          background: #293b4c;
          color: #a9c9e8;
        }

        [data-theme="dark"] .category-icon.travel {
          background: #1c3c49;
          color: #8bd9ed;
        }

        [data-theme="dark"] .category-ai-info {
          background: #29213e;
          border-color: #453565;
        }

        [data-theme="dark"] .category-ai-icon {
          background: #443464;
          color: #d1bdff;
        }

        [data-theme="dark"] .category-ai-text {
          color: #c7b9e4;
        }

        [data-theme="dark"] .category-ai-text strong {
          color: #e0d2ff;
        }

        [data-theme="dark"] .category-message.error {
          color: #fecaca;
          background: #39202b;
          border-color: #713348;
        }

        [data-theme="dark"] .category-message.neutral {
          color: var(--sm-dark-muted, #aaa4b8);
          background: var(--sm-dark-card, #1c1b29);
          border-color: var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .category-email-section {
          background: var(--sm-dark-card, #1c1b29);
          border-color: var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .category-email-heading {
          border-bottom-color: var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .category-email-heading h2 {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .category-email-heading p {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .category-back {
          color: #b6a0ff;
        }

        [data-theme="dark"] .category-back:hover {
          color: #d2c4ff;
        }

        [data-theme="dark"] .category-email-item {
          border-bottom-color: var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .category-email-item:hover {
          background: #292638;
        }

        [data-theme="dark"] .category-email-avatar {
          background: #34294f;
          color: #c4b1ff;
        }

        [data-theme="dark"] .category-email-sender {
          color: var(--sm-dark-text, #eeeaf7);
        }

        [data-theme="dark"] .category-email-address {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .category-email-subject {
          color: #e2ddec;
        }

        [data-theme="dark"] .category-email-preview {
          color: #aaa4b8;
        }

        [data-theme="dark"] .category-email-time {
          color: var(--sm-dark-muted, #aaa4b8);
        }

        [data-theme="dark"] .category-email-section > div[style] {
          color: var(--sm-dark-text, #eeeaf7) !important;
        }

        [data-theme="dark"] .category-email-section > div[style] p {
          color: #d5d0e2;
        }

        [data-theme="dark"] .category-email-section > div > div[style] {
          background: #242334 !important;
          color: #d5d0e2 !important;
          border: 1px solid var(--sm-dark-border, #343143);
        }

        [data-theme="dark"] .category-help {
          background: #5148c9;
          color: #fff;
        }

        [data-theme="dark"] .category-help:hover {
          background: #6259df;
        }

        @media (max-width: 950px) {
          .category-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .category-content {
            padding: 30px 20px 45px;
          }
        }

        @media (max-width: 650px) {
          .category-grid {
            grid-template-columns: 1fr;
          }

          .category-intro-row {
            gap: 12px;
          }

          .category-intro h1 {
            font-size: 22px;
          }

          .category-refresh {
            padding: 10px;
          }

          .category-refresh span {
            display: none;
          }

          .category-email-item {
            padding: 15px;
          }

          .category-email-time {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .category-intro-row {
            flex-direction: column;
          }

          .category-refresh span {
            display: inline;
          }
        }
      `}</style>

      <div className="category-content">
        <div className="category-intro-row">
          <section className="category-intro">
            <h1>Email Categories</h1>
            <p>
              Explore Gmail messages classified by your trained POC 4
              machine-learning model. Select a category to view its emails.
            </p>
          </section>

          <button
            className="category-refresh"
            type="button"
            onClick={() => void loadCategorizedEmails()}
            disabled={loading}
            title="Refresh categorized emails"
          >
            <RefreshCw size={15} />
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </button>
        </div>

        <div className="category-summary">
          <span>
            <strong>{emails.length}</strong> categorized messages returned
          </span>

          <span>
            <strong>
              {
                categories.filter(
                  (category) => categoryCounts[category.name] > 0
                ).length
              }
            </strong>{" "}
            categories with emails
          </span>

          {lastUpdated && <span>Last refreshed: {lastUpdated}</span>}
        </div>

        {loading && (
          <div className="category-message neutral" role="status">
            <RefreshCw size={17} />
            Fetching Gmail messages and their POC 4 category predictions...
          </div>
        )}

        {error && (
          <div className="category-message error" role="alert">
            <AlertCircle size={18} />

            <div>
              <strong>Could not load categorized emails.</strong>
              <div>{error}</div>
              <div>
                Check that your Flask backend is running and that its POC 4
                endpoint returns categorized emails. If the browser reports
                a CORS error, the backend must allow your Vite frontend origin.
              </div>

              <button
                type="button"
                className="category-back"
                onClick={() => void loadCategorizedEmails()}
                style={{ marginTop: 8 }}
              >
                <RefreshCw size={14} /> Try again
              </button>
            </div>
          </div>
        )}

        <section className="category-grid">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.name;
            const count = categoryCounts[category.name] ?? 0;

            return (
              <button
                key={category.name}
                type="button"
                className={`category-card ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedCategory(
                    isSelected ? null : category.name
                  );
                  setSelectedEmail(null);
                }}
                aria-pressed={isSelected}
              >
                <div>
                  <div className={`category-icon ${category.className}`}>
                    <Icon size={21} />
                  </div>

                  <div className="category-card-name">
                    {category.name}
                  </div>

                  <div className="category-card-description">
                    {category.description}
                  </div>
                </div>

                <div className="category-card-bottom">
                  <span className="category-count-text">
                    {count === 1 ? "1 email" : `${count} emails`}
                  </span>

                  <span className="category-count">{count}</span>
                </div>
              </button>
            );
          })}
        </section>

        {selectedCategory && (
          <section className="category-email-section">
            <div className="category-email-heading">
              <div>
                <h2>{selectedCategory}</h2>
                <p>
                  {visibleEmails.length} matching{" "}
                  {visibleEmails.length === 1 ? "email" : "emails"}
                </p>
              </div>

              <button
                type="button"
                className="category-back"
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedEmail(null);
                }}
              >
                <ArrowLeft size={15} /> All categories
              </button>
            </div>

            {visibleEmails.length === 0 ? (
              <div
                className="category-message neutral"
                style={{ margin: 18 }}
              >
                No emails are currently returned for this category.
                Refresh to fetch the latest results.
              </div>
            ) : (
              <div className="category-email-list">
                {visibleEmails.map((email) => (
                  <article
                    className="category-email-item"
                    key={`${email.id}-${email.subject}`}
                    role="button"
                    tabIndex={0}
                    title="Click to open email"
                    onClick={() => setSelectedEmail(email)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        setSelectedEmail(email);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="category-email-avatar">
                      <Mail size={18} />
                    </div>

                    <div className="category-email-main">
                      <div>
                        <span className="category-email-sender">
                          {email.sender}
                        </span>

                        {email.address !== email.sender && (
                          <span className="category-email-address">
                            {email.address}
                          </span>
                        )}
                      </div>

                      <div className="category-email-subject">
                        {email.subject}
                      </div>

                      <div className="category-email-preview">
                        {email.preview}
                      </div>
                    </div>

                    {email.time && (
                      <span className="category-email-time">
                        {email.time}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedEmail && (
          <section
            className="category-email-section"
            aria-label="Email details"
          >
            <div className="category-email-heading">
              <div>
                <h2>Email Details</h2>
                <p>Category: {selectedEmail.category}</p>
              </div>

              <button
                type="button"
                className="category-back"
                onClick={() => setSelectedEmail(null)}
              >
                <ArrowLeft size={15} /> Back to emails
              </button>
            </div>

            <div style={{ padding: "22px" }}>
              <p>
                <strong>From: </strong>
                {selectedEmail.sender}
                {selectedEmail.address !== selectedEmail.sender &&
                  ` (${selectedEmail.address})`}
              </p>

              <p>
                <strong>Subject: </strong>
                {selectedEmail.subject}
              </p>

              {selectedEmail.time && (
                <p>
                  <strong>Date: </strong>
                  {selectedEmail.time}
                </p>
              )}

              <div
                style={{
                  marginTop: "18px",
                  padding: "18px",
                  background: "#f8f6ff",
                  borderRadius: "12px",
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  lineHeight: 1.7,
                  color: "#343541",
                }}
              >
                {selectedEmail.preview}
              </div>
            </div>
          </section>
        )}

        <section className="category-ai-info">
          <div className="category-ai-icon">
            <CheckCircle2 size={18} />
          </div>

          <div className="category-ai-text">
            <strong>PhishShield AI — POC 4</strong>{" "}
            Category counts are calculated from the primary category
            predictions returned by your backend. These are model
            predictions, not manually assigned demo counts. Messages that
            the backend does not return cannot be displayed here.
          </div>
        </section>
      </div>

      <button
        className="category-help"
        type="button"
        aria-label="Help"
        title="Email categorization help"
        onClick={() =>
          window.alert(
            "Choose a category card to view its emails. Click an email to open its details. Use Refresh to request the latest POC 4 results."
          )
        }
      >
        ?
      </button>
    </main>
  );
}

export default Categories;
