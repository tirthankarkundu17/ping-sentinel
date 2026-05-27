package main

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "modernc.org/sqlite"
)

func TestDeleteExpiredChecks(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory sqlite db: %v", err)
	}
	defer db.Close()

	// Create monitor_checks table
	_, err = db.Exec(`
		CREATE TABLE monitor_checks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			monitor_id TEXT NOT NULL,
			user_id TEXT NOT NULL,
			timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			status TEXT NOT NULL CHECK (status IN ('UP', 'DOWN')),
			response_time_ms INT,
			http_status INT,
			error_message TEXT
		);
	`)
	if err != nil {
		t.Fatalf("failed to create table: %v", err)
	}

	// Insert test data:
	// 1. Current timestamp check
	_, err = db.Exec(`
		INSERT INTO monitor_checks (monitor_id, user_id, timestamp, status)
		VALUES ('m1', 'u1', datetime('now'), 'UP')
	`)
	if err != nil {
		t.Fatalf("failed to insert current check: %v", err)
	}

	// 2. 6 days ago check
	_, err = db.Exec(`
		INSERT INTO monitor_checks (monitor_id, user_id, timestamp, status)
		VALUES ('m1', 'u1', datetime('now', '-6 days'), 'UP')
	`)
	if err != nil {
		t.Fatalf("failed to insert 6-day old check: %v", err)
	}

	// 3. 8 days ago check
	_, err = db.Exec(`
		INSERT INTO monitor_checks (monitor_id, user_id, timestamp, status)
		VALUES ('m1', 'u1', datetime('now', '-8 days'), 'DOWN')
	`)
	if err != nil {
		t.Fatalf("failed to insert 8-day old check: %v", err)
	}

	// Verify we have 3 records initially
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM monitor_checks").Scan(&count)
	if err != nil {
		t.Fatalf("failed to query count: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 records, got %d", count)
	}

	// Test 1: TTL is 0 (should be a no-op, no rows deleted)
	err = deleteExpiredChecks(context.Background(), db, 0)
	if err != nil {
		t.Fatalf("deleteExpiredChecks failed for TTL=0: %v", err)
	}
	err = db.QueryRow("SELECT COUNT(*) FROM monitor_checks").Scan(&count)
	if err != nil {
		t.Fatalf("failed to query count: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 records when TTL is 0, got %d", count)
	}

	// Test 2: TTL is 7 (should delete the 8-day-old check)
	err = deleteExpiredChecks(context.Background(), db, 7)
	if err != nil {
		t.Fatalf("deleteExpiredChecks failed: %v", err)
	}

	// Verify we have 2 records remaining (current & 6-day old ones)
	err = db.QueryRow("SELECT COUNT(*) FROM monitor_checks").Scan(&count)
	if err != nil {
		t.Fatalf("failed to query count: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2 records remaining, got %d", count)
	}

	// Verify that the remaining records are indeed the correct ones (not the 8 days one)
	var remainingIds []int
	rows, err := db.Query("SELECT id FROM monitor_checks ORDER BY id ASC")
	if err != nil {
		t.Fatalf("failed to query remaining: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan error: %v", err)
		}
		remainingIds = append(remainingIds, id)
	}

	if len(remainingIds) != 2 || remainingIds[0] != 1 || remainingIds[1] != 2 {
		t.Errorf("expected remaining record IDs to be [1, 2], got %v", remainingIds)
	}
}

func TestParseHeaders(t *testing.T) {
	tests := []struct {
		name     string
		input    sql.NullString
		expected int
	}{
		{
			name:     "Invalid NullString",
			input:    sql.NullString{Valid: false, String: ""},
			expected: 0,
		},
		{
			name:     "Empty String",
			input:    sql.NullString{Valid: true, String: ""},
			expected: 0,
		},
		{
			name:     "Invalid JSON",
			input:    sql.NullString{Valid: true, String: "{invalid}"},
			expected: 0,
		},
		{
			name:     "Valid Headers",
			input:    sql.NullString{Valid: true, String: `{"Content-Type": "application/json", "Authorization": "Bearer 123"}`},
			expected: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseHeaders(tt.input)
			if len(result) != tt.expected {
				t.Errorf("expected header map length %d, got %d", tt.expected, len(result))
			}
			if tt.expected > 0 {
				if result["Content-Type"] != "application/json" {
					t.Errorf("expected Content-Type application/json, got %q", result["Content-Type"])
				}
			}
		})
	}
}

func TestParseRequestBody(t *testing.T) {
	tests := []struct {
		name     string
		input    sql.NullString
		expected []byte
	}{
		{
			name:     "Invalid NullString",
			input:    sql.NullString{Valid: false, String: ""},
			expected: nil,
		},
		{
			name:     "Valid NullString",
			input:    sql.NullString{Valid: true, String: "hello world"},
			expected: []byte("hello world"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseRequestBody(tt.input)
			if string(result) != string(tt.expected) {
				t.Errorf("expected request body %q, got %q", string(tt.expected), string(result))
			}
		})
	}
}

func TestGetEnvInt(t *testing.T) {
	const key = "TEST_GET_ENV_INT_KEY"
	defer os.Unsetenv(key)

	t.Run("Env not set", func(t *testing.T) {
		os.Unsetenv(key)
		result := getEnvInt(key, 42)
		if result != 42 {
			t.Errorf("expected fallback 42, got %d", result)
		}
	})

	t.Run("Env set to invalid integer", func(t *testing.T) {
		os.Setenv(key, "not_an_int")
		result := getEnvInt(key, 42)
		if result != 42 {
			t.Errorf("expected fallback 42, got %d", result)
		}
	})

	t.Run("Env set to valid integer", func(t *testing.T) {
		os.Setenv(key, "100")
		result := getEnvInt(key, 42)
		if result != 100 {
			t.Errorf("expected 100, got %d", result)
		}
	})
}
