import { buy, craftType, Location, print, retrieveItem } from "kolmafia";
import { $item, $skill, get, Guzzlr, have } from "libram";

import { value } from "../value";

import {
  canAdventureOrUnlock,
  DraggableFight,
  WandererTarget,
  wandererTurnsAvailableToday,
} from "./lib";

function freeCrafts(): number {
  return (
    (have($skill`Rapid Prototyping`) ? 5 - get("_rapidPrototypingUsed") : 0) +
    (have($skill`Expert Corner-Cutter`) ? 5 - get("_expertCornerCutterUsed") : 0)
  );
}

function considerAbandon(locationSkiplist: Location[]) {
  const location = Guzzlr.getLocation();
  const remaningTurns = Math.ceil(
    (100 - get("guzzlrDeliveryProgress")) / (10 - get("_guzzlrDeliveries"))
  );

  print(
    `Got guzzlr quest ${Guzzlr.getTier()} at ${Guzzlr.getLocation()} with remaining turns ${remaningTurns}`
  );

  if (
    // consider abandoning
    !location || // if mafia faled to track the location correctly
    locationSkiplist.includes(location) ||
    !canAdventureOrUnlock(location) || // or the zone is marked as "generally cannot adv"
    wandererTurnsAvailableToday(location) < remaningTurns // or ascending and not enough turns to finish
  ) {
    print("Abandoning...");
    Guzzlr.abandon();
  }
}

function acceptGuzzlrQuest(locationSkiplist: Location[]) {
  if (Guzzlr.isQuestActive()) considerAbandon(locationSkiplist);
  while (!Guzzlr.isQuestActive()) {
    print("Picking a guzzlr quest");
    if (
      Guzzlr.canPlatinum() &&
      !(get("garbo_prioritizeCappingGuzzlr", false) && Guzzlr.haveFullPlatinumBonus())
    ) {
      Guzzlr.acceptPlatinum();
    } else if (Guzzlr.canGold() && (Guzzlr.haveFullBronzeBonus() || !Guzzlr.haveFullGoldBonus())) {
      // if gold is not maxed, do that first since they are limited per day
      Guzzlr.acceptGold();
    } else {
      // fall back to bronze when can't plat, can't gold, or bronze is not maxed
      Guzzlr.acceptBronze();
    }
    considerAbandon(locationSkiplist);
  }
}

function guzzlrValue(tier: "bronze" | "gold" | "platinum" | null) {
  const progressPerTurn = 100 / (10 - get("_guzzlrDeliveries"));
  const buckValue = value($item`Guzzlrbuck`);

  switch (tier) {
    case null:
      return 0;
    case "bronze":
      return (3 * buckValue) / progressPerTurn;
    case "gold":
      return (6 * buckValue) / progressPerTurn;
    case "platinum":
      return (21.5 * buckValue) / progressPerTurn;
  }
}

export function guzzlrFactory(
  _type: DraggableFight,
  locationSkiplist: Location[]
): WandererTarget[] {
  if (Guzzlr.have()) {
    acceptGuzzlrQuest(locationSkiplist);
    const location = Guzzlr.getLocation();
    if (location !== null) {
      const guzzlrBooze =
        Guzzlr.getTier() === "platinum" ? Guzzlr.getCheapestPlatinumCocktail() : Guzzlr.getBooze();
      return [
        new WandererTarget("Guzzlr", location, guzzlrValue(Guzzlr.getTier()), () => {
          if (!guzzlrBooze) {
            // this is an error state - accepted a guzzlr quest but mafia doesn't know the booze
            return false;
          }

          if (!have(guzzlrBooze)) {
            const fancy = guzzlrBooze && craftType(guzzlrBooze).includes("fancy");
            if (guzzlrBooze && (!fancy || (fancy && freeCrafts() > 0))) {
              retrieveItem(guzzlrBooze);
            } else if (guzzlrBooze) {
              buy(1, guzzlrBooze, guzzlrValue(Guzzlr.getTier()));
            }
          }
          return have(guzzlrBooze);
        }),
      ];
    }
  }
  return [];
}
