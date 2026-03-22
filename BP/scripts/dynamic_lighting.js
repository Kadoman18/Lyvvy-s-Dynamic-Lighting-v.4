import { world, system } from "@minecraft/server";

const LIGHT_ITEMS = new Map([
	["minecraft:lantern", 15],
	["minecraft:sea_lantern", 15],
	["minecraft:glowstone", 15],
	["minecraft:shroomlight", 15],
	["minecraft:beacon", 15],
	["minecraft:lit_pumpkin", 15],
	["minecraft:ochre_froglight", 15],
	["minecraft:verdant_froglight", 15],
	["minecraft:pearlescent_froglight", 15],
	["minecraft:lava", 15],
	["minecraft:campfire", 15],
	["minecraft:torch", 14],
	["minecraft:end_rod", 14],
	["minecraft:glow_berries", 14],
	["minecraft:soul_torch", 10],
	["minecraft:soul_lantern", 10],
	["minecraft:crying_obsidian", 10],
	["minecraft:soul_campfire", 10],
	["minecraft:glow_lichen", 7],
	["minecraft:enchanting_table", 7],
	["minecraft:ender_chest", 7],
	["minecraft:sea_pickle", 6],
	["minecraft:sculk_catalyst", 6],
	["minecraft:glow_ink_sack", 6],
	["minecraft:amethyst_cluster", 5],
	["minecraft:totem_of_undying", 5],
	["minecraft:large_amethyst_bud", 4],
	["minecraft:magma", 3],
	["minecraft:sculk_shrieker", 2],
	["minecraft:medium_amethyst_bud", 2],
	["minecraft:small_amethyst_bud", 1],
	["minecraft:brown_mushroom", 1],
	["minecraft:sculk_sensor", 1],
]);

/**
 * Tracks previously placed light positions per player
 * key: player.id
 * value: Vector3[]
 */
const playerLightMap = new Map();

/**
 * Tracks last use tick per player for double-click detection
 * key: player.id
 * value: tick number
 */
const lastUseMap = new Map();

/**
 * Cooldown to prevent rapid swapping
 * key: player.id
 * value: tick number
 */
const swapCooldownMap = new Map();

/**
 * Max ticks between uses to count as a double-click
 */
const DOUBLE_USE_WINDOW = 8;

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").ItemStack | undefined}
 */
function getMainhandItem(player) {
	const inventory = player.getComponent("minecraft:inventory").container;
	const item = inventory.getItem(player.selectedSlotIndex);
	return item ?? undefined;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").ItemStack | undefined}
 */
function getOffhandItem(player) {
	const equippable = player.getComponent("minecraft:equippable");
	const item = equippable?.getEquipment("Offhand");
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

/**
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
 * @param {import("@minecraft/server").Player} player
 * @param {import("@minecraft/server").Vector3[]} positions
 */
function setPlayerLights(player, positions) {
	playerLightMap.set(player.id, positions);
}

/**
 * @param {import("@minecraft/server").Player} player
 */
function performOffhandSwap(player) {
	const inv = player.getComponent("minecraft:inventory")?.container;
	const equip = player.getComponent("minecraft:equippable");
	if (!inv || !equip) return;
	const slot = player.selectedSlotIndex;
	const itemInHand = inv.getItem(slot);
	if (!itemInHand || !LIGHT_ITEMS.has(itemInHand.typeId)) return;
	system.run(() => {
		const currentHand = inv.getItem(slot);
		const offhandItem = equip.getEquipment("Offhand");
		if (!currentHand) return;
		const handSlot = "slot.weapon.mainhand";
		const offSlot = "slot.weapon.offhand";
		const amount = currentHand.amount || 1;
		if (!offhandItem) {
			player.runCommand(`replaceitem entity @s ${offSlot} 0 ${currentHand.typeId} ${amount}`);
			player.runCommand(`replaceitem entity @s ${handSlot} 0 air`);
		} else {
			const offAmount = offhandItem.amount || 1;
			if (offhandItem.typeId === currentHand.typeId) {
				const maxStack = currentHand.maxAmount ?? 64;
				const total = offAmount + amount;
				const newOffAmount = Math.min(total, maxStack);
				const remainder = total - newOffAmount;
				player.runCommand(
					`replaceitem entity @s ${offSlot} 0 ${currentHand.typeId} ${newOffAmount}`,
				);
				if (remainder > 0) {
					player.runCommand(
						`replaceitem entity @s ${handSlot} 0 ${currentHand.typeId} ${remainder}`,
					);
				} else {
					player.runCommand(`replaceitem entity @s ${handSlot} 0 air`);
				}
			} else {
				player.runCommand(`replaceitem entity @s ${offSlot} 0 ${currentHand.typeId} ${amount}`);
				player.runCommand(
					`replaceitem entity @s ${handSlot} 0 ${offhandItem.typeId} ${offAmount}`,
				);
			}
		}

		player.playSound("random.pop");
	});
}

world.beforeEvents.itemUse.subscribe((event) => {
	const player = event.source;
	if (!player) return;

	const item = event.itemStack;
	if (!item || !LIGHT_ITEMS.has(item.typeId)) return;

	const currentTick = system.currentTick;
	const last = lastUseMap.get(player.id) ?? 0;

	if (currentTick - (swapCooldownMap.get(player.id) ?? 0) < 10) return;

	if (currentTick - last <= DOUBLE_USE_WINDOW) {
		performOffhandSwap(player);

		lastUseMap.delete(player.id);
		swapCooldownMap.set(player.id, currentTick);

		event.cancel = true;
	} else {
		lastUseMap.set(player.id, currentTick);
	}
});

system.runInterval(() => {
	for (const player of world.getPlayers()) {
		const dimension = player.dimension;
		const mainhandItem = getMainhandItem(player);
		const offhandItem = getOffhandItem(player);
		const mainLevel = mainhandItem ? LIGHT_ITEMS.get(mainhandItem.typeId) : undefined;
		const offLevel = offhandItem ? LIGHT_ITEMS.get(offhandItem.typeId) : undefined;
		const level = Math.max(mainLevel ?? 0, offLevel ?? 0);
		if (level <= 0) {
			removePlayerLights(player, dimension);
			playerLightMap.delete(player.id);
			continue;
		}
		const headPos = getHeadBlockPos(player);
		removePlayerLights(player, dimension);
		if (tryPlaceLight(dimension, headPos, level)) {
			setPlayerLights(player, [headPos]);
			continue;
		}
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
