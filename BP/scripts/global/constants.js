/**
 * Maps item typeIds to their effective dynamic light level when held.
 * Only items present in this map will produce light and allow offhand switching.
 * Key: string (typeId)
 * Value: number (0–15)
 */
export const LIGHT_ITEMS = new Map([
	["minecraft:lantern", 15],
	["minecraft:sea_lantern", 15],
	["minecraft:glowstone", 15],
	["minecraft:shroomlight", 15],
	["minecraft:beacon", 15],
	["minecraft:lit_pumpkin", 15],
	["minecraft:ochre_froglight", 15],
	["minecraft:verdant_froglight", 15],
	["minecraft:pearlescent_froglight", 15],
	["minecraft:lava_bucket", 15],
	["minecraft:campfire", 15],
	["minecraft:copper_lantern", 15],
	["minecraft:exposed_copper_lantern", 15],
	["minecraft:weathered_copper_lantern", 15],
	["minecraft:oxidized_copper_lantern", 15],
	["minecraft:waxed_copper_lantern", 15],
	["minecraft:waxed_exposed_copper_lantern", 15],
	["minecraft:waxed_weathered_copper_lantern", 15],
	["minecraft:waxed_oxidized_copper_lantern", 15],
	["minecraft:copper_torch", 14],
	["minecraft:torch", 14],
	["minecraft:end_rod", 14],
	["minecraft:glow_berries", 14],
	["minecraft:blaze_rod", 12],
	["minecraft:blaze_powder", 12],
	["minecraft:nether_star", 12],
	["minecraft:experience_bottle", 10],
	["minecraft:soul_torch", 10],
	["minecraft:soul_lantern", 10],
	["minecraft:crying_obsidian", 10],
	["minecraft:soul_campfire", 10],
	["minecraft:glow_lichen", 7],
	["minecraft:enchanting_table", 7],
	["minecraft:ender_chest", 7],
	["minecraft:ender_eye", 7],
	["minecraft:redstone_torch", 7],
	["minecraft:sculk_catalyst", 6],
	["minecraft:glow_ink_sack", 6],
	["minecraft:amethyst_cluster", 5],
	["minecraft:ender_pearl", 5],
	["minecraft:totem_of_undying", 5],
	["minecraft:echo_shard", 4],
	["minecraft:large_amethyst_bud", 4],
	["minecraft:dragon_egg", 4],
	["minecraft:magma", 3],
	["minecraft:sculk_shrieker", 2],
	["minecraft:fire_charge", 2],
	["minecraft:medium_amethyst_bud", 2],
	["minecraft:small_amethyst_bud", 1],
	["minecraft:brown_mushroom", 1],
	["minecraft:sculk_sensor", 1],
]);

/**
 * @typedef {Object} LightBlockEntry
 * @property {import("@minecraft/server").Vector3} pos
 * @property {string} typeId
 * @property {import("@minecraft/server").BlockPermutation} permutation
 */

/**
 * Unified player light state
 * key: player.id
 */
export const playerLightState = new Map();
