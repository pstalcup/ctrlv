import {
  availableAmount,
  buy,
  chew,
  drink,
  eat,
  getIngredients,
  haveEffect,
  Item,
  itemAmount,
  itemType,
  mallPrice,
  myFullness,
  myInebriety,
  mySpleenUse,
  print,
  retrieveItem,
  setProperty,
  toItem,
  turnsPerCast,
  use,
  useSkill,
} from "kolmafia";
import {
  $effect,
  $item,
  $items,
  $skill,
  Diet,
  get,
  getAverageAdventures,
  have,
  MenuItem,
} from "libram";

import { DietTask } from "../engine";
import { args, maxBy } from "../lib";

function cheapest(items: Item[]) {
  return maxBy(items, (item: Item) => -mallPrice(item));
}

function recipePrice(item: Item): number {
  const ingredients = Object.entries(getIngredients(item));
  if (ingredients.length > 0) {
    const ingredientPrices = ingredients
      .map(([itemStr, qty]): number => recipePrice(toItem(itemStr)) * qty)
      .reduce((acc, cur) => acc + cur);
    return item.tradeable ? Math.max(ingredientPrices, mallPrice(item)) : ingredientPrices;
  }
  return mallPrice(item);
}

export type PriceCalculator = (item: Item) => number;
const priceOverrides = new Map<Item, PriceCalculator>([
  ...($items`Boris's bread, roasted vegetable of Jarlsberg, Pete's rich ricotta, roasted vegetable focaccia, baked veggie ricotta casserole, plain calzone, Deep Dish of Legend, Calzone of Legend, Pizza of Legend`.map(
    (item) => [item, recipePrice]
  ) as [Item, PriceCalculator][]),
]);

function price(item: Item): number {
  const p = (priceOverrides.get(item) ?? mallPrice)(item);
  print(`Price for ${item}: ${p}`);
  return p;
}

function acquire(qty: number, item: Item, maxPrice: number): number {
  const startAmount = itemAmount(item);
  const remaining = qty - startAmount;
  if (item.tradeable) {
    buy(remaining, item, maxPrice);
  } else {
    retrieveItem(remaining, item);
  }
  return itemAmount(item) - startAmount;
}

function eatSafe(qty: number, item: Item, mpa: number) {
  if (!get("_milkOfMagnesiumUsed")) {
    acquire(1, $item`milk of magnesium`, 5 * mpa);
    use($item`milk of magnesium`);
  }
  if (!eat(qty, item)) throw "Failed to eat safely";
}

function drinkSafe(qty: number, item: Item) {
  const prevDrunk = myInebriety();
  if (have($skill`The Ode to Booze`)) {
    const odeTurns = qty * item.inebriety;
    const castTurns = odeTurns - haveEffect($effect`Ode to Booze`);
    if (castTurns > 0) {
      useSkill(
        $skill`The Ode to Booze`,
        Math.ceil(castTurns / turnsPerCast($skill`The Ode to Booze`))
      );
    }
  }
  if (!drink(qty, item)) throw "Failed to drink safely";
  if (item.inebriety === 1 && prevDrunk === qty + myInebriety() - 1) {
    // sometimes mafia does not track the mime army shotglass property
    setProperty("_mimeArmyShotglassUsed", "true");
  }
}

function chewSafe(qty: number, item: Item) {
  if (!chew(qty, item)) throw "Failed to chew safely";
}

type MenuData = {
  maximum?: number;
  cleans?: { stomach?: number; liver?: number; spleen?: number };
  buff?: boolean;
  ascend?: boolean;
};

function consumeSafe(qty: number, menuItems: MenuItem<MenuData>[], skipAcquire?: boolean) {
  for (const item of menuItems) {
    print(`Consuming ${qty} of ${item.item}`);
  }

  /*const spleenCleaned = spleenCleaners.get(item);
  if (spleenCleaned && mySpleenUse() < spleenCleaned) {
    throw "No spleen to clear with this.";
  }
  const averageAdventures = data?.turns ?? getAverageAdventures(item);
  if (!skipAcquire && (averageAdventures > 0 || additionalValue)) {
    const cap = Math.max(0, averageAdventures * mpa) + (additionalValue ?? 0);
    acquire(qty, item, cap);
  } else if (!skipAcquire) {
    acquire(qty, item);
  }
  if (itemType(item) === "food") eatSafe(qty, item, mpa);
  else if (itemType(item) === "booze") drinkSafe(qty, item);
  else if (itemType(item) === "spleen item") chewSafe(qty, item);
  else if (item !== $item`Special Seasoning`) use(qty, item);*/
}

function menuItem(item: Item, data: MenuData & { maximum?: number } = {}): MenuItem<MenuData> {
  return new MenuItem<MenuData>(item, { size: 1 });
}

export function diet(): DietTask[] {
  const lasagna = cheapest($items`fishy fish lasagna, gnat lasagna, long pork lasagna`);
  const dreadPocket = cheapest(
    $items`Dreadsylvanian spooky pocket, Dreadsylvanian hot pocket, Dreadsylvanian cold pocket, Dreadsylvanian sleaze pocket, Dreadsylvanian stink pocket`
  );

  const foods = [
    menuItem(lasagna),
    menuItem(dreadPocket),
    menuItem($item`extra-greasy slider`, { cleans: { spleen: 5 } }),
    menuItem($item`Mr. Burnsger`, { cleans: { liver: 3 } }),
    menuItem($item`spaghetti breakfast`, { maximum: itemAmount($item`spaghetti breakfast`) }),
    menuItem($item`frozen banquet`),
    menuItem($item`deviled egg`),
    menuItem($item`Calzone of Legend`),
    menuItem($item`Pizza of Legend`),
    menuItem($item`Deep Dish of Legend`),
  ];

  const mushroomWine = cheapest(
    $items`overpowering mushroom wine, complex mushroom wine, smooth mushroom wine, blood-red mushroom wine, buzzing mushroom wine, swirling mushroom wine`
  );
  const perfectDrink = cheapest(
    $items`perfect cosmopolitan, perfect negroni, perfect dark and stormy, perfect mimosa, perfect old-fashioned, perfect paloma`
  );
  const dreadBooze = cheapest(
    $items`Dreadsylvanian hot toddy, Dreadsylvanian grimlet, Dreadsylvanian cold-fashioned, Dreadsylvanian dank and stormy, Dreadsylvanian slithery nipple`
  );

  const boozes = [
    menuItem(mushroomWine),
    menuItem(perfectDrink),
    menuItem(dreadBooze),
    menuItem($item`astral pilsner`, { maximum: availableAmount($item`astral pilsner`) }),
    menuItem($item`elemental caipiroska`),
    menuItem($item`moreltini`),
    menuItem($item`Dreadsylvanian grimlet`),
    menuItem($item`Hodgman's blanket`),
    menuItem($item`Sacramento wine`),
    menuItem($item`iced plum wine`),
    menuItem($item`splendid martini`),
    menuItem($item`Eye and a Twist`),
    menuItem($item`jar of fermented pickle juice`, { cleans: { spleen: 5 } }),
    menuItem($item`Doc Clock's thyme cocktail`, { cleans: { stomach: 3 } }),
  ];

  const spleens = [
    menuItem($item`octolus oculus`),
    menuItem($item`prismatic wad`),
    menuItem($item`transdermal smoke patch`),
    menuItem($item`antimatter wad`),
    menuItem($item`voodoo snuff`),
    menuItem($item`blood-drive sticker`),
  ];

  const helpers = [menuItem($item`Special Seasoning`)];

  const organs = {
    food: Math.max(args.stomach - myFullness(), 0),
    booze: Math.max(args.liver - myInebriety(), 0),
    spleen: Math.max(args.spleen - mySpleenUse(), 0),
  };

  print(
    `Building diet VOA: ${args.voa} Food: ${organs.food} Booze: ${organs.booze} Spleen: ${organs.spleen}`
  );

  const menu = [...foods, ...boozes, ...spleens, ...helpers];

  const diet = Diet.plan(args.voa, menu, organs);

  print(`Diet has ${diet.entries.length} entries`);

  return diet.entries.map((entry) => {
    return {
      name: `Consume ${entry.menuItems.map((v) => `${v.item}`).join(",")} ${entry.quantity} items`,
      completed: () => false,
      do: () => consumeSafe(entry.quantity, entry.menuItems),
      quantity: entry.quantity,
      detail: `Target: ${entry.target()} Price: ${entry.expectedPrice()} Value: ${entry.expectedValue(
        args.voa,
        diet
      )} Adventures: ${entry.expectedAdventures(diet)}`,
    };
  });
}
