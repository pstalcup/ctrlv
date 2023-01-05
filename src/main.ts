import { Args } from "grimoire-kolmafia";
import { print } from "kolmafia";
import { $familiar, $monster, have, Witchess } from "libram";
import { all } from "libram/dist/resources/2013/Florist";

import { DietEngine } from "./engine";
import { args } from "./lib";
import { bestMonster } from "./tasks/copy";
import { diet } from "./tasks/diet";

function validateArgs() {
  if (
    args.copyOptions.freefightsource === "tentacle" &&
    args.copyOptions.target !== $monster`eldrich tentacle`
  ) {
    args.copyOptions.target = bestMonster("tentacle");
  } else if (
    args.copyOptions.freefightsource === "witchess" &&
    !Witchess.pieces.includes(args.copyOptions.target)
  ) {
    args.copyOptions.target = bestMonster("witchess");
  } else if (args.copyOptions.freefightsource === "goth" && !have($familiar`Artistic goth kid`)) {
    args.copyOptions.target = bestMonster("goth");
  } else if (args.copyOptions.freefightsource === "hipster" && !have($familiar`Mini-hipster`)) {
    args.copyOptions.target = bestMonster("hipster");
  } else if (args.copyOptions.freefightsource === "kramco") {
    args.copyOptions.target = bestMonster("kramco");
  } else if (args.copyOptions.target === $monster`none`) {
    args.copyOptions.target = bestMonster("default");
  }
}

function runDiet() {
  const dietEngine = new DietEngine(diet(args.dietOptions.nightcap));

  if (args.dietOptions.simulate) {
    for (const task of dietEngine.tasks) {
      print(`${task.name} @ ${task.quantity}`);
      print(` - ${task.detail}`);
    }
  } else {
    dietEngine.run();
  }
}

function runCopy() {}

export default function main(argStr?: string): void {
  Args.fill(args, argStr);

  validateArgs();

  if (args.diet) {
    runDiet();
  }
  if (args.copy) {
    runCopy();
  }
}
