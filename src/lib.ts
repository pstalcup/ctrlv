import { Args } from "grimoire-kolmafia";
import { Monster } from "kolmafia";
import { $monster } from "libram";

export const args = Args.create("evento", "run daily flags before a world event", {
  diet: Args.boolean({ help: "Consume an adventure maximizing diet", default: true }),
  copy: Args.boolean({
    help: "Copy monsters (will not spendy adventures unless turns is true)",
    default: true,
  }),
  target: Args.custom<Monster>(
    {
      key: "target",
      help: "Which monster to copy (will raise an error if the monster is not FREE and turns is false)",
      default: $monster`Witchess knight`,
    },
    (value: string) => Monster.get(value),
    "MONSTER"
  ),
  ascend: Args.flag({
    key: "ascend",
    help: "Allow the script to do things that can be reversed by ascending",
    default: false,
  }),
  turns: Args.flag({
    key: "turns",
    help: "Allow the script to burn turns for some actions",
    default: false,
  }),
  voa: Args.number({
    setting: "valueOfAdventure",
    help: "When computing diet, how much to value each adventure",
    default: 1000,
  }),
  stomach: Args.number({
    help: "The maximum stomach to use",
    default: 15,
  }),
  liver: Args.number({
    help: "The maximum liver to use",
    default: 15,
  }),
  spleen: Args.number({
    help: "The maximum spleen to use",
    default: 15,
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
