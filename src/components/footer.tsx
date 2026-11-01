import { ArrowUpRight, Database, MapPinned } from "lucide-react";
export const Footer = () => (
  <>
    <section id="footer" className="about-section">
      <div className="about-intro">
        <p className="eyebrow">ПРО ПРОЄКТ</p>
        <h2>Окіл — усе важливе поруч.</h2>
        <p>
          Ми створюємо інструмент, який допомагає краще зрозуміти місто перед
          вибором місця для життя. У кожного свій ритм: комусь важливий
          транспорт, комусь — повсякденні послуги, освіта чи відпочинок.
        </p>
      </div>
      <div className="about-grid">
        <article>
          <span>01 / ПІДХІД</span>
          <h3>Відкриті дані, зрозуміла карта</h3>
          <p>
            Об’єднуємо міську інфраструктуру в гексагональну сітку H3.
            Досліджуйте ділянки й переглядайте складові їхніх оцінок.
          </p>
        </article>
        <article>
          <span>02 / ВАШ ВИБІР</span>
          <h3>Пріоритети визначаєте ви</h3>
          <p>
            Налаштовуйте важливість категорій під власні потреби. Оцінка
            допомагає ставити запитання про район і порівнювати його можливості.
          </p>
        </article>
        <article>
          <span>03 / КОМАНДА</span>
          <h3>Створюємо OKIL разом</h3>
          <p>
            Команда Overtake · IT Garage від SoftServe. Працюємо над тим, щоб
            дослідження міста було простішим і наочнішим.
          </p>
        </article>
      </div>
      <div className="project-sources">
        <div className="sources-intro">
          <p className="eyebrow">ЗВІДКИ МИ ЗНАЄМО, ЩО ПОРУЧ</p>
          <h3>За кожним гексагоном — дані.</h3>
          <p>
            Різні джерела доповнюють одне одного: від зупинок і укриттів до
            пошуку конкретної адреси.
          </p>
        </div>
        <div className="source-groups">
          <div className="source-group">
            <h4>
              <Database size={16} aria-hidden="true" /> Дані про місто
            </h4>
            {[
              [
                "EasyWay · GTFS",
                "Зупинки, маршрути та геометрія транспортної мережі.",
                "https://www.eway.in.ua/",
              ],
              [
                "Львівська міська рада",
                "Переліки найпростіших укриттів і захисних споруд.",
                "https://city-adm.lviv.ua/",
              ],
              [
                "Google Maps · SerpAPI",
                "Дані про аптеки, які завантажуємо через SerpAPI.",
                "https://serpapi.com/google-maps-api",
              ],
              [
                "OpenStreetMap",
                "Межа міста для гексагональної сітки; також серед даних картографічної основи.",
                "https://www.openstreetmap.org/relation/2032280",
              ],
            ].map(([name, description, url]) => (
              <a
                className="source-row"
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="source-group">
            <h4>
              <MapPinned size={16} aria-hidden="true" /> Карта й пошук
            </h4>
            {[
              [
                "Visicom",
                "Підказки назв вулиць і адрес під час введення.",
                "https://api.visicom.ua/",
              ],
              [
                "Geoapify",
                "Визначення координат вибраної адреси.",
                "https://www.geoapify.com/",
              ],
              [
                "Mapbox",
                "Картографічна основа та взаємодія з мапою.",
                "https://www.mapbox.com/",
              ],
            ].map(([name, description, url]) => (
              <a
                className="source-row"
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  <strong>{name}</strong>
                  <small>{description}</small>
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            ))}
            <p className="source-method">
              Об’єднуємо дані за допомогою{" "}
              <a
                href="https://h3geo.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                сітки H3 ↗
              </a>{" "}
              — спільних гексагональних ділянок міста.
            </p>
          </div>
        </div>
      </div>
      <p className="about-note">
        Карта доповнює знайомство з районом. Повнота відкритих даних може
        відрізнятися між категоріями та ділянками.
      </p>
    </section>
    <footer className="project-credits">
      <span>OKIL · Ваш ритм. Ваш окіл.</span>
      <span>Overtake · IT Garage від SoftServe</span>
    </footer>
  </>
);
