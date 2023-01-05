import { Args } from "grimoire-kolmafia";
import {
  fullnessLimit,
  inebrietyLimit,
  isDarkMode,
  Monster,
  myFamiliar,
  myInebriety,
  spleenLimit,
} from "kolmafia";
import { $familiar, $monster, get, SongBoom } from "libram";

export function inebrietyLimitNoFamiliar() {
  return inebrietyLimit() - (myFamiliar() === $familiar`Stooper` ? 1 : 0);
}

export const FREE_FIGHT_SOURCES = [
  "kramco",
  "goth",
  "hipster",
  "witchess",
  "wish",
  "tentacle",
  "default",
] as const;
export type FreeFightSource = typeof FREE_FIGHT_SOURCES[number];
export function isFreeFightSource(value: string): value is FreeFightSource {
  return FREE_FIGHT_SOURCES.includes(value as FreeFightSource);
}

export const args = Args.create("evento", "run daily flags before a world event", {
  diet: Args.boolean({ help: "Consume an adventure maximizing diet", default: true }),
  copy: Args.boolean({
    help: "Copy monsters (will not spendy adventures unless turns is true)",
    default: true,
  }),
  ascend: Args.flag({
    key: "ascend",
    help: "Allow the script to do things that can be reversed by ascending",
    default: false,
  }),

  copyOptions: Args.group("copy", {
    target: Args.custom<Monster>(
      {
        key: "target",
        help: "Which FREE monster to copy",
        default: $monster`eldritch tentacle`,
      },
      (value: string) => Monster.get(value),
      "MONSTER"
    ),
    freefightsource: Args.custom<FreeFightSource>(
      {
        key: "source",
        help: "How to start your freefight",
        options: [
          ["default", "Use the best guess based on what you have and the assigned target"],
          ["hipster", "Ignore the target monster and always try to fight a random hipster monster"],
          [
            "goth",
            "Ignore the target monster and always try to fight a random black crayon monster",
          ],
          [
            "witchess",
            "Use your witchess board, choosing the target monster if it is witchess otherwise ignoring it and picking the most valueable monster",
          ],
          ["wish", "Use a pocket wish to fight the monster, even if you may have better sources"],
          [
            "tentacle",
            "Either visit Dr. Stuart or cast Evoke Eldritch Horror or drink a Eldritch Elixir",
          ],
        ],
      },
      (value: string) => (isFreeFightSource(value) ? (value as FreeFightSource) : undefined),
      "STRING"
    ),
  }),
  dietOptions: Args.group("diet", {
    simulate: Args.boolean({ help: "simulate the diet", default: true }),
    voa: Args.number({
      setting: "valueOfAdventure",
      help: "When computing diet, how much to value each adventure",
      default: 1000,
    }),
    stomach: Args.number({
      help: "The maximum stomach to use",
      default: fullnessLimit(),
    }),
    liver: Args.number({
      help: "The maximum liver to use",
      default: inebrietyLimitNoFamiliar(),
    }),
    spleen: Args.number({
      help: "The maximum spleen to use",
      default: spleenLimit(),
    }),
    nightcap: Args.flag({
      help: "Overdrink (will raise an error if you are not at max liver)",
      default: false,
    }),
  }),
});

export function maxBy<T>(
  array: T[] | readonly T[],
  optimizer: (element: T) => number,
  reverse?: boolean
): T;
export function maxBy<S extends string | number | symbol, T extends { [x in S]: number }>(
  array: T[] | readonly T[],
  key: S,
  reverse?: boolean
): T;
export function maxBy<S extends string | number | symbol, T extends { [x in S]: number }>(
  array: T[] | readonly T[],
  optimizer: ((element: T) => number) | S,
  reverse = false
): T {
  if (typeof optimizer === "function") {
    return maxBy(
      array.map((key) => ({ key, value: optimizer(key) })),
      "value",
      reverse
    ).key;
  } else {
    return array.reduce((a, b) => (a[optimizer] > b[optimizer] !== reverse ? a : b));
  }
}

export const HIGHLIGHT = isDarkMode() ? "yellow" : "blue";

export function sober() {
  return myInebriety() <= inebrietyLimit() + (myFamiliar() === $familiar`Stooper` ? -1 : 0);
}

export type RealmType = "spooky" | "stench" | "hot" | "cold" | "sleaze" | "fantasy" | "pirate";
export function realmAvailable(identifier: RealmType): boolean {
  if (identifier === "fantasy") {
    return get(`_frToday`) || get(`frAlways`);
  } else if (identifier === "pirate") {
    return get(`_prToday`) || get(`prAlways`);
  }
  return get(`_${identifier}AirportToday`, false) || get(`${identifier}AirportAlways`, false);
}
