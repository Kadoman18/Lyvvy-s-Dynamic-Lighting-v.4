import { world } from "@minecraft/server";
import { playerLightMap, lastUseMap, swapCooldownMap } from "../../global/constants";

world.beforeEvents.playerLeave.subscribe((eventData) => {
	const { player } = eventData;
	const positions = playerLightMap.get(player);
	if (!positions) return;
	const dimensionIds = ["overworld", "nether", "the_end"];
	// Try all dimensions since we no longer have the player reference
	for (const dimensionId in dimensionIds) {
		const dimension = world.getDimension(dimensionId);
		for (const pos of positions) {
			const block = dimension.getBlock(pos);
			if (block && block.typeId === "kado:light_block") {
				dimension.setBlockType(pos, block.isWaterlogged ? "minecraft:water" : "minecraft:air");
			}
		}
	}
	playerLightMap.delete(player);
	lastUseMap.delete(player);
	swapCooldownMap.delete(player);
});
