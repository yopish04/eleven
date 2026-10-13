CREATE TABLE `matches` (
	`owner` text NOT NULL,
	`run_id` text NOT NULL,
	`fixture_id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `run_id`, `fixture_id`)
);
--> statement-breakpoint
CREATE TABLE `worlds` (
	`owner` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`mutation` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL
);
