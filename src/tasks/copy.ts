import { Task } from "grimoire-kolmafia";
import {
  adv1,
  canAdventure,
  chatPrivate,
  cliExecute,
  handlingChoice,
  itemAmount,
  itemDrops,
  Monster,
  myHash,
  runChoice,
  toItem,
  use,
  useSkill,
  visitUrl,
  wait,
} from "kolmafia";
import {
  $effect,
  $effects,
  $familiar,
  $item,
  $location,
  $monster,
  $monsters,
  $skill,
  get,
  have,
  property,
  Witchess,
} from "libram";

import { acquire } from "../acquire";
import { args, FreeFightSource, maxBy } from "../lib";
import { value } from "../value";
import { wanderWhere } from "../wanderer";

function dropValue(monster: Monster) {
  return Object.entries(itemDrops(monster)).reduce((a, [i, d]) => a + d * value(toItem(i)), 0);
}

function bestDrop(...monsters: Monster[]) {
  return maxBy(monsters, dropValue);
}

export function bestMonster(source: FreeFightSource): Monster {
  if (source === "witchess") {
    return bestDrop(...$monsters`Witchess knight, Witchess bishop, Witchess rook, Witchess pawn`);
  }
  if (source === "goth") {
    return $monster`Black Crayon Crimbo Elf`;
  }
  if (source === "kramco") {
    return $monster`knob sausage goblin`;
  }
  if (source === "hipster") {
    return bestDrop(
      ...$monsters`angry bassist, blue-haired girl, evil-ex girlfriend, peeved roommate, random scenester`
    );
  }
  if (source === "wish") {
    const options: Omit<Record<FreeFightSource, Monster>, "wish"> = {
      default: bestMonster("default"),
      witchess: bestMonster("witchess"),
      goth: bestMonster("goth"),
      kramco: bestMonster("kramco"),
      hipster: bestMonster("hipster"),
      tentacle: bestMonster("tentacle"),
    };
  }
  return $monster`eldritch tentacle`;
}

function target() {
  return args.copyOptions.target;
}

function copyReady() {
  return (
    get("spookyPuttyMonster") === target() ||
    get("cameraMonster") === target() ||
    (get("lastCopyableMonster") === target() && have($item`backup camera`))
  );
}

function useKramco() {
  return (
    (have($item`Kramco Sausage-o-Matic™`) && args.copyOptions.freefightsource === "kramco") ||
    (target() === $monster`knob sausage goblin` && args.copyOptions.freefightsource === "default")
  );
}

function useHipster() {
  return (
    have($familiar`Mini-Hipster`) &&
    args.copyOptions.freefightsource === "hipster" &&
    get("_hipsterAdv") === 0
  );
}

function useGothKid() {
  return (
    have($familiar`Artistic Goth Kid`) &&
    args.copyOptions.freefightsource === "goth" &&
    get("_hipsterAdv") === 0
  );
}

function useTentacle() {
  return (
    args.copyOptions.freefightsource === "tentacle" ||
    (target() === $monster`eldritch tentacle` && args.copyOptions.freefightsource === "default")
  );
}

export const bootstrapTasks: Task[] = [
  {
    name: `Bootstrap Witchess`,
    ready: () => Witchess.pieces.includes(target()) && Witchess.fightsDone() < 5,
    do: () => Witchess.fightPiece(target()),
    completed: copyReady,
  },
  {
    name: `Bootstrap Sausage Goblin`,
    ready: () => useKramco(),
    outfit: {
      offhand: $item`Kramco Sausage-o-Matic™`,
    },
    do: wanderWhere("wanderer"),
    completed: copyReady,
  },
  {
    name: `Bootstrap Black Crayon`,
    ready: () => useGothKid(),
    outfit: {
      familiar: $familiar`Artistic Goth Kid`,
    },
    do: () => wanderWhere("backup"),
    completed: copyReady,
  },
  {
    name: `Bootstrap Hipster`,
    ready: () => useHipster(),
    outfit: {
      familiar: $familiar`Mini-Hipster`,
    },
    do: () => wanderWhere("backup"),
    completed: copyReady,
  },
  {
    name: `Bootstrap Tentacle (Eldritch Elixir)`,
    ready: () => have($effect`Eldritch Attunement`) && useTentacle(),
    do: () => wanderWhere("backup"),
    completed: copyReady,
  },
  {
    name: `Bootstrap Tentacle (Evoke Eldritch Horror)`,
    ready: () => !get("_eldritchHorrorEvoked"),
    effects: $effects`Crappily Disguised as a Waiter`,
    do: () => useSkill($skill`Evoke Eldritch Horror`),
    completed: copyReady,
  },
  {
    name: `Bootstrap Tentacle (Doctor Gordon)`,
    ready: () =>
      useTentacle() &&
      canAdventure($location`The Distant Woods`) &&
      !get("_eldritchTentacleFought"),
    do: () => {
      const haveEldritchEssence = itemAmount($item`eldritch essence`) !== 0;
      visitUrl("place.php?whichplace=forestvillage&action=fv_scientist", false);
      if (!handlingChoice()) throw "No choice?";
      runChoice(haveEldritchEssence ? 2 : 1);
    },
    completed: copyReady,
  },
  {
    name: `Bootstrap Fax`,
    ready: () => !get("_photocopyUsed"),
    do: () => {
      let tries = 0;
      if (!have($item`photocopied monster`)) {
        cliExecute("fax receive");
      }
      // use property.getString because the photocopyMonster property can become malformed
      while (tries < 3 && property.getString("photocopyMonster") !== `${target()}`) {
        cliExecute("fax send");
        chatPrivate("cheesefax", `${target()}`);
        wait(10);
        if (!have($item`photocopied monster`)) {
          cliExecute("fax receive");
        }
        tries += 1;
      }
    },
    completed: copyReady,
  },
  {
    name: `Bootstrap Pocket Wish`,
    ready: () => get("_genieFightsUsed") < 3,
    do: () => {
      acquire(1, $item`pocket wish`, 50000);
      visitUrl(`inv_use.php?pwd=${myHash()}&which=3&whichitem=9537`, false, true);
      visitUrl(`choice.php?pwd&whichchoice=1267&option=1&wish=to fight a ${target()} `, true, true);
    },
    completed: copyReady,
  },
];

export const copyTasks: Task[] = [
  {
    name: `Backup`,
    ready: () => get("lastCopyableMonster") === target() && get("_backUpUses") < 11,
    do: () => adv1(wanderWhere("backup"), -1, ""),
    completed: () => false,
  },
  {
    name: `Spooky Putty`,
    ready: () => have($item`spooky putty monster`) && get("spookyPuttyMonster") === target(),
    do: () => use($item`spooky putty monster`),
    completed: () => false,
  },
  {
    name: "Rain-Doh",
    ready: () => have($item`Rain-Doh box full of monster`) && get("rainDohMonster") === target(),
    do: () => use($item`Rain-Doh box full of monster`),
    completed: () => false,
  },
  {
    name: `4-d Camera`,
    ready: () =>
      have($item`shaking 4-d camera`) && get("cameraMonster") === target() && !get("_cameraUsed"),
    do: () => use($item`shaking 4-d camera`),
    completed: () => false,
  },
];
