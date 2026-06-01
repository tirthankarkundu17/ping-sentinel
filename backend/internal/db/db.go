package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

func NewDB(databaseURL string) (*sql.DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := sql.Open("sqlite", databaseURL)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	if _, err := db.ExecContext(ctx, `PRAGMA journal_mode = WAL;`); err != nil {
		_ = db.Close()
		return nil, err
	}
	if _, err := db.ExecContext(ctx, `PRAGMA busy_timeout = 5000;`); err != nil {
		_ = db.Close()
		return nil, err
	}
	if _, err := db.ExecContext(ctx, `PRAGMA foreign_keys = ON;`); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}

func InitSchema(db *sql.DB, schemaPath string) error {
	content, err := os.ReadFile(schemaPath)
	if err != nil {
		return fmt.Errorf("read schema file: %w", err)
	}
	if _, err := db.Exec(string(content)); err != nil {
		return fmt.Errorf("apply schema: %w", err)
	}
	return nil
}

func MigrateSchema(db *sql.DB) error {
	var tableSQL string
	err := db.QueryRow(`SELECT sql FROM sqlite_master WHERE type='table' AND name='monitors'`).Scan(&tableSQL)
	if err == sql.ErrNoRows {
		// Table doesn't exist yet, it will be created by InitSchema
		return nil
	} else if err != nil {
		return fmt.Errorf("check schema: %w", err)
	}

	// If the table SQL contains the old constraint, we need to migrate it
	if strings.Contains(tableSQL, "check_interval_seconds IN (30, 60, 300, 600)") {
		if err := rebuildMonitorsTable(db); err != nil {
			return err
		}
	}

	// Check if slack_webhook_url column exists in monitors table
	var hasSlackWebhook bool
	rows, err := db.Query("PRAGMA table_info(monitors)")
	if err != nil {
		return fmt.Errorf("query table info: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, typeStr string
		var notnull, pk int
		var dfltVal sql.NullString
		if err := rows.Scan(&cid, &name, &typeStr, &notnull, &dfltVal, &pk); err != nil {
			return fmt.Errorf("scan table info: %w", err)
		}
		if name == "slack_webhook_url" {
			hasSlackWebhook = true
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("rows error: %w", err)
	}
	if !hasSlackWebhook {
		if _, err := db.Exec("ALTER TABLE monitors ADD COLUMN slack_webhook_url TEXT"); err != nil {
			return fmt.Errorf("add slack_webhook_url column: %w", err)
		}
	}

	return nil
}

func rebuildMonitorsTable(db *sql.DB) error {
	ctx := context.Background()
	conn, err := db.Conn(ctx)
	if err != nil {
		return fmt.Errorf("get db connection: %w", err)
	}
	defer conn.Close()

	// Disable foreign keys on this connection for table rebuild
	if _, err := conn.ExecContext(ctx, "PRAGMA foreign_keys = OFF;"); err != nil {
		return fmt.Errorf("disable foreign keys: %w", err)
	}

	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// Create a temporary new table with the relaxed check constraint
	_, err = tx.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS monitors_new (
		  id TEXT PRIMARY KEY,
		  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		  name TEXT NOT NULL,
		  url TEXT NOT NULL,
		  type TEXT NOT NULL CHECK (type IN ('website', 'api')),
		  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE')),
		  expected_status_code INT NOT NULL,
		  expected_response_time_ms INT NOT NULL,
		  check_interval_seconds INT NOT NULL CHECK (check_interval_seconds >= 5),
		  headers TEXT DEFAULT '{}',
		  request_body TEXT,
		  expected_body_contains TEXT,
		  enabled BOOLEAN NOT NULL DEFAULT 1,
		  last_status TEXT,
		  last_checked_at DATETIME,
		  last_response_time_ms INT,
		  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("create monitors_new table: %w", err)
	}

	// Copy data from the old table
	_, err = tx.ExecContext(ctx, `
		INSERT INTO monitors_new (
			id, user_id, name, url, type, method, expected_status_code, expected_response_time_ms,
			check_interval_seconds, headers, request_body, expected_body_contains, enabled,
			last_status, last_checked_at, last_response_time_ms, created_at, updated_at
		)
		SELECT
			id, user_id, name, url, type, method, expected_status_code, expected_response_time_ms,
			check_interval_seconds, headers, request_body, expected_body_contains, enabled,
			last_status, last_checked_at, last_response_time_ms, created_at, updated_at
		FROM monitors;
	`)
	if err != nil {
		return fmt.Errorf("copy data to monitors_new: %w", err)
	}

	// Drop old table
	if _, err := tx.ExecContext(ctx, `DROP TABLE monitors;`); err != nil {
		return fmt.Errorf("drop old monitors table: %w", err)
	}

	// Rename new table to original name
	if _, err := tx.ExecContext(ctx, `ALTER TABLE monitors_new RENAME TO monitors;`); err != nil {
		return fmt.Errorf("rename monitors_new: %w", err)
	}

	// Recreate index
	if _, err := tx.ExecContext(ctx, `CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);`); err != nil {
		return fmt.Errorf("recreate index: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration tx: %w", err)
	}

	// Re-enable foreign keys
	if _, err := conn.ExecContext(ctx, "PRAGMA foreign_keys = ON;"); err != nil {
		return fmt.Errorf("enable foreign keys: %w", err)
	}

	return nil
}
