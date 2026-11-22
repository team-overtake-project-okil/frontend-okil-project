import type { MobilityAnchor } from "./mobilityAnchors";

export type MobilityPresetPoint = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
};
export type MobilityPreset = {
  id: string;
  title: string;
  description: string;
  kind: "study" | "city" | "travel";
  points: readonly MobilityPresetPoint[];
};

// Campus addresses checked against the institutions' directories on 2026-11-22.
// Coordinates resolved with Geoapify and checked against the Lviv city boundary.
// https://lpnu.ua/adresy-korpusiv
// https://lnu.edu.ua/structure/faculties/
// https://www.lnulibrary.lviv.ua/about/departments/lb-edu/
// https://events.ucu.org.ua/about
// https://new.meduniv.lviv.ua/pidrozdily/stomatologichnyj-medychnyj-tsentr/
// https://lviv.travel/ua/places/attractions/vezha-ratushi
// https://www.cpk.lviv.ua/contact/
export const mobilityPresets: readonly MobilityPreset[] = [
  {
    id: "polytechnic",
    title: "Студент Політехніки",
    kind: "study",
    description: "Головний та 4-й навчальний корпуси",
    points: [
      {
        id: "main",
        label: "Політехніка · головний корпус",
        address: "вул. Степана Бандери, 12",
        lat: 49.8354222,
        lng: 24.0141767,
      },
      {
        id: "building-4",
        label: "Політехніка · 4-й корпус",
        address: "вул. Митрополита Андрея, 5",
        lat: 49.836856,
        lng: 24.0112871,
      },
    ],
  },
  {
    id: "franko",
    title: "Студент Франка",
    kind: "study",
    description: "Головний корпус, фізичний факультет і бібліотека",
    points: [
      {
        id: "main",
        label: "ЛНУ · головний корпус",
        address: "вул. Університетська, 1",
        lat: 49.8402167,
        lng: 24.0222881,
      },
      {
        id: "physics",
        label: "ЛНУ · фізичний факультет",
        address: "вул. Кирила і Мефодія, 8",
        lat: 49.8318805,
        lng: 24.0300819,
      },
      {
        id: "library",
        label: "ЛНУ · наукова бібліотека",
        address: "вул. Михайла Драгоманова, 5",
        lat: 49.8341112,
        lng: 24.0306256,
      },
    ],
  },
  {
    id: "ucu",
    title: "Студент УКУ",
    kind: "study",
    description: "Кампуси на Козельницькій та Свєнціцького",
    points: [
      {
        id: "kozelnytska",
        label: "УКУ · Козельницька",
        address: "вул. Козельницька, 2А",
        lat: 49.8170878,
        lng: 24.023469,
      },
      {
        id: "sventsitskoho",
        label: "УКУ · Свєнціцького",
        address: "вул. Іларіона Свєнціцького, 17",
        lat: 49.8230992,
        lng: 24.0375259,
      },
    ],
  },
  {
    id: "medical",
    title: "Студент медичного",
    kind: "study",
    description: "Головний корпус і стоматологічний центр",
    points: [
      {
        id: "main",
        label: "ЛНМУ · головний корпус",
        address: "вул. Пекарська, 69",
        lat: 49.8359823,
        lng: 24.0486606,
      },
      {
        id: "dentistry",
        label: "ЛНМУ · стоматологічний центр",
        address: "вул. Пекарська, 69А",
        lat: 49.8364325,
        lng: 24.0492764,
      },
    ],
  },
  {
    id: "center",
    title: "Часто в центрі",
    kind: "city",
    description: "Площа Ринок, Оперний і палац Потоцьких",
    points: [
      {
        id: "rynok",
        label: "Площа Ринок · Ратуша",
        address: "пл. Ринок, 1",
        lat: 49.8416393,
        lng: 24.0318273,
      },
      {
        id: "opera",
        label: "Оперний театр",
        address: "просп. Свободи, 28",
        lat: 49.8440297,
        lng: 24.0262455,
      },
      {
        id: "potocki",
        label: "Палац Потоцьких",
        address: "вул. Миколая Коперника, 15",
        lat: 49.837953,
        lng: 24.0269294,
      },
    ],
  },
  {
    id: "travel",
    title: "Часто подорожую",
    kind: "travel",
    description: "Головний залізничний вокзал і Стрийський автовокзал",
    points: [
      {
        id: "railway",
        label: "Головний залізничний вокзал",
        address: "пл. Двірцева, 1",
        lat: 49.8402561,
        lng: 23.9947888,
      },
      {
        id: "bus",
        label: "Автовокзал «Стрийський»",
        address: "вул. Стрийська, 109",
        lat: 49.7867744,
        lng: 24.0164431,
      },
    ],
  },
];

export function presetAnchors(preset: MobilityPreset): MobilityAnchor[] {
  return preset.points.map((point) => ({
    ...point,
    id: `preset:${preset.id}:${point.id}`,
    source: "preset",
  }));
}
