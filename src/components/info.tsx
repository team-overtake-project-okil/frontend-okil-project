import {
  Search,
  SlidersHorizontal,
  ChartNoAxesCombined,
  ArrowUpRight,
} from "lucide-react";
import { scrollToSection } from "../lib/scroll";
export const Info = () => (
  <section id="info" className="info-section">
    <p className="eyebrow">ЯК ЦЕ ПРАЦЮЄ</p>
    <h2>Місто в деталях, рішення — за вами.</h2>
    <div className="journey">
      <ol className="journey-steps">
        {[
          {
            title: "Знайдіть адресу",
            text: "Вулиця й номер будинку або точка на карті — оберіть, звідки почати.",
            Icon: Search,
          },
          {
            title: "Визначте важливе",
            text: "Транспорт, освіта чи відпочинок? Налаштуйте пріоритети під свій ритм.",
            Icon: SlidersHorizontal,
          },
          {
            title: "Побачте свій окіл",
            text: "Розгляньте загальну оцінку, її складові та маршрути поруч.",
            Icon: ChartNoAxesCombined,
          },
        ].map(({ title, text, Icon }, index) => (
          <li className="journey-step" key={title}>
            <div className="journey-top">
              <span className="journey-icon">
                <Icon size={23} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span className="journey-number">0{index + 1}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
          </li>
        ))}
      </ol>
      <div className="journey-bottom">
        <span>Від адреси до розуміння району.</span>
        <button type="button" onClick={() => scrollToSection("map")}>
          Дослідити карту <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
    <div className="info-explainer">
      <div>
        <p className="eyebrow">ВІД ДАНИХ ДО РІШЕННЯ</p>
        <h3>Одна карта. Ваші власні критерії.</h3>
        <p>
          Гексагони — це ділянки міста, для яких сервіс об’єднує оцінки
          інфраструктури. Виберіть адресу, змініть важливість категорій і
          подивіться, як зміниться загальна оцінка.
        </p>
      </div>
      <div className="info-faq">
        {[
          [
            "Що означає оцінка від 0 до 100?",
            "Це індекс інфраструктури ділянки за доступними даними та вашими пріоритетами. Він допомагає досліджувати місто, але не оцінює житло чи конкретну квартиру.",
          ],
          [
            "Коли застосовуються мої пріоритети?",
            "Змініть ваги або вимкніть необов’язкові категорії, потім натисніть «Застосувати». Після цього сервіс оновить оцінки на карті й деталізацію вибраної ділянки.",
          ],
          [
            "Що показує транспортний шар?",
            "Маршрути громадського транспорту із зупинкою у вибраній ділянці. Увімкніть «Маршрути транспорту» та натисніть на гексагон.",
          ],
          [
            "Як розглянути оцінку докладніше?",
            "Виберіть гексагон, відкрийте «Докладніше про оцінку» й порівняйте категорії. Кожна категорія також має окреме розгортання для пояснення, коли воно доступне.",
          ],
        ].map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </div>
    <p className="method-note">
      В основі — відкриті дані та сітка H3. Індекс від 0 до 100 допомагає
      оцінити інфраструктуру, але не замінює знайомство з районом.
    </p>
  </section>
);
