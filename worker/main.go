package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	_ "modernc.org/sqlite"

	"github.com/joho/godotenv"
)

type monitor struct {
	ID                     string
	UserID                 string
	URL                    string
	Method                 string
	ExpectedStatusCode     int
	ExpectedResponseTimeMS int
	Headers                sql.NullString
	RequestBody            sql.NullString
	ExpectedBodyContains   sql.NullString
}

func main() {
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required for worker")
	}

	pollSeconds := getEnvInt("WORKER_POLL_INTERVAL_SECONDS", 30)
	if pollSeconds <= 0 {
		pollSeconds = 30
	}

	db, err := newDB(databaseURL)
	if err != nil {
		log.Fatalf("database connection error: %v", err)
	}
	defer db.Close()

	log.Printf("worker started (poll=%ds)", pollSeconds)
	if err := runDueChecks(context.Background(), db); err != nil {
		log.Printf("initial due-check batch failed: %v", err)
	}

	ticker := time.NewTicker(time.Duration(pollSeconds) * time.Second)
	defer ticker.Stop()

	sigC := make(chan os.Signal, 1)
	signal.Notify(sigC, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-ticker.C:
			if err := runDueChecks(context.Background(), db); err != nil {
				log.Printf("due-check batch failed: %v", err)
			} else {
				log.Printf("due-check batch completed")
			}
		case sig := <-sigC:
			log.Printf("received signal %s, shutting down worker", sig)
			return
		}
	}
}

func newDB(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", databaseURL)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
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

func runDueChecks(ctx context.Context, db *sql.DB) error {
	rows, err := db.QueryContext(ctx, `
		SELECT id, user_id, url, method, expected_status_code, expected_response_time_ms,
			headers, request_body, expected_body_contains
		FROM monitors
		WHERE enabled = 1
			AND (
				last_checked_at IS NULL OR
				(strftime('%s','now') - strftime('%s', last_checked_at)) >= check_interval_seconds
			)
		ORDER BY CASE WHEN last_checked_at IS NULL THEN 0 ELSE 1 END, last_checked_at ASC
		LIMIT 100
	`)
	if err != nil {
		return fmt.Errorf("query due monitors: %w", err)
	}
	defer rows.Close()

	var monitors []monitor
	for rows.Next() {
		var m monitor
		if err := rows.Scan(
			&m.ID,
			&m.UserID,
			&m.URL,
			&m.Method,
			&m.ExpectedStatusCode,
			&m.ExpectedResponseTimeMS,
			&m.Headers,
			&m.RequestBody,
			&m.ExpectedBodyContains,
		); err != nil {
			return fmt.Errorf("scan monitor: %w", err)
		}
		monitors = append(monitors, m)
	}
	rows.Close()

	for _, m := range monitors {
		if err := executeCheck(ctx, db, m); err != nil {
			log.Printf("monitor %s check failed: %v", m.ID, err)
		}
	}

	return rows.Err()
}

func executeCheck(ctx context.Context, db *sql.DB, m monitor) error {
	started := time.Now()
	status := "DOWN"
	var httpStatus *int
	var errorMessage *string
	var responseTime *int

	headers := parseHeaders(m.Headers)
	reqBody := parseRequestBody(m.RequestBody)

	timeoutMS := m.ExpectedResponseTimeMS + 2000
	if timeoutMS < 3000 {
		timeoutMS = 3000
	}

	checkCtx, cancel := context.WithTimeout(ctx, time.Duration(timeoutMS+1000)*time.Millisecond)
	defer cancel()

	respStatus, bodyText, err := performRequest(checkCtx, m.Method, m.URL, headers, reqBody)
	elapsed := int(time.Since(started).Milliseconds())
	responseTime = &elapsed
	if err != nil {
		msg := err.Error()
		errorMessage = &msg
	} else {
		httpStatus = &respStatus

		statusMatches := respStatus == m.ExpectedStatusCode
		timeMatches := elapsed <= m.ExpectedResponseTimeMS
		bodyMatches := true
		if m.ExpectedBodyContains.Valid && m.ExpectedBodyContains.String != "" {
			bodyMatches = strings.Contains(bodyText, m.ExpectedBodyContains.String)
		}

		if statusMatches && timeMatches && bodyMatches {
			status = "UP"
		} else {
			if !statusMatches {
				msg := fmt.Sprintf("Expected status %d, got %d", m.ExpectedStatusCode, respStatus)
				errorMessage = &msg
			} else if !timeMatches {
				msg := fmt.Sprintf("Response time %dms exceeded threshold %dms", elapsed, m.ExpectedResponseTimeMS)
				errorMessage = &msg
			} else {
				msg := "Expected response body pattern not found"
				errorMessage = &msg
			}
		}
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO monitor_checks (monitor_id, user_id, timestamp, status, response_time_ms, http_status, error_message)
		VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
	`, m.ID, m.UserID, status, responseTime, httpStatus, errorMessage); err != nil {
		return fmt.Errorf("insert monitor check: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE monitors
		SET last_status = ?,
			last_checked_at = CURRENT_TIMESTAMP,
			last_response_time_ms = ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, status, responseTime, m.ID); err != nil {
		return fmt.Errorf("update monitor state: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	return nil
}

func performRequest(ctx context.Context, method, url string, headers map[string]string, reqBody []byte) (int, string, error) {
	var bodyReader io.Reader
	if reqBody != nil {
		bodyReader = bytes.NewReader(reqBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return 0, "", err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()

	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, "", err
	}
	return resp.StatusCode, string(b), nil
}

func parseHeaders(raw sql.NullString) map[string]string {
	if !raw.Valid || strings.TrimSpace(raw.String) == "" {
		return map[string]string{}
	}
	var headers map[string]string
	if err := json.Unmarshal([]byte(raw.String), &headers); err != nil {
		return map[string]string{}
	}
	if headers == nil {
		return map[string]string{}
	}
	return headers
}

func parseRequestBody(raw sql.NullString) []byte {
	if !raw.Valid {
		return nil
	}
	return []byte(raw.String)
}

func getEnvInt(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
