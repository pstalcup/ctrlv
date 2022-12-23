import { print } from "kolmafia";

import { diet } from "./tasks/diet";

export default function main(): void {
  for (const t of diet()) {
    print(`Name: ${t.name} @ ${t.quantity}`);
    print(`  ${t.detail}`);
  }
}
