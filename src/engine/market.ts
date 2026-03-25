import { Good, GOODS, MarketOrder, MarketPrices, Nation, Trade } from "./types.js";

// Default prices used when no trades happen for a good
const BASE_PRICES: Record<Good, number> = {
  food: 5,
  textiles: 10,
  iron: 12,
  machinery: 25,
  luxuries: 40,
};

/**
 * Clear the market: match buy and sell orders for each good.
 *
 * Algorithm:
 * 1. Sort sell orders ascending by price (cheapest first)
 * 2. Sort buy orders descending by price (highest bidder first)
 * 3. Match pairs while buyer price >= seller price
 * 4. Trade executes at midpoint price
 * 5. Apply tariffs to importing buyers
 *
 * Returns executed trades and updated market prices.
 */
export function clearMarket(
  orders: MarketOrder[],
  nations: Map<string, Nation>,
  previousPrices: MarketPrices
): { trades: Trade[]; prices: MarketPrices } {
  const trades: Trade[] = [];
  const newPrices: Record<Good, number> = { ...previousPrices.prices };
  const newVolume: Record<Good, number> = { food: 0, textiles: 0, iron: 0, machinery: 0, luxuries: 0 };

  for (const good of GOODS) {
    const sells = orders
      .filter((o) => o.good === good && o.side === "sell")
      .map((o) => ({ ...o })) // clone so we can mutate quantity
      .sort((a, b) => a.price - b.price);

    const buys = orders
      .filter((o) => o.good === good && o.side === "buy")
      .map((o) => ({ ...o }))
      .sort((a, b) => b.price - a.price);

    let si = 0;
    let bi = 0;

    while (si < sells.length && bi < buys.length) {
      const sell = sells[si];
      const buy = buys[bi];

      // No match if buyer won't pay seller's price
      if (buy.price < sell.price) break;

      // Can't self-trade
      if (buy.nationId === sell.nationId) {
        bi++;
        continue;
      }

      const qty = Math.min(sell.quantity, buy.quantity);
      const tradePrice = (buy.price + sell.price) / 2;

      const buyer = nations.get(buy.nationId)!;
      const seller = nations.get(sell.nationId)!;

      // Calculate cost with tariffs
      const tariffRate = buyer.tariffs[good] ?? 0;
      const totalCost = tradePrice * qty * (1 + tariffRate);

      // Check buyer can afford
      if (buyer.treasury < totalCost) {
        bi++;
        continue;
      }

      // Execute trade
      buyer.treasury -= totalCost;
      buyer.stockpile[good] += qty;

      seller.treasury += tradePrice * qty;
      seller.stockpile[good] -= qty;

      // Tariff revenue goes to buyer's treasury (import duty)
      buyer.treasury += tradePrice * qty * tariffRate;

      trades.push({
        buyerNationId: buy.nationId,
        sellerNationId: sell.nationId,
        good,
        quantity: qty,
        price: tradePrice,
      });

      newVolume[good] += qty;
      newPrices[good] = tradePrice; // last trade price

      sell.quantity -= qty;
      buy.quantity -= qty;

      if (sell.quantity <= 0) si++;
      if (buy.quantity <= 0) bi++;
    }

    // If no trades happened, keep previous price
    if (newVolume[good] === 0) {
      newPrices[good] = previousPrices.prices[good];
    }
  }

  return {
    trades,
    prices: { prices: newPrices, volume: newVolume },
  };
}

/**
 * Auto-buy needs for pops using welfare spending.
 * The nation places buy orders at market price + 10% to ensure fulfillment.
 */
export function generateWelfareOrders(nation: Nation, marketPrices: MarketPrices): MarketOrder[] {
  if (nation.welfareSpending <= 0) return [];

  const budget = nation.treasury * nation.welfareSpending;
  const orders: MarketOrder[] = [];

  // Calculate how much food and textiles pops need
  const foodNeeded = Math.max(0, nation.pops.count * 0.8 - nation.stockpile.food);
  const textilesNeeded = Math.max(0, nation.pops.count * 0.3 - nation.stockpile.textiles);

  let spent = 0;

  // Prioritize food
  if (foodNeeded > 0) {
    const price = marketPrices.prices.food * 1.1;
    const maxQty = Math.min(foodNeeded, (budget - spent) / price);
    if (maxQty > 0) {
      orders.push({ nationId: nation.id, good: "food", quantity: maxQty, price, side: "buy" });
      spent += maxQty * price;
    }
  }

  // Then textiles
  if (textilesNeeded > 0) {
    const price = marketPrices.prices.textiles * 1.1;
    const maxQty = Math.min(textilesNeeded, (budget - spent) / price);
    if (maxQty > 0) {
      orders.push({ nationId: nation.id, good: "textiles", quantity: maxQty, price, side: "buy" });
      spent += maxQty * price;
    }
  }

  return orders;
}

export function initialPrices(): MarketPrices {
  return {
    prices: { ...BASE_PRICES },
    volume: { food: 0, textiles: 0, iron: 0, machinery: 0, luxuries: 0 },
  };
}
