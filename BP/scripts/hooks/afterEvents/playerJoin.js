import { world } from "@minecraft/server";

world.afterEvents.playerJoin.subscribe((eventData) => {
	const { player } = eventData;
});
