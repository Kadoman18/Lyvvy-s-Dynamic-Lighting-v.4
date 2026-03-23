import { system, world } from "@minecraft/server";
import {
	getMainhandItem,
	getOffhandItem,
	removePlayerLights,
	getHeadBlockPos,
        tryPlaceLight,
        getPlayerState,
	getAdjacentPositions,
} from "../../utils/dynamicLightUtils";
import { LIGHT_ITEMS } from "../constants";

system.runInterval(() => {
	for (const player of world.getPlayers()) {
		const state = getPlayerState(player);
		const dimension = player.dimension;

		const mainhandItem = getMainhandItem(player);
		const offhandItem = getOffhandItem(player);

		const mainLevel = mainhandItem ? LIGHT_ITEMS.get(mainhandItem.typeId) : undefined;
		const offLevel = offhandItem ? LIGHT_ITEMS.get(offhandItem.typeId) : undefined;

		const level = Math.max(mainLevel ?? 0, offLevel ?? 0);

		// No light → cleanup
		if (level <= 0) {
			removePlayerLights(player, dimension, state);
			playerLightState.delete(player.id);
			continue;
		}

		const headPos = getHeadBlockPos(player);
		const prevPos = state.lastPos;

		// Skip if player hasn't moved
		if (
			prevPos &&
			prevPos.x === headPos.x &&
			prevPos.y === headPos.y &&
			prevPos.z === headPos.z
		) {
			continue;
		}

		// Update position AFTER movement detected
		state.lastPos = headPos;

		// Remove previous lights
		removePlayerLights(player, dimension, state);
		state.lights = [];

		// Place at head
		const headEntry = tryPlaceLight(dimension, headPos, level);
		if (headEntry) {
			state.lights = [headEntry];
			continue;
		}

		// Vertical placement
		const aboveHead = { x: headPos.x, y: headPos.y + 1, z: headPos.z };
		const atFeet = { x: headPos.x, y: headPos.y - 1, z: headPos.z };

		let increasedLevel = Math.min(15, level + 1);
		let reducedLevel = Math.max(0, level - 1);

		// Place at feet
		const feetEntry = tryPlaceLight(dimension, atFeet, reducedLevel);
		if (feetEntry) {
			state.lights = [feetEntry];
			continue;
		}

		// Place above
		const aboveEntry = tryPlaceLight(dimension, aboveHead, increasedLevel);
		if (aboveEntry) {
			state.lights = [aboveEntry];
			continue;
		}

		// Adjacent placement
		const adjacent = getAdjacentPositions(headPos);
		const placed = [];

		for (const pos of adjacent) {
			const entry = tryPlaceLight(dimension, pos, reducedLevel);
			if (entry) placed.push(entry);
		}

		state.lights = placed;
	}
}, 1);
