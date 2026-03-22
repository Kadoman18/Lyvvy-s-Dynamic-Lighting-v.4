import { world, system } from "@minecraft/server";
import { LIGHT_ITEMS, lastUseMap, swapCooldownMap } from "../../global/constants.js";
import { performOffhandSwap } from "../../utils/dynamicLightUtils.js";

world.beforeEvents.itemUse.subscribe((event) => {
	const player = event.source;
	if (!player) return;

	const item = event.itemStack;
	if (!item || !LIGHT_ITEMS.has(item.typeId)) return;

	const currentTick = system.currentTick;
	const last = lastUseMap.get(player.id) ?? 0;

	if (currentTick - (swapCooldownMap.get(player.id) ?? 0) < 10) return;

	if (currentTick - last <= 8) {
		performOffhandSwap(player);

		lastUseMap.delete(player.id);
		swapCooldownMap.set(player.id, currentTick);

		event.cancel = true;
	} else {
		lastUseMap.set(player.id, currentTick);
	}
});
