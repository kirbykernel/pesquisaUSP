CREATE TABLE `adminInvites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`invitedByOpenId` varchar(64) NOT NULL,
	`invitedByName` text,
	`accepted` boolean NOT NULL DEFAULT false,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminInvites_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminInvites_email_unique` UNIQUE(`email`)
);
