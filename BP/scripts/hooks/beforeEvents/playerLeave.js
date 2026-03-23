import { world } from "@minecraft/server";
import { playerLightState } from "../../global/constants";

world.beforeEvents.playerLeave.subscribe((eventData) => {
	const { player } = eventData;
	const state = playerLightState.get(player.id);
	if (!state) return;
	for (const entry of state.lights) {
		const dimension = world.getDimension(entry.dimensionId);
		if (!dimension) continue;
		const block = dimension.getBlock(entry.pos);
		if (!block || block.typeId !== "kado:light_block") continue;
		dimension.setBlockPermutation(entry.pos, entry.permutation);
	}
	playerLightState.delete(player.id);
});
