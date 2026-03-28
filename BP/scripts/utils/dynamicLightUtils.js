import { system } from "@minecraft/server";
import { LIGHT_ITEMS, playerLightState } from "../global/constants";

export function getPlayerState(player) {
	let state = playerLightState.get(player.id);
	if (!state) {
		state = {
			lights: [],
			lastPos: undefined,
			lastUseTick: undefined,
			swapCooldown: undefined,
		};
		playerLightState.set(player.id, state);
	}
	return state;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").ItemStack | undefined}
 */
export function getMainhandItem(player) {
	const inventory = player.getComponent("minecraft:inventory").container;
	const item = inventory.getItem(player.selectedSlotIndex);
	return item ?? undefined;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").ItemStack | undefined}
 */
export function getOffhandItem(player) {
	const equippable = player.getComponent("minecraft:equippable");
	const item = equippable?.getEquipment("Offhand");
	return item ?? undefined;
}

/**
 * @param {import("@minecraft/server").Player} player
 * @returns {import("@minecraft/server").Vector3}
 */
export function getHeadBlockPos(player) {
	// Crawling logic override
	if (isCrawling(player)) {
		return {
			x: Math.floor(player.location.x),
			y: Math.floor(player.location.y),
			z: Math.floor(player.location.z),
		};
	}

	// Normal standing logic (unchanged)
	return {
		x: Math.floor(player.location.x),
		y: Math.floor(player.location.y + 1),
		z: Math.floor(player.location.z),
	};
}

/**
 * @param {Player} player
 * @returns {boolean}
 */
function isCrawling(player) {
	const distance = player.getHeadLocation().y - player.location.y;
	return distance < 0.31 && !player.isSwimming && !player.isGliding && !player.isSleeping;
}

/**
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} pos
 * @param {number} level
 * @returns {boolean}
 */
export function tryPlaceLight(dimension, pos, level) {
	const block = dimension.getBlock(pos);
	if (!blockIsFillable(block)) return undefined;
	// Capture original state
	const original = {
		pos,
		dimensionId: dimension.id,
		typeId: block.typeId,
		permutation: block.permutation,
	};
	dimension.setBlockType(pos, "kado:light_block");
	const newBlock = dimension.getBlock(pos);
	newBlock.setPermutation(newBlock.permutation.withState("kado:light_level", level));
	return original;
}

/**
 * @param {import("@minecraft/server").Block} block
 * @returns {boolean}
 */
function blockIsFillable(block) {
	return (
		block.typeId === "minecraft:air" ||
		(block.typeId === "minecraft:water" && block.permutation.getState("liquid_depth") === 0)
	);
}

/**
 * @param {import("@minecraft/server").Vector3} center
 * @returns {import("@minecraft/server").Vector3[]}
 */
export function getAdjacentPositions(center) {
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
export function removePlayerLights(player, dimension, state) {
	if (!state?.lights?.length) return;
	for (const entry of state.lights) {
		const block = dimension.getBlock(entry.pos);
		if (block.typeId !== "kado:light_block") continue;
		dimension.setBlockType(entry.pos, entry.typeId);
		const restored = dimension.getBlock(entry.pos);
		restored.setPermutation(entry.permutation);
	}
}

/**
 * @param {import("@minecraft/server").Player} player
 */
export function performOffhandSwap(player) {
	const inventory = player.getComponent("minecraft:inventory")?.container;
	const equip = player.getComponent("minecraft:equippable");
	if (!inventory || !equip) return;
	const slot = player.selectedSlotIndex;
	const itemInHand = inventory.getItem(slot);
	if (!itemInHand || !LIGHT_ITEMS.has(itemInHand.typeId)) return;
	system.run(() => {
		const currentHand = inventory.getItem(slot);
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
