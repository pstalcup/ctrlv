import { Task, Engine } from "grimoire-kolmafia";
import { print } from "kolmafia";

export type DietTask = Task & {
  priority?: number;
  quantity: number;
  detail: string;
};

export const engineState = {
  consumed: 0,
};

export class DietEngine extends Engine<"", DietTask> {
  taskQuantity: Map<string, number>;

  constructor(tasks: DietTask[]) {
    super(tasks);
    this.taskQuantity = new Map<string, number>();
  }

  available(task: DietTask): boolean {
    const quantity = this.taskQuantity.get(task.name) ?? 0;
    return quantity < task.quantity && super.available(task);
  }

  execute(task: DietTask): void {
    engineState.consumed = task.quantity - (this.taskQuantity.get(task.name) ?? 0);
    super.execute(task);
    this.taskQuantity.set(
      task.name,
      (this.taskQuantity.get(task.name) ?? 0) + engineState.consumed
    );
  }

  complete(): boolean {
    return this.tasks.every((t) => this.taskQuantity.get(t.name) === t.quantity);
  }
}
