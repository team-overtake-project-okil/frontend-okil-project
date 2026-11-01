import ArrowUpRight from "../icons/arrow-up-right";
import Database from "../icons/circle-stack";
import MapPinned from "../icons/map-pin";
export const Footer = () => (
  <>
    <section id="footer" className="about-section">
      <div className="about-intro">
        <div className="text-block eyebrow">ПРО ПРОЄКТ</div>
        <div role="heading" aria-level={2} className="heading-2">
          Окіл — усе важливе поруч.
        </div>
        <div className="text-block">
          Ми створюємо інструмент, який допомагає краще зрозуміти місто перед
          вибором місця для життя. У кожного свій ритм: комусь важливий
          транспорт, комусь — повсякденні послуги, освіта чи відпочинок.
        </div>
      </div>
      <div className="about-grid">
        <div className="content-card">
          <div className="inline-text">01 / ПІДХІД</div>
          <div role="heading" aria-level={3} className="heading-3">
            Відкриті дані, зрозуміла карта
          </div>
          <div className="text-block">
            Об’єднуємо міську інфраструктуру в гексагональну сітку H3.
            Досліджуйте ділянки й переглядайте складові їхніх оцінок.
          </div>
        </div>
        <div className="content-card">
          <div className="inline-text">02 / ВАШ ВИБІР</div>
          <div role="heading" aria-level={3} className="heading-3">
            Пріоритети визначаєте ви
          </div>
          <div className="text-block">
            Налаштовуйте важливість категорій під власні потреби. Оцінка
            допомагає ставити запитання про район і порівнювати його можливості.
          </div>
        </div>
        <div className="content-card">
          <div className="inline-text">03 / КОМАНДА</div>
          <div role="heading" aria-level={3} className="heading-3">
            Створюємо OKIL разом
          </div>
          <div className="text-block">
            Команда Overtake · IT Garage від SoftServe. Працюємо над тим, щоб
            дослідження міста було простішим і наочнішим.
          </div>
        </div>
      </div>
      <div className="project-sources">
        <div className="sources-intro">
          <div className="text-block eyebrow">ЗВІДКИ МИ ЗНАЄМО, ЩО ПОРУЧ</div>
          <div role="heading" aria-level={3} className="heading-3">
            За кожним гексагоном — дані.
          </div>
          <div className="text-block">
            Різні джерела доповнюють одне одного: від зупинок і укриттів до
            пошуку конкретної адреси.
          </div>
        </div>
        <div className="source-groups">
          <div className="source-group">
            <h4>
              <Database width={16} height={16} style={{ width: 16, height: 16 }} aria-hidden="true" /> Дані про
              місто
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
                <div className="inline-text">
                  <strong>{name}</strong>
                  <small>{description}</small>
                </div>
                <ArrowUpRight width={15} height={15} style={{ width: 15, height: 15 }} aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="source-group">
            <h4>
              <MapPinned width={16} height={16} style={{ width: 16, height: 16 }} aria-hidden="true" /> Карта й
              пошук
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
                <div className="inline-text">
                  <strong>{name}</strong>
                  <small>{description}</small>
                </div>
                <ArrowUpRight width={15} height={15} style={{ width: 15, height: 15 }} aria-hidden="true" />
              </a>
            ))}
            <div className="text-block source-method">
              Об’єднуємо дані за допомогою{" "}
              <a
                href="https://h3geo.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                сітки H3 ↗
              </a>{" "}
              — спільних гексагональних ділянок міста.
            </div>
          </div>
        </div>
      </div>
      <div className="text-block about-note">
        Карта доповнює знайомство з районом. Повнота відкритих даних може
        відрізнятися між категоріями та ділянками.
      </div>
    </section>
    <footer className="project-credits">
      <div className="inline-text">OKIL · Ваш ритм. Ваш окіл.</div>
      <div className="inline-text">Overtake · IT Garage від SoftServe</div>
    </footer>
  </>
);
