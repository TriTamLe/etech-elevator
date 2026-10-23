ALTER TABLE `projects` ADD `address` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `projects` SET `address` = coalesce(json_extract(`params`, '$.project.address'), '');
