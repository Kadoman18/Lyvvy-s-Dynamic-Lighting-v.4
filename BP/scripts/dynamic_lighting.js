import { world, system } from "@minecraft/server";

const LIGHT_ITEMS = new Map([
	["minecraft:torch", 14],
	["minecraft:lantern", 15],
	["minecraft:soul_torch", 10],
	["minecraft:glowstone", 14],
	["minecraft:sea_lantern", 14],
]);

// ----------------------------------------
// STATE (NEW)
// ----------------------------------------

/**
 * Tracks previously placed light positions per player
 * key: player.id
 * value: Vector3[]
 */
const playerLightMap = new Map();

// ----------------------------------------
// HELPERS
// ----------------------------------------

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").ItemStack | undefined}
 */
function getHeldItem(player) {
	const inventory = player.getComponent("minecraft:inventory").container;
	const item = inventory.getItem(player.selectedSlotIndex);
	return item ?? undefined;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").Vector3}
 */
function getHeadBlockPos(player) {
	return {
		x: Math.floor(player.location.x),
		y: Math.floor(player.location.y + 1.62),
		z: Math.floor(player.location.z),
	};
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} pos
 * @param {number} level
 * @returns {boolean}
 */
function tryPlaceLight(dimension, pos, level) {
	if (!blockIsFillable(dimension, pos)) return false;

	dimension.setBlockType(pos, "kado:light_block");

	const block = dimension.getBlock(pos);
	block.setPermutation(block.permutation.withState("kado:light_level", level));

	return true;
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} pos
 * @returns {boolean}
 */
function blockIsFillable(dimension, pos) {
	const blockId = dimension.getBlock(pos).typeId;
	return (
		blockId === "minecraft:air" ||
		blockId === "minecraft:water" ||
		blockId === "minecraft:flowing_water"
	);
}

/**
 * @param {import("@minecraft/server").Vector3} center
 * @returns {import("@minecraft/server").Vector3[]}
 */
function getAdjacentPositions(center) {
	return [
		{ x: center.x + 1, y: center.y, z: center.z },
		{ x: center.x - 1, y: center.y, z: center.z },
		{ x: center.x, y: center.y, z: center.z + 1 },
		{ x: center.x, y: center.y, z: center.z - 1 },
	];
}

// ----------------------------------------
// NEW HELPERS (LIGHT MANAGEMENT)
// ----------------------------------------

/**
 * Removes all previously placed lights for a player
 * Restores air or water depending on waterlogging
 *
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").Dimension} dimension
 */
function removePlayerLights(player, dimension) {
	const prev = playerLightMap.get(player.id);
	if (!prev) return;

	for (const pos of prev) {
		const block = dimension.getBlock(pos);

		if (block.typeId === "kado:light_block") {
			dimension.setBlockType(pos, block.isWaterlogged ? "minecraft:water" : "minecraft:air");
		}
	}
}

/**
 * Stores new light positions for a player
 *
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").Vector3[]} positions
 */
function setPlayerLights(player, positions) {
	playerLightMap.set(player.id, positions);
}

// ----------------------------------------
// MAIN LOOP
// ----------------------------------------

system.runInterval(() => {
	for (const player of world.getPlayers()) {
		const dimension = player.dimension;

		// Get held item
		const item = getHeldItem(player);

		// If no item OR not a light item → remove existing lights
		if (!item) {
			removePlayerLights(player, dimension);
			playerLightMap.delete(player.id);
			continue;
		}

		const level = LIGHT_ITEMS.get(item.typeId);

		if (level === undefined) {
			removePlayerLights(player, dimension);
			playerLightMap.delete(player.id);
			continue;
		}

		const headPos = getHeadBlockPos(player);

		// Remove previous lights before placing new ones
		removePlayerLights(player, dimension);

		// 1. Attempt center placement
		if (tryPlaceLight(dimension, headPos, level)) {
			setPlayerLights(player, [headPos]);
			continue;
		}

		// 2. Fallback placement
		const reducedLevel = Math.max(0, level - 1);
		const adjacent = getAdjacentPositions(headPos);

		const placed = [];

		for (const pos of adjacent) {
			if (tryPlaceLight(dimension, pos, reducedLevel)) {
				placed.push(pos);
			}
		}

		setPlayerLights(player, placed);
	}
}, 1);
