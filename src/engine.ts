import { Task, Engine } from "grimoire-kolmafia";

export type DietTask = Task & {
  priority?: number;
  quantity: number;
  detail: string;
};

class DietEngine extends Engine<"", DietTask> {
  taskQuantity: Map<string, number>;

  constructor(tasks: DietTask[]) {
    super(tasks);
    this.taskQuantity = new Map<string, number>();
  }

  available(task: DietTask): boolean {
    const quantity = this.taskQuantity.get(task.name) ?? 0;
    return quantity > task.quantity && super.available(task);
  }

  execute(task: DietTask): void {
    super.execute(task);
    const quantity = this.taskQuantity.get(task.name) ?? 0;
    this.taskQuantity.set(task.name, quantity + 1);
  }
}
