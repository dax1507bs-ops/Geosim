CREATE TABLE `game_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`countryCode` varchar(8) NOT NULL,
	`countryName` varchar(128) NOT NULL,
	`startYear` int NOT NULL,
	`currentTurn` int NOT NULL DEFAULT 1,
	`currentYear` int NOT NULL,
	`currentMonth` int NOT NULL,
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `game_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`gdpNominal` float NOT NULL,
	`gdpGrowth` float NOT NULL,
	`gdpPerCapita` float NOT NULL,
	`inflation` float NOT NULL,
	`unemployment` float NOT NULL,
	`treasuryBalance` float NOT NULL,
	`nationalDebt` float NOT NULL,
	`centralBankRate` float NOT NULL,
	`tradeBalance` float NOT NULL,
	`foreignReserves` float NOT NULL,
	`currencyRate` float NOT NULL,
	`stockIndex` float NOT NULL,
	`stockIndexChange` float NOT NULL,
	`population` float NOT NULL,
	`approvalRating` float NOT NULL,
	`avgSalaryUsd` float NOT NULL,
	`militaryBudgetPct` float NOT NULL,
	`militaryPersonnel` int NOT NULL,
	`militaryStrength` float NOT NULL,
	`factions` json NOT NULL,
	`diplomaticRelations` json NOT NULL,
	`pendingLegislation` json NOT NULL,
	`activeConflicts` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `game_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_states_sessionId_unique` UNIQUE(`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `player_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`turnNumber` int NOT NULL,
	`decisions` json NOT NULL,
	`legislationVotes` json NOT NULL,
	`diplomaticActions` json NOT NULL,
	`militaryOrders` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `player_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `turn_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`turnNumber` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`headline` varchar(256) NOT NULL,
	`reportMarkdown` text NOT NULL,
	`worldEvents` json NOT NULL,
	`availableDecisions` json NOT NULL,
	`pendingLegislation` json NOT NULL,
	`stateSnapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `turn_reports_id` PRIMARY KEY(`id`)
);
