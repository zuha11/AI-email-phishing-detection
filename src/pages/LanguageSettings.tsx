import { useState } from "react";
import {
  Bell,
  Check,
  Globe2,
} from "lucide-react";

type LanguageOption = {
  code: string;
  name: string;
  nativeName: string;
};

const languages: LanguageOption[] = [
  {
    code: "GB",
    name: "English",
    nativeName: "English",
  },
  {
    code: "ES",
    name: "Spanish",
    nativeName: "Español",
  },
  {
    code: "FR",
    name: "French",
    nativeName: "Français",
  },
  {
    code: "DE",
    name: "German",
    nativeName: "Deutsch",
  },
  {
    code: "PT",
    name: "Portuguese",
    nativeName: "Português",
  },
  {
    code: "SA",
    name: "Arabic",
    nativeName: "العربية",
  },
  {
    code: "RU",
    name: "Russian",
    nativeName: "Русский",
  },
];

function LanguageSettings() {
  const [selectedLanguage, setSelectedLanguage] =
    useState("English");

  return (
    <main className="language-page">

      <style>{`
        .language-page {
          flex: 1;
          min-width: 0;
          min-height: 100vh;
          background: #f8f9fc;
          color: #202124;
          overflow-y: auto;
          font-family: inherit;
        }

        .language-page *,
        .language-page *::before,
        .language-page *::after {
          box-sizing: border-box;
        }

        /* TOP BAR */

        .language-topbar {
          height: 82px;
          background: #ffffff;
          border-bottom: 1px solid #e8e9ef;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 42px;
        }

        .language-title-block h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .language-title-block p {
          margin: 4px 0 0;
          color: #9a9ca7;
          font-size: 13px;
        }

        .language-top-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .language-notification {
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

        .language-notification-badge {
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

        .language-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .language-avatar {
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

        .language-profile-name {
          font-size: 14px;
          font-weight: 600;
        }

        .language-chevron {
          color: #8c8e98;
          font-size: 13px;
        }

        /* CONTENT */

        .language-content {
          max-width: 1180px;
          margin: 0 auto;
          padding: 34px 38px 50px;
        }

        .language-intro h1 {
          margin: 0;
          font-size: 25px;
          line-height: 1.2;
          font-weight: 750;
        }

        .language-intro p {
          margin: 9px 0 27px;
          max-width: 950px;
          color: #777985;
          font-size: 14px;
          line-height: 1.7;
        }

        /* LANGUAGE CARDS */

        .language-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .language-card {
          min-height: 112px;
          border: 1px solid #f0f0f3;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 5px 17px rgba(38, 35, 77, 0.035);
          display: flex;
          align-items: center;
          padding: 20px 24px;
          cursor: pointer;
          text-align: left;
          transition: 0.16s ease;
        }

        .language-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(38, 35, 77, 0.06);
        }

        .language-card.selected {
          border: 2px solid #8c52df;
          padding: 19px 23px;
          box-shadow: 0 8px 24px rgba(130, 79, 220, 0.08);
        }

        .language-code {
          width: 70px;
          flex: 0 0 70px;
          color: #16171b;
          font-size: 27px;
          font-weight: 500;
        }

        .language-names {
          min-width: 0;
          flex: 1;
        }

        .language-name {
          font-size: 17px;
          font-weight: 600;
          color: #24252b;
          margin-bottom: 4px;
        }

        .language-native {
          font-size: 15px;
          color: #777a86;
        }

        .language-radio {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid #e1e2e8;
          display: grid;
          place-items: center;
          flex: 0 0 30px;
          color: #ffffff;
        }

        .language-radio.checked {
          background: #9653df;
          border-color: #9653df;
        }

        /* PIPELINE */

        .language-pipeline {
          margin-top: 30px;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #eeeef4;
          box-shadow: 0 5px 17px rgba(38, 35, 77, 0.035);
          padding: 24px 28px 25px;
        }

        .pipeline-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #4b357d;
          font-size: 16px;
          font-weight: 700;
        }

        .pipeline-heading-icon {
          display: grid;
          place-items: center;
          color: #5f43a0;
        }

        .pipeline-text {
          margin: 14px 0 18px;
          color: #696b79;
          font-size: 13px;
          line-height: 1.8;
        }

        .pipeline-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .pipeline-tag {
          border-radius: 8px;
          padding: 7px 12px;
          background: #f1eafa;
          color: #6d4aa2;
          font-size: 12px;
          font-weight: 600;
        }

        /* SAVE BUTTON */

        .language-save {
          margin-top: 25px;
          border: 0;
          border-radius: 12px;
          padding: 14px 23px;
          background: linear-gradient(
            90deg,
            #6131c8,
            #376ed7
          );
          color: #ffffff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 7px 18px rgba(85, 71, 190, 0.18);
        }

        /* HELP */

        .language-help {
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

        @media (max-width: 850px) {

          .language-topbar {
            padding: 0 20px;
          }

          .language-content {
            padding: 28px 20px 45px;
          }

          .language-grid {
            grid-template-columns: 1fr;
          }

          .language-profile-name,
          .language-chevron {
            display: none;
          }
        }
      `}</style>

      {/* TOP BAR */}

      <header className="language-topbar">

        <div className="language-title-block">
          <h2>Language Settings</h2>
          <p>
            Smart Email Security – BCA Project
          </p>
        </div>

        <div className="language-top-actions">

          <button
            className="language-notification"
            type="button"
            aria-label="Notifications"
          >
            <Bell size={20} />

            <span className="language-notification-badge">
              3
            </span>
          </button>

          <div className="language-profile">

            <div className="language-avatar">
              AK
            </div>

            <span className="language-profile-name">
              Arjun Kumar
            </span>

            <span className="language-chevron">
              ⌄
            </span>

          </div>

        </div>

      </header>

      {/* MAIN CONTENT */}

      <div className="language-content">

        <section className="language-intro">

          <h1>
            Multilingual Email Processing
          </h1>

          <p>
            PhishShield AI Engine supports 7 languages
            natively with automatic detection, NLP
            analysis, and real-time translation.
          </p>

        </section>

        {/* LANGUAGE OPTIONS */}

        <section className="language-grid">

          {languages.map((language) => {

            const isSelected =
              selectedLanguage === language.name;

            return (
              <button
                key={language.name}
                type="button"
                className={`language-card ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() =>
                  setSelectedLanguage(language.name)
                }
                aria-pressed={isSelected}
              >

                <div className="language-code">
                  {language.code}
                </div>

                <div className="language-names">

                  <div className="language-name">
                    {language.name}
                  </div>

                  <div className="language-native">
                    {language.nativeName}
                  </div>

                </div>

                <div
                  className={`language-radio ${
                    isSelected ? "checked" : ""
                  }`}
                >

                  {isSelected && (
                    <Check size={17} />
                  )}

                </div>

              </button>
            );

          })}

        </section>

        {/* AI PIPELINE */}

        <section className="language-pipeline">

          <div className="pipeline-heading">

            <span className="pipeline-heading-icon">
              <Globe2 size={18} />
            </span>

            <span>
              PhishShield AI — Multilingual
              Processing Pipeline
            </span>

          </div>

          <p className="pipeline-text">
            The engine automatically detects the language
            of each incoming email, applies native-language
            NLP feature extraction, translates content for
            cross-lingual analysis, and runs ML
            classification trained on phishing patterns
            across all 7 supported languages.
          </p>

          <div className="pipeline-tags">

            <span className="pipeline-tag">
              Language Detection
            </span>

            <span className="pipeline-tag">
              NLP Translation
            </span>

            <span className="pipeline-tag">
              Feature Extraction
            </span>

            <span className="pipeline-tag">
              Cross-lingual ML
            </span>

          </div>

        </section>

        {/* SAVE */}

        <button
          className="language-save"
          type="button"
        >
          <Check size={16} />
          Save Language Preferences
        </button>

      </div>

      {/* HELP */}

      <button
        className="language-help"
        type="button"
        aria-label="Help"
      >
        ?
      </button>

    </main>
  );
}

export default LanguageSettings;