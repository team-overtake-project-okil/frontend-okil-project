import ArrowUpRight from "../icons/arrow-up-right";
import Database from "../icons/circle-stack";
import MapPinned from "../icons/map-pin";
const principles = [
  {
    kicker: "Підхід",
    title: "Відкриті дані, зрозуміла карта",
    text: "Об’єднуємо міську інфраструктуру в гексагональну сітку H3. Досліджуйте ділянки й переглядайте складові їхніх оцінок.",
  },
  {
    kicker: "Ваш вибір",
    title: "Пріоритети визначаєте ви",
    text: "Налаштовуйте важливість категорій під власні потреби. Оцінка допомагає ставити запитання про район і порівнювати його можливості.",
  },
  {
    kicker: "Команда",
    title: "Створюємо OKIL разом",
    text: "Команда Overtake · IT Garage від SoftServe. Працюємо над тим, щоб дослідження міста було простішим і наочнішим.",
  },
] as const;

export const Footer = () => (
  <>
    <div id="footer" className="about-section">
      <div className="about-layout">
        <div className="about-intro">
          <div className="text-block eyebrow">ПРО ПРОЄКТ</div>
          <div role="heading" aria-level={2} className="heading-2">
            Окіл — усе важливе поруч
          </div>
          <div className="text-block">
            Ми створюємо інструмент, який допомагає краще зрозуміти місто перед
            вибором місця для життя. У кожного свій ритм: комусь важливий
            транспорт, комусь — повсякденні послуги, освіта чи відпочинок
          </div>
        </div>
        <div className="about-principles cursor-default">
          {principles.map(({ kicker, title, text }, index) => (
            <div className="about-principle" key={kicker}>
              <div className="about-index" aria-hidden="true">
                0{index + 1}
              </div>

              <div className="about-principle-copy">
                <div role="heading" aria-level={3} className="heading-3">
                  {title}
                </div>

                <div className="text-block">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="project-sources">
        <div className="sources-intro">
          <div className="text-block eyebrow uppercase">
            звідки ми знаємо, що поруч
          </div>

          <div role="heading" aria-level={3} className="heading-3">
            За кожним гексагоном — дані
          </div>

          <div className="text-block">
            Різні джерела доповнюють одне одного: від зупинок і укриттів до
            пошуку конкретної адреси
          </div>
        </div>
        <div className="source-groups flex items-baseline-last">
          <div className="source-group">
            <div className="source-label">
              <Database className="size-4" aria-hidden="true" />
              Дані про місто
            </div>
            {[
              [
                "EasyWay · GTFS",
                "Зупинки, маршрути та геометрія транспортної мережі",
                "https://www.eway.in.ua/",
              ],
              [
                "Львівська міська рада",
                "Переліки найпростіших укриттів і захисних споруд",
                "https://city-adm.lviv.ua/",
              ],
              [
                "Google Maps · SerpAPI",
                "Дані про аптеки, які завантажуємо через SerpAPI",
                "https://serpapi.com/google-maps-api",
              ],
              [
                "OpenStreetMap",
                "Межа міста для гексагональної сітки; також серед даних картографічної основи",
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
                <div className="source-copy">
                  <span className="source-name">{name}</span>
                  <span className="source-description">{description}</span>
                </div>
                <ArrowUpRight
                  width={15}
                  height={15}
                  style={{ width: 15, height: 15 }}
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
          <div className="source-group">
            <div className="source-label">
              <MapPinned className="size-4" aria-hidden="true" />
              Карта й пошук
            </div>
            {[
              [
                "Visicom",
                "Підказки назв вулиць і адрес під час введення",
                "https://api.visicom.ua/",
              ],
              [
                "Geoapify",
                "Визначення координат вибраної адреси",
                "https://www.geoapify.com/",
              ],
              [
                "Mapbox",
                "Картографічна основа та взаємодія з мапою",
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
                <div className="source-copy">
                  <span className="source-name">{name}</span>
                  <span className="source-description">{description}</span>
                </div>
                <ArrowUpRight
                  width={15}
                  height={15}
                  style={{ width: 15, height: 15 }}
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </div>
        <div className="source-method">
          <div className="text-block">
            Об’єднуємо дані за допомогою{" "}
            <a
              href="https://h3geo.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              сітки H3
            </a>{" "}
            — спільних гексагональних ділянок міста. Карта доповнює знайомство з
            районом; повнота відкритих даних може відрізнятися між категоріями
            та ділянками
          </div>
        </div>
      </div>
    </div>
    <div className="project-credits">
      <div className="inline-text">OKIL · Ваш ритм · Ваш окіл</div>
      <div className="inline-text">Overtake · IT Garage від SoftServe</div>
    </div>
  </>
);
