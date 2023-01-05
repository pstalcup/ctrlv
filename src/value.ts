import {
  autosellPrice,
  Coinmaster,
  historicalAge,
  historicalPrice,
  Item,
  sellPrice,
  toInt,
} from "kolmafia";
import { $item, $items, getSaleValue, sumNumbers } from "libram";

import { args } from "./lib";

function currency(...items: Item[]): () => number {
  const unitCost: [Item, number][] = items.map((i) => {
    const coinmaster = Coinmaster.all().find((c) => sellPrice(c, i) > 0);
    if (!coinmaster) {
      throw `Invalid coinmaster item ${i}`;
    } else {
      return [i, sellPrice(coinmaster, i)];
    }
  });
  return () => Math.max(...unitCost.map(([item, cost]) => value(item) / cost));
}

function complexCandy(): [Item, () => number][] {
  const candies = Item.all().filter((i) => i.candyType === "complex");
  const candyLookup: Item[][] = [[], [], [], [], []];

  for (const candy of candies) {
    const id = toInt(candy) % 5;
    if (candy.tradeable) {
      candyLookup[id].push(candy);
    }
  }
  const candyIdPrices: [Item, () => number][] = candies
    .filter((i) => !i.tradeable)
    .map((i) => [i, () => Math.min(...candyLookup[toInt(i) % 5].map((i) => value(i)))]);
  return candyIdPrices;
}

const specialValueLookup = new Map<Item, () => number>([
  [
    $item`Freddy Kruegerand`,
    currency(...$items`bottle of Bloodweiser, electric Kool-Aid, Dreadsylvanian skeleton key`),
  ],
  [$item`Beach Buck`, currency($item`one-day ticket to Spring Break Beach`)],
  [$item`Coinspiracy`, currency(...$items`Merc Core deployment orders, karma shawarma`)],
  [$item`FunFunds™`, currency($item`one-day ticket to Dinseylandfill`)],
  [$item`Volcoino`, currency($item`one-day ticket to That 70s Volcano`)],
  [$item`Wal-Mart gift certificate`, currency($item`one-day ticket to The Glaciest`)],
  [$item`Rubee™`, currency($item`FantasyRealm guest pass`)],
  [$item`Guzzlrbuck`, currency($item`Never Don't Stop Not Striving`)],
  ...complexCandy(),
  [$item`Merc Core deployment orders`, () => value($item`one-day ticket to Conspiracy Island`)],
  [
    $item`free-range mushroom`,
    () =>
      3 *
      Math.max(
        value($item`mushroom tea`) - value($item`soda water`),
        value($item`mushroom whiskey`) - value($item`fermenting powder`),
        value($item`mushroom filet`)
      ),
  ],
  [
    $item`little firkin`,
    () =>
      averageValue(
        ...$items`martini, screwdriver, strawberry daiquiri, margarita, vodka martini, tequila sunrise, bottle of Amontillado, barrel-aged martini, barrel gun`
      ),
  ],
  [
    $item`normal barrel`,
    () =>
      averageValue(
        ...$items`a little sump'm sump'm, pink pony, rockin' wagon, roll in the hay, slip 'n' slide, slap and tickle`
      ),
  ],
  [
    $item`big tun`,
    () =>
      averageValue(
        ...$items`gibson, gin and tonic, mimosette, tequila sunset, vodka and tonic, zmobie`
      ),
  ],
  [
    $item`weathered barrel`,
    () => averageValue(...$items`bean burrito, enchanted bean burrito, jumping bean burrito`),
  ],
  [
    $item`dusty barrel`,
    () =>
      averageValue(
        ...$items`spicy bean burrito, spicy enchanted bean burrito, spicy jumping bean burrito`
      ),
  ],
  [
    $item`disintegrating barrel`,
    () =>
      averageValue(
        ...$items`insanely spicy bean burrito, insanely spicy enchanted bean burrito, insanely spicy jumping bean burrito`
      ),
  ],
  [
    $item`moist barrel`,
    () =>
      averageValue(
        ...$items`cast, concentrated magicalness pill, enchanted barbell, giant moxie weed, Mountain Stream soda`
      ),
  ],
  [
    $item`rotting barrel`,
    () =>
      averageValue(
        ...$items`Doc Galaktik's Ailment Ointment, extra-strength strongness elixir, jug-o-magicalness, Marquis de Poivre soda, suntan lotion of moxiousness`
      ),
  ],
  [
    $item`mouldering barrel`,
    () =>
      averageValue(
        ...$items`creepy ginger ale, haunted battery, scroll of drastic healing, synthetic marrow, the funk`
      ),
  ],
  [
    $item`barnacled barrel`,
    () =>
      averageValue(
        ...$items`Alewife™ Ale, bazookafish bubble gum, beefy fish meat, eel battery, glistening fish meat, ink bladder, pufferfish spine, shark cartilage, slick fish meat, slug of rum, slug of shochu, slug of vodka, temporary teardrop tattoo`
      ),
  ],
  [$item`fake hand`, () => 50000],
  [$item`magical sausage casing`, () => args.dietOptions.voa],
]);

function garboSaleValue(item: Item, useHistorical: boolean): number {
  if (useHistorical) {
    if (historicalAge(item) <= 7.0 && historicalPrice(item) > 0) {
      const isMallMin = historicalPrice(item) === Math.max(100, 2 * autosellPrice(item));
      return isMallMin ? autosellPrice(item) : 0.9 * historicalPrice(item);
    }
  }
  return getSaleValue(item);
}

const garboRegularValueCache = new Map<Item, number>();
const garboHistoricalValueCache = new Map<Item, number>();
export function value(item: Item, useHistorical = false): number {
  const cachedValue =
    garboRegularValueCache.get(item) ??
    (useHistorical ? garboHistoricalValueCache.get(item) : undefined);
  if (cachedValue === undefined) {
    const specialValueCompute = specialValueLookup.get(item);
    const value = specialValueCompute ? specialValueCompute() : garboSaleValue(item, useHistorical);
    (useHistorical ? garboHistoricalValueCache : garboRegularValueCache).set(item, value);
    return value;
  }
  return cachedValue;
}
export function averageValue(...items: Item[]): number {
  return sumNumbers(items.map((i) => value(i))) / items.length;
}
