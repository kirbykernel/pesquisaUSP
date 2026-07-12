ALTER TABLE `dailyResponses` ADD `wellbeingBefore` int NOT NULL;--> statement-breakpoint
ALTER TABLE `dailyResponses` ADD `wellbeingAfter` int;--> statement-breakpoint
ALTER TABLE `dailyResponses` ADD `pauseDuration` int;--> statement-breakpoint
ALTER TABLE `dailyResponses` DROP COLUMN `wellbeingScore`;