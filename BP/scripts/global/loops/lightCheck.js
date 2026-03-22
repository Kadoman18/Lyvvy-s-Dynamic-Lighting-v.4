import { system, world } from "@minecraft/server";
import {
	getMainhandItem,
	getOffhandItem,
	removePlayerLights,
	getHeadBlockPos,
	tryPlaceLight,
	setPlayerLights,
	getAdjacentPositions,
} from "../../utils/dynamicLightUtils";
import { LIGHT_ITEMS, playerLightMap } from "../constants";

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
		// NEW: vertical fallback (above head + below feet)
		const aboveHead = { x: headPos.x, y: headPos.y + 1, z: headPos.z };
		const atFeet = { x: headPos.x, y: headPos.y - 1, z: headPos.z };
		// Handle 15 cap
		let topLevel = level;
		let bottomLevel = Math.max(0, level - 1);
		if (level === 15) {
			topLevel = 15;
			bottomLevel = 14;
		}
		const placed = [];
		// Prefer placing below feet first
		if (tryPlaceLight(dimension, atFeet, bottomLevel)) {
			setPlayerLights(player, [atFeet]);
			continue;
		}
		// Fallback to above head
		if (tryPlaceLight(dimension, aboveHead, topLevel)) {
			setPlayerLights(player, [aboveHead]);
			continue;
		}
		const reducedLevel = Math.max(0, level - 1);
		const adjacent = getAdjacentPositions(headPos);
		for (const pos of adjacent) {
			if (tryPlaceLight(dimension, pos, reducedLevel)) {
				placed.push(pos);
			}
		}
		setPlayerLights(player, placed);
	}
}, 1);
