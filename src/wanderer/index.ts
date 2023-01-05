import { Location, print } from "kolmafia";
import { $location } from "libram";

import { maxBy, HIGHLIGHT, sober } from "../lib";

import { guzzlrFactory } from "./guzzlr";
import {
  canAdventureOrUnlock,
  canWander,
  defaultFactory,
  DraggableFight,
  unlock,
  WandererFactory,
  WandererLocation,
} from "./lib";
import { lovebugsFactory } from "./lovebugs";
import { yellowRayFactory } from "./yellowray";

export type { DraggableFight };

const wanderFactories: WandererFactory[] = [
  defaultFactory,
  yellowRayFactory,
  lovebugsFactory,
  guzzlrFactory,
];

export function bestWander(
  type: DraggableFight,
  locationSkiplist: Location[],
  nameSkiplist: string[]
): WandererLocation {
  const possibleLocations = new Map<Location, WandererLocation>();

  for (const wanderFactory of wanderFactories) {
    const wanderTargets = wanderFactory(type, locationSkiplist);
    for (const wanderTarget of wanderTargets) {
      if (
        !nameSkiplist.includes(wanderTarget.name) &&
        !locationSkiplist.includes(wanderTarget.location) &&
        canWander(wanderTarget.location, type)
      ) {
        const wandererLocation: WandererLocation = possibleLocations.get(wanderTarget.location) ?? {
          location: wanderTarget.location,
          targets: [],
          value: 0,
        };
        wandererLocation.targets = [...wandererLocation.targets, wanderTarget];
        wandererLocation.value += wanderTarget.value;
        possibleLocations.set(wandererLocation.location, wandererLocation);
      }
    }
  }

  if (possibleLocations.size === 0) {
    throw "Could not determine a wander target!";
  }

  return maxBy([...possibleLocations.values()], "value");
}

/**
 * Recursively Check for zones to wander to
 * @param type type of fight we are looking for
 * @param nameSkiplist Any wanderer tasks that should be skipped because they could not be prepared
 * @param locationSkiplist Any locations that should be skipped because they could not be unlocked
 * @returns A location at which to wander
 */
export function wanderWhere(
  type: DraggableFight,
  nameSkiplist: string[] = [],
  locationSkiplist: Location[] = []
): Location {
  const candidate = bestWander(type, locationSkiplist, nameSkiplist);
  const failed = candidate.targets.filter((target) => !target.prepareTurn());

  const badLocation =
    !canAdventureOrUnlock(candidate.location) ||
    !unlock(candidate.location, candidate.value) ||
    !canWander(candidate.location, type)
      ? [candidate.location]
      : [];

  if (failed.length > 0 || badLocation.length > 0) {
    return wanderWhere(
      type,
      [...nameSkiplist, ...failed.map((target) => target.name)],
      [...locationSkiplist, ...badLocation]
    );
  } else {
    const targets = candidate.targets.map((t) => t.name).join("; ");
    const value = candidate.value.toFixed(2);
    print(`Wandering at ${candidate.location} for expected value ${value} (${targets})`, HIGHLIGHT);

    return candidate.location;
  }
}

export function drunkSafeWander(type: DraggableFight): Location {
  return sober() ? wanderWhere(type) : $location`Drunken Stupor`;
}

export const unsupportedChoices = new Map<Location, { [choice: number]: number | string }>([
  [$location`The Spooky Forest`, { [502]: 2, [505]: 2 }],
  [$location`Guano Junction`, { [1427]: 1 }],
  [$location`The Hidden Apartment Building`, { [780]: 6, [1578]: 6 }],
  [$location`The Black Forest`, { [923]: 1, [924]: 1 }],
  [$location`LavaCo™ Lamp Factory`, { [1091]: 9 }],
  [$location`The Haunted Laboratory`, { [884]: 6 }],
  [$location`The Haunted Nursery`, { [885]: 6 }],
  [$location`The Haunted Storage Room`, { [886]: 6 }],
  [$location`The Hidden Park`, { [789]: 6 }],
  [$location`A Mob of Zeppelin Protesters`, { [1432]: 1, [857]: 2 }],
  [$location`A-Boo Peak`, { [1430]: 2 }],
  [$location`Sloppy Seconds Diner`, { [919]: 6 }],
  [$location`VYKEA`, { [1115]: 6 }],
  [
    $location`The Castle in the Clouds in the Sky (Basement)`,
    {
      [670]: 4,
      [671]: 4,
      [672]: 1,
    },
  ],
  [
    $location`The Haunted Bedroom`,
    {
      [876]: 1, // old leather wallet, 500 meat
      [877]: 1, // old coin purse, 500 meat
      [878]: 1, // 400-600 meat
      [879]: 2, // grouchy spirit
      [880]: 2, // a dumb 75 meat club
    },
  ],
  [$location`The Copperhead Club`, { [855]: 4 }],
  [$location`The Castle in the Clouds in the Sky (Top Floor)`, { [1431]: 1, [677]: 2 }],
  [$location`The Hidden Office Building`, { [786]: 6 }],
]);
