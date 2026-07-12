CREATE TABLE `timerProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`dayNumber` int NOT NULL,
	`secondsElapsed` int NOT NULL DEFAULT 0,
	`accessDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timerProgress_id` PRIMARY KEY(`id`)
);
