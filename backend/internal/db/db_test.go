package db

import (
	"database/sql"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

func TestMigrateSchema(t *testing.T) {
	// 1. Open in-memory sqlite db
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	// 2. Setup mock tables representing the old schema
	_, err = db.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL
		);

		CREATE TABLE monitors (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			type TEXT NOT NULL CHECK (type IN ('website', 'api')),
			method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE')),
			expected_status_code INT NOT NULL,
			expected_response_time_ms INT NOT NULL,
			check_interval_seconds INT NOT NULL CHECK (check_interval_seconds IN (30, 60, 300, 600)),
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

		CREATE INDEX idx_monitors_user_id ON monitors(user_id);
	`)
	if err != nil {
		t.Fatalf("failed to create old schema: %v", err)
	}

	// 3. Insert some dummy data
	_, err = db.Exec(`
		INSERT INTO users (id, email, password_hash) VALUES ('u1', 'test@example.com', 'hash');
		INSERT INTO monitors (id, user_id, name, url, type, method, expected_status_code, expected_response_time_ms, check_interval_seconds)
		VALUES ('m1', 'u1', 'Google', 'https://google.com', 'website', 'GET', 200, 1000, 60);
	`)
	if err != nil {
		t.Fatalf("failed to insert dummy data: %v", err)
	}

	// Verify inserting a non-conforming interval fails on the old schema
	_, err = db.Exec(`
		INSERT INTO monitors (id, user_id, name, url, type, method, expected_status_code, expected_response_time_ms, check_interval_seconds)
		VALUES ('m2', 'u1', 'Invalid', 'https://example.com', 'website', 'GET', 200, 1000, 45);
	`)
	if err == nil {
		t.Error("expected constraint error inserting 45s interval on old schema, but got no error")
	}

	// 4. Run the schema migration
	err = MigrateSchema(db)
	if err != nil {
		t.Fatalf("MigrateSchema failed: %v", err)
	}

	// 5. Verify the schema is updated
	var tableSQL string
	err = db.QueryRow(`SELECT sql FROM sqlite_master WHERE type='table' AND name='monitors'`).Scan(&tableSQL)
	if err != nil {
		t.Fatalf("failed to get migrated schema: %v", err)
	}

	if !strings.Contains(tableSQL, "check_interval_seconds >= 5") {
		t.Errorf("expected new constraint 'check_interval_seconds >= 5' in schema, got: %s", tableSQL)
	}
	if strings.Contains(tableSQL, "IN (30, 60, 300, 600)") {
		t.Errorf("expected old constraint to be removed from schema, got: %s", tableSQL)
	}

	// 6. Verify existing data is preserved
	var name string
	var interval int
	err = db.QueryRow(`SELECT name, check_interval_seconds FROM monitors WHERE id='m1'`).Scan(&name, &interval)
	if err != nil {
		t.Fatalf("failed to query existing monitor: %v", err)
	}
	if name != "Google" || interval != 60 {
		t.Errorf("expected preserved monitor data 'Google' and 60, got: name=%q, interval=%d", name, interval)
	}

	// 7. Verify we can insert a custom check interval (45 seconds) now
	_, err = db.Exec(`
		INSERT INTO monitors (id, user_id, name, url, type, method, expected_status_code, expected_response_time_ms, check_interval_seconds)
		VALUES ('m2', 'u1', 'Valid Custom', 'https://example.com', 'website', 'GET', 200, 1000, 45);
	`)
	if err != nil {
		t.Errorf("failed to insert custom interval after migration: %v", err)
	}

	// Verify we still enforce the minimum limit of 5s
	_, err = db.Exec(`
		INSERT INTO monitors (id, user_id, name, url, type, method, expected_status_code, expected_response_time_ms, check_interval_seconds)
		VALUES ('m3', 'u1', 'Too Low', 'https://example.com', 'website', 'GET', 200, 1000, 4);
	`)
	if err == nil {
		t.Error("expected constraint error inserting 4s interval on migrated schema, but got no error")
	}
}
