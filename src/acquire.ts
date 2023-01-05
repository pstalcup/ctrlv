import { Item, itemAmount, buy, retrieveItem } from "kolmafia";

export function acquire(qty: number, item: Item, maxPrice: number): number {
  const startAmount = itemAmount(item);
  const remaining = qty - startAmount;
  if (item.tradeable) {
    buy(remaining, item, maxPrice);
  } else {
    retrieveItem(remaining, item);
  }
  return itemAmount(item) - startAmount;
}
