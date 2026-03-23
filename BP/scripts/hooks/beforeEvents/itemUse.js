import { world, system } from "@minecraft/server";
import { LIGHT_ITEMS } from "../../global/constants.js";
import { performOffhandSwap, getPlayerState } from "../../utils/dynamicLightUtils.js";

world.beforeEvents.itemUse.subscribe((event) => {
	const player = event.source;
	if (!player) return;

	const item = event.itemStack;
	if (!item || !LIGHT_ITEMS.has(item.typeId)) return;

	const state = getPlayerState(player);

	const currentTick = system.currentTick;
	const last = state.lastUseTick ?? 0;
	const cooldown = state.swapCooldown ?? 0;

	// Cooldown check
	if (currentTick - cooldown < 10) return;

	// Double-click detection
	if (currentTick - last <= 8) {
		performOffhandSwap(player);

		state.lastUseTick = undefined;
		state.swapCooldown = currentTick;

		event.cancel = true;
	} else {
		state.lastUseTick = currentTick;
	}
});
