package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	_ "modernc.org/sqlite"
)

func TestDashboardOverview_Empty(t *testing.T) {
	// Setup in-memory DB
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	// Create monitors table
	_, err = db.Exec(`
		CREATE TABLE monitors (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			last_status TEXT,
			last_response_time_ms INT
		);
	`)
	if err != nil {
		t.Fatalf("failed to create monitors table: %v", err)
	}

	h := New(db, "secret")
	app := fiber.New()

	// Bypass JWT middleware for testing by injecting userID directly in Locals
	app.Get("/dashboard/overview", func(c *fiber.Ctx) error {
		c.Locals("userID", "test-user")
		return h.DashboardOverview(c)
	})

	req := httptest.NewRequest("GET", "/dashboard/overview", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("failed to run test request: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status OK, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var res map[string]interface{}
	if err := json.Unmarshal(body, &res); err != nil {
		t.Fatalf("failed to parse response body: %v", err)
	}

	if total, ok := res["total_monitors"].(float64); !ok || total != 0 {
		t.Errorf("expected total_monitors to be 0, got %v", res["total_monitors"])
	}
	if up, ok := res["monitors_up"].(float64); !ok || up != 0 {
		t.Errorf("expected monitors_up to be 0, got %v", res["monitors_up"])
	}
	if down, ok := res["monitors_down"].(float64); !ok || down != 0 {
		t.Errorf("expected monitors_down to be 0, got %v", res["monitors_down"])
	}
	if avg := res["avg_response_time_ms"]; avg != nil {
		t.Errorf("expected avg_response_time_ms to be nil/null, got %v", avg)
	}
}
