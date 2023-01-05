import { Args } from "grimoire-kolmafia";
import { print } from "kolmafia";
import { all } from "libram/dist/resources/2013/Florist";

import { DietEngine } from "./engine";
import { args } from "./lib";
import { diet } from "./tasks/diet";

export default function main(argStr?: string): void {
  Args.fill(args, argStr);

  const dietEngine = new DietEngine(diet());

  dietEngine.run();
}
