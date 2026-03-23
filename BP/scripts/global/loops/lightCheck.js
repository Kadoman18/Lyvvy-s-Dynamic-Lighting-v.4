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
import { LIGHT_ITEMS, playerLightMap, playerLastPos } from "../constants";

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
		const prevPos = playerLastPos.get(player.id);
		if (
			prevPos &&
			prevPos.x === headPos.x &&
			prevPos.y === headPos.y &&
			prevPos.z === headPos.z
		) {
			continue;
		}
		// update position AFTER movement detected
		playerLastPos.set(player.id, headPos);
		removePlayerLights(player, dimension);
		// Place at head
		if (tryPlaceLight(dimension, headPos, level)) {
			setPlayerLights(player, [headPos]);
			continue;
		}
		// Vertical placement
		const aboveHead = { x: headPos.x, y: headPos.y + 1, z: headPos.z };
		const atFeet = { x: headPos.x, y: headPos.y - 1, z: headPos.z };
		let increasedLevel = Math.min(15, level + 1);
		let reducedLevel = Math.max(0, level - 1);
		const placed = [];
		// Place at feet
		if (tryPlaceLight(dimension, atFeet, reducedLevel)) {
			setPlayerLights(player, [atFeet]);
			continue;
		}
		// Place above
		if (tryPlaceLight(dimension, aboveHead, increasedLevel)) {
			setPlayerLights(player, [aboveHead]);
			continue;
		}
		const adjacent = getAdjacentPositions(headPos);
		for (const pos of adjacent) {
			if (tryPlaceLight(dimension, pos, reducedLevel)) {
				placed.push(pos);
			}
		}
		setPlayerLights(player, placed);
	}
}, 1);
