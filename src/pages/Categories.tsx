import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  GraduationCap,
  Heart,
  Landmark,
  Megaphone,
  ShoppingBag,
  ShieldAlert,
  Users,
  CreditCard,
} from "lucide-react";
import { useState } from "react";

type Category = {
  name: string;
  description: string;
  count: number;
  icon: React.ElementType;
  className: string;
};

const categories: Category[] = [
  {
    name: "Banking / Finance",
    description: "Financial and banking emails",
    count: 0,
    icon: CreditCard,
    className: "finance",
  },
  {
    name: "Education",
    description: "College and education emails",
    count: 0,
    icon: GraduationCap,
    className: "education",
  },
  {
    name: "Shopping",
    description: "Orders and shopping emails",
    count: 0,
    icon: ShoppingBag,
    className: "shopping",
  },
  {
    name: "Work",
    description: "Work and professional emails",
    count: 0,
    icon: BriefcaseBusiness,
    className: "work",
  },
  {
    name: "Promotions",
    description: "Offers and promotional emails",
    count: 0,
    icon: Megaphone,
    className: "promotions",
  },
  {
    name: "Social",
    description: "Social media notifications",
    count: 0,
    icon: Users,
    className: "social",
  },
  {
    name: "Healthcare",
    description: "Healthcare related emails",
    count: 0,
    icon: Heart,
    className: "healthcare",
  },
  {
    name: "Government / Official",
    description: "Official and government emails",
    count: 0,
    icon: Building2,
    className: "government",
  },
  {
    name: "Spam / Phishing",
    description: "Suspicious and unsafe emails",
    count: 0,
    icon: ShieldAlert,
    className: "spam",
  },
];

function Categories() {
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

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

        .category-topbar {
          height: 82px;
          background: #ffffff;
          border-bottom: 1px solid #e8e9ef;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 42px;
        }

        .category-title-block h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.2px;
        }

        .category-title-block p {
          margin: 4px 0 0;
          color: #9a9ca7;
          font-size: 13px;
        }

        .category-top-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .category-notification {
          position: relative;
          width: 48px;
          height: 48px;
          border: 1px solid #ececf2;
          border-radius: 50%;
          background: #ffffff;
          display: grid;
          place-items: center;
          color: #343541;
        }

        .category-notification-badge {
          position: absolute;
          top: -3px;
          right: -1px;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          border-radius: 10px;
          background: #e63d45;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          display: grid;
          place-items: center;
          border: 2px solid #ffffff;
        }

        .category-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .category-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #e9e6ff;
          color: #6650d8;
          display: grid;
          place-items: center;
          font-size: 13px;
          font-weight: 700;
        }

        .category-profile-name {
          font-size: 14px;
          font-weight: 600;
        }

        .category-chevron {
          margin-left: 3px;
          color: #8c8e98;
          font-size: 13px;
        }

        .category-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 36px 38px 55px;
        }

        .category-intro h1 {
          margin: 0;
          font-size: 25px;
          line-height: 1.2;
          font-weight: 750;
          letter-spacing: -0.45px;
        }

        .category-intro p {
          margin: 9px 0 28px;
          color: #777985;
          font-size: 14px;
          line-height: 1.7;
        }

        .category-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .category-card {
          min-height: 176px;
          padding: 24px 26px;
          border: 1px solid #efeff4;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 5px 17px rgba(38, 35, 77, 0.035);
          text-align: left;
          cursor: pointer;
          transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .category-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 9px 24px rgba(38, 35, 77, 0.07);
        }

        .category-card.selected {
          border: 2px solid #8751d8;
          padding: 23px 25px;
          box-shadow: 0 9px 25px rgba(119, 75, 207, 0.1);
        }

        .category-icon {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          margin-bottom: 18px;
        }

        .category-icon.finance {
          color: #4268c7;
          background: #edf2ff;
        }

        .category-icon.education {
          color: #7561d8;
          background: #f1edff;
        }

        .category-icon.shopping {
          color: #26966f;
          background: #eaf8f2;
        }

        .category-icon.work {
          color: #6d50bd;
          background: #f0ebff;
        }

        .category-icon.promotions {
          color: #d66a46;
          background: #fff0ea;
        }

        .category-icon.social {
          color: #c45178;
          background: #fff0f5;
        }

        .category-icon.healthcare {
          color: #d15d75;
          background: #fff0f3;
        }

        .category-icon.government {
          color: #58728d;
          background: #edf3f8;
        }

        .category-icon.spam {
          color: #c94b55;
          background: #fff0f1;
        }

        .category-card-name {
          font-size: 16px;
          font-weight: 600;
          color: #24252b;
          margin-bottom: 7px;
        }

        .category-card-description {
          font-size: 12px;
          color: #999ba5;
          line-height: 1.4;
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
        }

        .category-count.finance {
          color: #4268c7;
        }

        .category-count.education {
          color: #7561d8;
        }

        .category-count.shopping {
          color: #26966f;
        }

        .category-count.work {
          color: #6d50bd;
        }

        .category-count.promotions {
          color: #d66a46;
        }

        .category-count.social {
          color: #c45178;
        }

        .category-count.healthcare {
          color: #d15d75;
        }

        .category-count.government {
          color: #58728d;
        }

        .category-count.spam {
          color: #c94b55;
        }

        .category-ai-info {
          margin-top: 30px;
          padding: 21px 25px;
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
        }

        .category-ai-text strong {
          color: #56369c;
          font-weight: 700;
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
          color: #ffffff;
          font-size: 21px;
          cursor: pointer;
          box-shadow: 0 5px 16px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 950px) {
          .category-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .category-topbar {
            padding: 0 20px;
          }

          .category-content {
            padding: 30px 20px 45px;
          }
        }

        @media (max-width: 650px) {
          .category-grid {
            grid-template-columns: 1fr;
          }

          .category-profile-name,
          .category-chevron {
            display: none;
          }
        }
      `}</style>

      <header className="category-topbar">
        <div className="category-title-block">
          <h2>Email Categories</h2>
          <p>Smart Email Security – BCA Project</p>
        </div>

        <div className="category-top-actions">
          <button
            className="category-notification"
            type="button"
            aria-label="Notifications"
          >
            <Bell size={20} />

            <span className="category-notification-badge">
              3
            </span>
          </button>

          <div className="category-profile">
            <div className="category-avatar">AK</div>

            <span className="category-profile-name">
              Arjun Kumar
            </span>

            <span className="category-chevron">
              ⌄
            </span>
          </div>
        </div>
      </header>

      <div className="category-content">
        <section className="category-intro">
          <h1>Email Categories</h1>

          <p>
            Emails are automatically classified into 9
            categories by PhishShield AI using NLP and ML.
          </p>
        </section>

        <section className="category-grid">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected =
              selectedCategory === category.name;

            return (
              <button
                key={category.name}
                type="button"
                className={`category-card ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() =>
                  setSelectedCategory(category.name)
                }
                aria-pressed={isSelected}
              >
                <div>
                  <div
                    className={`category-icon ${category.className}`}
                  >
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
                    {category.count === 1
                      ? "1 email"
                      : `${category.count} emails`}
                  </span>

                  <span
                    className={`category-count ${category.className}`}
                  >
                    {category.count}
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        <section className="category-ai-info">
          <div className="category-ai-icon">
            <CheckCircle2 size={18} />
          </div>

          <div className="category-ai-text">
            <strong>PhishShield AI</strong>{" "}
            classifies emails in real-time using an NLP
            pipeline and multi-class ML model. Category
            counts shown above are currently placeholders
            and will be connected to the email
            categorization model later.
          </div>
        </section>
      </div>

      <button
        className="category-help"
        type="button"
        aria-label="Help"
      >
        ?
      </button>
    </main>
  );
}

export default Categories;