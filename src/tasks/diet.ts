import {
  availableAmount,
  buy,
  chew,
  drink,
  eat,
  Effect,
  getIngredients,
  haveEffect,
  Item,
  itemAmount,
  itemType,
  mallPrice,
  myClass,
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
  $class,
  $effect,
  $item,
  $items,
  $skill,
  Diet,
  get,
  getRemainingLiver,
  getRemainingSpleen,
  getRemainingStomach,
  have,
  MenuItem,
} from "libram";
import { NumericProperty } from "libram/dist/propertyTypes";
import { Mayo } from "libram/dist/resources/2015/MayoClinic";

import { DietTask, engineState } from "../engine";
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
  [$item`LOV Extraterrestrial Chocolate`, () => 20000],
]);

function price(item: Item): number {
  return (priceOverrides.get(item) ?? mallPrice)(item);
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

function eatSafe(qty: number, item: Item) {
  if (!get("_milkOfMagnesiumUsed")) {
    acquire(1, $item`milk of magnesium`, 5 * args.voa);
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
      if (!haveEffect($effect`Ode to Booze`)) {
        throw "Unable to obtain ode to booze!";
      }
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

function useSafe(qty: number, item: Item) {
  if (!use(qty, item)) throw "Failed to use safely";
}

type MenuData = {
  cleans?: { stomach?: number; liver?: number; spleen?: number };
  buff?: boolean;
  ascend?: boolean;
  effect?: Effect;
};

function consumeQuantity(qty: number, menuItem: MenuItem<MenuData>) {
  const data = menuItem.data ?? {};
  const cleans = data.cleans ?? {};

  const wrapClean = (current: number, cleans: number) =>
    cleans > 0 && current < cleans ? Math.floor(current / cleans) : qty;

  const wrapUsage = (remaining: number, size: number) =>
    qty * size > remaining ? Math.floor(remaining / size) : qty;

  return Math.min(
    wrapClean(myFullness(), cleans.stomach ?? 0),
    wrapClean(myInebriety(), cleans.liver ?? 0),
    wrapClean(mySpleenUse(), cleans.spleen ?? 0),
    wrapUsage(getRemainingStomach(), menuItem.organ === "food" ? menuItem.size : 0),
    wrapUsage(getRemainingLiver(), menuItem.organ === "booze" ? menuItem.size : 0),
    wrapUsage(getRemainingSpleen(), menuItem.organ === "spleen item" ? menuItem.size : 0)
  );
}

function consumeSafe(
  qty: number,
  price: number,
  menuItems: MenuItem<MenuData>[],
  skipAcquire?: boolean
) {
  qty = Math.min(...menuItems.map((i) => consumeQuantity(qty, i)));

  if (qty <= 0) {
    throw `Nothing to consume with ${menuItems.map((i) => i.item).join(",")}!`;
  }

  for (const menuItem of menuItems) {
    const item = menuItem.item;

    print(`Consuming ${qty} of ${item} at ${price}`, "yellow");

    if (!skipAcquire) {
      acquire(qty, item, price);
    }
    if (itemType(item) === "food") eatSafe(qty, item);
    else if (itemType(item) === "booze") drinkSafe(qty, item);
    else if (itemType(item) === "spleen item") chewSafe(qty, item);
    else if (item !== $item`Special Seasoning`) use(qty, item);
  }
  engineState.consumed = qty;
}

type FullMenuData = MenuData & { maximum?: number; price?: number };

function menuItem(item: Item, data: FullMenuData = {}): MenuItem<MenuData> {
  return new MenuItem(item, {
    data,
    maximum: data.maximum,
    priceOverride: data.price ?? price(item),
  });
}

function legendaryFood(item: Item, data: MenuData = {}) {
  if (!$items`Calzone of Legend, Pizza of Legend, Deep Dish of Legend`.includes(item)) {
    throw `${item} is not a legendary food`;
  }
  const property = `${item}Eaten`
    .replace(/^(.)/g, (s) => s.toLowerCase())
    .replace(/ (.)/g, (s) => s.toUpperCase())
    .replace(/ /g, "");
  return menuItem(item, { ...data, maximum: get(property, false) ? 0 : 1 });
}

function organTasks(): DietTask[] {
  const lasagna = cheapest($items`fishy fish lasagna, gnat lasagna, long pork lasagna`);
  const dreadPocket = cheapest(
    $items`Dreadsylvanian spooky pocket, Dreadsylvanian hot pocket, Dreadsylvanian cold pocket, Dreadsylvanian sleaze pocket, Dreadsylvanian stink pocket`
  );

  const foods = [
    menuItem(lasagna),
    menuItem(dreadPocket),
    menuItem($item`extra-greasy slider`, { cleans: { spleen: 5 } }),
    menuItem($item`Mr. Burnsger`, { cleans: { liver: 2 } }),
    menuItem($item`spaghetti breakfast`, { maximum: have($item`spaghetti breakfast`) ? 1 : 0 }),
    menuItem($item`frozen banquet`),
    menuItem($item`deviled egg`),
    legendaryFood($item`Calzone of Legend`),
    legendaryFood($item`Pizza of Legend`),
    legendaryFood($item`Deep Dish of Legend`),
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
    menuItem($item`Hodgman's blanket`),
    menuItem($item`Sacramento wine`),
    menuItem($item`iced plum wine`),
    menuItem($item`splendid martini`),
    menuItem($item`Eye and a Twist`),
    menuItem($item`jar of fermented pickle juice`, { cleans: { spleen: 5 } }),
    menuItem($item`Doc Clock's thyme cocktail`, { cleans: { stomach: 2 }, price: 1000 }),
  ];

  const spleens = [
    menuItem($item`octolus oculus`),
    menuItem($item`prismatic wad`),
    menuItem($item`transdermal smoke patch`),
    menuItem($item`antimatter wad`),
    menuItem($item`voodoo snuff`),
    menuItem($item`blood-drive sticker`),
  ];

  const helpers = [
    menuItem($item`spice melange`, { cleans: { stomach: 3, liver: 3 } }),
    menuItem($item`Special Seasoning`),
    menuItem($item`cuppa Sobrie tea`, { cleans: { liver: 1 } }),
    menuItem($item`distention pill`, { cleans: { liver: 1 } }),
    menuItem($item`cuppa Voraci tea`),
    menuItem(Mayo.flex),
    menuItem($item`mojo filter`, { cleans: { spleen: 1 } }),
    menuItem($item`pocket wish`, { maximum: 1, effect: $effect`Refined Palate`, buff: true }),
    menuItem($item`toasted brie`, { maximum: 1, buff: true }),
    // menuItem($item`potion of the field gar`, { maximum: 1, buff: true }),
  ];

  const organs = {
    food: Math.max(args.stomach - myFullness(), 0),
    booze: Math.max(args.liver - myInebriety(), 0),
    spleen: Math.max(args.spleen - mySpleenUse(), 0),
  };

  print(
    `Building diet VOA: ${args.voa} Stomach: ${organs.food} Liver: ${organs.booze} Spleen: ${organs.spleen}`
  );

  const menu = [...foods, ...boozes, ...spleens, ...helpers];

  const diet = Diet.plan(args.voa, menu, organs);

  const adv = diet.expectedAdventures();
  const val = diet.expectedValue(args.voa, "gross");
  const cost = diet.expectedPrice();

  const sortKey = (m: MenuItem<MenuData>) =>
    m.data ? (m.data.buff ? 0 : m.data.cleans ? 1 : 2) : 2;

  return diet.entries
    .sort((a, b) => sortKey(a.target()) - sortKey(b.target()))
    .map((entry) => {
      const data: MenuData = entry.target().data ?? {};
      return {
        name: `Consume ${entry.target()}`,
        completed: () => false,
        ready: () => consumeQuantity(entry.quantity, entry.target()) > 0,
        do: () =>
          consumeSafe(
            engineState.consumed,
            (engineState.consumed * entry.expectedValue(args.voa, diet, "gross")) / entry.quantity,
            entry.menuItems
          ),
        quantity: entry.quantity,
        detail: `Items: ${entry.menuItems.join(
          ","
        )} Price: ${entry.expectedPrice()} Value: ${entry.expectedValue(
          args.voa,
          diet
        )} Adventures: ${entry.expectedAdventures(diet)}`,
      };
    });
}

function chocolateTasks() {
  const chocos = new Map([
    [$class`Seal Clubber`, $item`chocolate seal-clubbing club`],
    [$class`Turtle Tamer`, $item`chocolate turtle totem`],
    [$class`Pastamancer`, $item`chocolate pasta spoon`],
    [$class`Sauceror`, $item`chocolate saucepan`],
    [$class`Accordion Thief`, $item`chocolate stolen accordion`],
    [$class`Disco Bandit`, $item`chocolate disco ball`],
  ]);

  const bestChocolate = (used?: number) => {
    used = used ?? get("_chocolatesUsed");
    const offClass = cheapest(
      [...chocos.entries()]
        .filter(([playerClass, classChocolate]) => myClass() !== playerClass)
        .map(([playerClass, classChocolate]) => classChocolate)
    );
    const onClass = chocos.get(myClass());

    const adventures: { item: Item; adv: number }[] = [
      { item: $item`fancy chocolate`, adv: [5, 3, 1, 0][used] },
      { item: $item`fancy but probably evil`, adv: [5, 3, 1, 0][used] },
      { item: $item`beet-flavored Mr. Mediocrebar`, adv: [5, 3, 1, 0][used] },
      { item: $item`cabbage-flavored Mr. Mediocrebar`, adv: [5, 3, 1, 0][used] },
      { item: $item`sweet-corn-flavored Mr. Mediocrebar`, adv: [5, 3, 1, 0][used] },
      { item: $item`choco-Crimbot`, adv: [5, 3, 1, 0][used] },
      { item: offClass, adv: [2, 1, 0, 0][used] },
    ];
    const best = maxBy(adventures, ({ item, adv }) => -price(item) / adv);
    return { ...best, value: price(best.item) / best.adv };
  };

  const quantity = [bestChocolate(0), bestChocolate(1), bestChocolate(2), bestChocolate(3)]
    .slice(get("_chocolatesUsed"))
    .filter(({ value }) => value < args.voa).length;

  const chocolateTask: DietTask = {
    name: "Fancy Chocolates",
    quantity,
    do: () => {
      engineState.consumed = 1;
      const target = bestChocolate(get("_chocolatesUsed"));
      acquire(1, target.item, target.adv * args.voa);
      useSafe(1, bestChocolate(get("_chocolatesUsed")).item);
    },
    completed: () => false,
    detail: "",
  };

  const worth = (
    chocolate: Item,
    property: NumericProperty,
    adventures: number[],
    limit?: number
  ): DietTask => {
    const quantity = adventures
      .slice(get(property))
      .map((a) => price(chocolate) / a)
      .filter((v) => v < args.voa).length;

    return {
      name: `${chocolate}`,
      quantity: Math.min(quantity, limit ?? quantity),
      do: () => {
        engineState.consumed = 1;
        acquire(1, chocolate, adventures[get(property)] * args.voa);
        useSafe(1, chocolate);
      },
      completed: () => false,
      detail: "",
    };
  };

  return [
    chocolateTask,
    worth($item`fancy chocolate sculpture`, "_chocolateSculpturesUsed", [5, 3, 1]),
    worth($item`vitachoconutriment capsule`, "_vitachocCapsulesUsed", [5, 3, 1]),
    worth(
      $item`LOV Extraterrestrial Chocolate`,
      "_loveChocolatesUsed",
      [3, 2, 1],
      availableAmount($item`LOV Extraterrestrial Chocolate`)
    ),
    worth($item`chocolate cigar`, "_chocolateCigarsUsed", [3, 2, 1]),
  ];
}

export function diet(): DietTask[] {
  return [...organTasks(), ...chocolateTasks()].filter((t) => t.quantity > 0);
}
