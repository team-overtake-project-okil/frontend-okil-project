import ArrowUpRight from "../icons/arrow-up-right";
import { scrollToSection } from "../lib/scroll";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

const faq = [
  {
    value: "score",
    question: "Що означає оцінка від 0 до 100?",
    answer:
      "Це індекс інфраструктури ділянки за доступними даними та вашими пріоритетами. Він допомагає досліджувати місто, але не оцінює житло чи конкретну квартиру",
  },
  {
    value: "weights",
    question: "Коли застосовуються мої пріоритети?",
    answer:
      "Змініть ваги або вимкніть необов’язкові категорії, потім натисніть «Застосувати». Після цього сервіс оновить оцінки на карті й деталізацію вибраної ділянки",
  },
  {
    value: "transport",
    question: "Що показує транспортний шар?",
    answer:
      "Маршрути громадського транспорту із зупинкою у вибраній ділянці. Увімкніть «Маршрути транспорту» та натисніть на гексагон",
  },
  {
    value: "details",
    question: "Як розглянути оцінку докладніше?",
    answer:
      "Виберіть гексагон, відкрийте «Докладніше про оцінку» й порівняйте категорії. Кожна категорія також має окреме розгортання для пояснення, коли воно доступне",
  },
] as const;

const steps = [
  {
    title: "Знайдіть адресу",
    text: "Вулиця й номер будинку або точка на карті — оберіть, звідки почати",
  },
  {
    title: "Визначте важливе",
    text: "Транспорт, освіта чи відпочинок? Налаштуйте пріоритети під свій ритм",
  },
  {
    title: "Побачте свій окіл",
    text: "Розгляньте загальну оцінку, її складові та маршрути поруч",
  },
] as const;

export const Info = () => (
  <div id="info" className="info-section">
    <div className="journey-head">
      <div>
        <div className="text-block eyebrow uppercase">як це працює</div>

        <div role="heading" aria-level={2} className="heading-2">
          Місто в деталях, рішення — за вами
        </div>
      </div>

      <button
        className="journey-cta"
        type="button"
        onClick={() => scrollToSection("map")}
      >
        Дослідити карту
        <ArrowUpRight strokeWidth={2} className="size-4" aria-hidden="true" />
      </button>
    </div>
    <div className="journey">
      {steps.map(({ title, text }, index) => (
        <div className="journey-step" key={title}>
          <div className="journey-number">0{index + 1}</div>

          <div className="journey-copy">
            <div role="heading" aria-level={3} className="heading-3">
              {title}
            </div>

            <div className="text-block">{text}</div>
          </div>
        </div>
      ))}
    </div>

    <div className="info-explainer">
      <div className="info-explainer-copy">
        <div className="text-block eyebrow uppercase">від даних до рішення</div>

        <div role="heading" aria-level={3} className="heading-3">
          Одна карта
          <br />
          Ваші власні критерії
        </div>

        <div className="info-explainer-lead">
          Гексагони — це ділянки міста, для яких сервіс об’єднує оцінки
          інфраструктури. Виберіть адресу, змініть важливість категорій і
          подивіться, як зміниться загальна оцінка
        </div>
      </div>
      <Accordion className="info-faq">
        {faq.map((item) => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger className="rounded-none py-0 hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="faq-answer text-block">{item.answer}</div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
    <div className="text-block method-note">
      В основі — відкриті дані та сітка H3. Індекс від 0 до 100 допомагає
      оцінити інфраструктуру, але не замінює знайомство з районом
    </div>
  </div>
);
