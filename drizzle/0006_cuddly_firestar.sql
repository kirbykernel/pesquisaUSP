CREATE TABLE `appSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `appSettings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `audioProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`audioNumber` int NOT NULL,
	`dayNumber` int NOT NULL,
	`percentageListened` int NOT NULL DEFAULT 0,
	`completed` boolean NOT NULL DEFAULT false,
	`lastPosition` int NOT NULL DEFAULT 0,
	`accessDate` timestamp NOT NULL,
	`synced` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audioProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('welcome_video','intervention_audio','control_info') NOT NULL,
	`fileUrl` text,
	`fileKey` text,
	`audioNumber` int,
	`title` varchar(255),
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantId` int NOT NULL,
	`dayNumber` int NOT NULL,
	`wellbeingBefore` int NOT NULL,
	`wellbeingAfter` int,
	`pauseDuration` int,
	`currentActivity` text,
	`responseDate` timestamp NOT NULL,
	`synced` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`participantNumber` varchar(20) NOT NULL,
	`group` enum('intervention','control') NOT NULL,
	`startDate` timestamp,
	`randomizedAt` timestamp NOT NULL DEFAULT (now()),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `participants_participantNumber_unique` UNIQUE(`participantNumber`)
);
