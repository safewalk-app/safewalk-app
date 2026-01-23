CREATE INDEX `positions_session_id_idx` ON `positions` (`sessionId`);--> statement-breakpoint
CREATE INDEX `positions_timestamp_idx` ON `positions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_deadline_idx` ON `sessions` (`deadline`);--> statement-breakpoint
CREATE INDEX `sessions_created_at_idx` ON `sessions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sms_logs_session_id_idx` ON `smsLogs` (`sessionId`);--> statement-breakpoint
CREATE INDEX `sms_logs_status_idx` ON `smsLogs` (`status`);--> statement-breakpoint
CREATE INDEX `sms_logs_created_at_idx` ON `smsLogs` (`createdAt`);