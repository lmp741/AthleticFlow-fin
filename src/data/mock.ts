export type Sport = "Футбол" | "Баскетбол" | "Волейбол" | "Теннис";
export type Level = "Новичок" | "Любитель" | "Полупрофи" | "Профи";

export interface Stadium {
  id: string;
  name: string;
  address: string;
  city: string;
  cover: string;
  sports: Sport[];
  pricePerHour: number;
  rating: number;
}

export interface Game {
  id: string;
  stadiumId: string;
  stadiumName: string;
  address: string;
  sport: Sport;
  level: Level;
  date: string;
  timeStart: string;
  timeEnd: string;
  pricePerPlayer: number;
  slotsTotal: number;
  slotsTaken: number;
  organizer: string;
}

export const stadiums: Stadium[] = [
  {
    id: "lokomotiv",
    name: 'Стадион "Локомотив"',
    address: "Москва, Большая Черкизовская, 125, стр. 1",
    city: "Москва",
    cover: "from-[#1e3a8a] to-[#06b6d4]",
    sports: ["Футбол"],
    pricePerHour: 5000,
    rating: 4.8,
  },
  {
    id: "luzhniki",
    name: 'СК "Лужники"',
    address: "Москва, Лужники, 24",
    city: "Москва",
    cover: "from-[#2563eb] to-[#22d3ee]",
    sports: ["Футбол", "Теннис"],
    pricePerHour: 6500,
    rating: 4.9,
  },
  {
    id: "krylatskoe",
    name: 'Арена "Крылатское"',
    address: "Москва, ул. Крылатская, 10",
    city: "Москва",
    cover: "from-[#1e40af] to-[#0ea5e9]",
    sports: ["Футбол", "Баскетбол"],
    pricePerHour: 4200,
    rating: 4.6,
  },
  {
    id: "sokolniki",
    name: 'Парк "Сокольники"',
    address: "Москва, Сокольнический Вал, 1",
    city: "Москва",
    cover: "from-[#0f766e] to-[#22d3ee]",
    sports: ["Футбол", "Волейбол"],
    pricePerHour: 3500,
    rating: 4.5,
  },
];

export const games: Game[] = [
  {
    id: "g1",
    stadiumId: "lokomotiv",
    stadiumName: 'Стадион "Локомотив"',
    address: "Москва, Большая Черкизовская, 125, стр. 1",
    sport: "Футбол",
    level: "Любитель",
    date: "Сегодня",
    timeStart: "15:00",
    timeEnd: "17:00",
    pricePerPlayer: 500,
    slotsTotal: 10,
    slotsTaken: 5,
    organizer: "Александр",
  },
  {
    id: "g2",
    stadiumId: "luzhniki",
    stadiumName: 'СК "Лужники"',
    address: "Москва, Лужники, 24",
    sport: "Футбол",
    level: "Полупрофи",
    date: "Завтра",
    timeStart: "19:00",
    timeEnd: "20:30",
    pricePerPlayer: 700,
    slotsTotal: 12,
    slotsTaken: 9,
    organizer: "Дмитрий",
  },
  {
    id: "g3",
    stadiumId: "krylatskoe",
    stadiumName: 'Арена "Крылатское"',
    address: "Москва, ул. Крылатская, 10",
    sport: "Футбол",
    level: "Новичок",
    date: "Сегодня",
    timeStart: "20:00",
    timeEnd: "21:30",
    pricePerPlayer: 450,
    slotsTotal: 10,
    slotsTaken: 4,
    organizer: "Иван",
  },
  {
    id: "g4",
    stadiumId: "sokolniki",
    stadiumName: 'Парк "Сокольники"',
    address: "Москва, Сокольнический Вал, 1",
    sport: "Футбол",
    level: "Любитель",
    date: "Сб, 9 мая",
    timeStart: "11:00",
    timeEnd: "13:00",
    pricePerPlayer: 400,
    slotsTotal: 14,
    slotsTaken: 6,
    organizer: "Сергей",
  },
  {
    id: "g5",
    stadiumId: "lokomotiv",
    stadiumName: 'Стадион "Локомотив"',
    address: "Москва, Большая Черкизовская, 125, стр. 1",
    sport: "Футбол",
    level: "Профи",
    date: "Вс, 10 мая",
    timeStart: "18:00",
    timeEnd: "19:30",
    pricePerPlayer: 800,
    slotsTotal: 10,
    slotsTaken: 10,
    organizer: "Михаил",
  },
];
