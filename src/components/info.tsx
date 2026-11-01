import Search from "../icons/magnifying-glass";
import SlidersHorizontal from "../icons/adjustments-horizontal";
import ChartNoAxesCombined from "../icons/chart-bar";
import ArrowUpRight from "../icons/arrow-up-right";
import { scrollToSection } from "../lib/scroll";
export const Info = () => (
  <section id="info" className="info-section">
    <div className="text-block eyebrow">ЯК ЦЕ ПРАЦЮЄ</div>
    <div role="heading" aria-level={2} className="heading-2">
      Місто в деталях, рішення — за вами.
    </div>
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
              <div className="inline-text journey-icon">
                <Icon
                  width={23}
                  height={23} style={{ width: 23, height: 23 }}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <div className="inline-text journey-number">0{index + 1}</div>
            </div>
            <div role="heading" aria-level={3} className="heading-3">
              {title}
            </div>
            <div className="text-block">{text}</div>
          </li>
        ))}
      </ol>
      <div className="journey-bottom">
        <div className="inline-text">Від адреси до розуміння району.</div>
        <button type="button" onClick={() => scrollToSection("map")}>
          Дослідити карту{" "}
          <ArrowUpRight width={16} height={16} style={{ width: 16, height: 16 }} aria-hidden="true" />
        </button>
      </div>
    </div>
    <div className="info-explainer">
      <div>
        <div className="text-block eyebrow">ВІД ДАНИХ ДО РІШЕННЯ</div>
        <div role="heading" aria-level={3} className="heading-3">
          Одна карта. Ваші власні критерії.
        </div>
        <div className="text-block">
          Гексагони — це ділянки міста, для яких сервіс об’єднує оцінки
          інфраструктури. Виберіть адресу, змініть важливість категорій і
          подивіться, як зміниться загальна оцінка.
        </div>
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
            <div className="text-block">{answer}</div>
          </details>
        ))}
      </div>
    </div>
    <div className="text-block method-note">
      В основі — відкриті дані та сітка H3. Індекс від 0 до 100 допомагає
      оцінити інфраструктуру, але не замінює знайомство з районом.
    </div>
  </section>
);
