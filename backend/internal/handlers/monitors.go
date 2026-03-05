package handlers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type monitorRequest struct {
	Name                   string            `json:"name"`
	URL                    string            `json:"url"`
	Type                   string            `json:"type"`
	Method                 string            `json:"method"`
	ExpectedStatusCode     int               `json:"expected_status_code"`
	ExpectedResponseTimeMS int               `json:"expected_response_time_ms"`
	CheckIntervalSeconds   int               `json:"check_interval_seconds"`
	Headers                map[string]string `json:"headers"`
	RequestBody            *string           `json:"request_body"`
	ExpectedBodyContains   *string           `json:"expected_body_contains"`
	Enabled                bool              `json:"enabled"`
}

func (h *Handler) ListMonitors(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	rows, err := h.DB.QueryContext(c.Context(), `
		SELECT m.id, m.name, m.url, m.type, m.method, m.expected_status_code,
			m.expected_response_time_ms, m.check_interval_seconds, COALESCE(m.headers, '{}'),
			m.request_body, m.expected_body_contains, m.enabled, m.last_status, m.last_checked_at,
			m.last_response_time_ms, m.created_at, m.updated_at,
			COALESCE((
				SELECT ROUND(100.0 * SUM(CASE WHEN status='UP' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2)
				FROM monitor_checks mc WHERE mc.monitor_id = m.id
			), 0) AS uptime_percent
		FROM monitors m
		WHERE m.user_id = ?
		ORDER BY m.created_at DESC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list monitors"})
	}
	defer rows.Close()

	result := make([]fiber.Map, 0)
	for rows.Next() {
		var (
			id, name, url, monitorType, method, headersText string
			expectedStatus, expectedResp, interval          int
			requestBody, expectedBodyContains               *string
			enabled                                         bool
			lastStatus                                      *string
			lastCheckedAt                                   *time.Time
			lastResponseTime                                *int
			createdAt, updatedAt                            time.Time
			uptimePercent                                   float64
		)
		if err := rows.Scan(&id, &name, &url, &monitorType, &method, &expectedStatus, &expectedResp, &interval,
			&headersText, &requestBody, &expectedBodyContains, &enabled, &lastStatus, &lastCheckedAt,
			&lastResponseTime, &createdAt, &updatedAt, &uptimePercent); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to parse monitors"})
		}

		result = append(result, fiber.Map{
			"id":                        id,
			"name":                      name,
			"url":                       url,
			"type":                      monitorType,
			"method":                    method,
			"expected_status_code":      expectedStatus,
			"expected_response_time_ms": expectedResp,
			"check_interval_seconds":    interval,
			"headers":                   headersText,
			"request_body":              requestBody,
			"expected_body_contains":    expectedBodyContains,
			"enabled":                   enabled,
			"last_status":               lastStatus,
			"last_checked_at":           lastCheckedAt,
			"last_response_time_ms":     lastResponseTime,
			"created_at":                createdAt,
			"updated_at":                updatedAt,
			"uptime_percent":            uptimePercent,
		})
	}

	return c.JSON(result)
}

func (h *Handler) CreateMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	var req monitorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := validateMonitorRequest(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	headersText, err := headersToJSON(req.Headers)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid headers"})
	}

	var id string
	monitorID := uuid.NewString()
	err = h.DB.QueryRowContext(c.Context(), `
		INSERT INTO monitors (
			id, user_id, name, url, type, method, expected_status_code, expected_response_time_ms,
			check_interval_seconds, headers, request_body, expected_body_contains, enabled
		) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
		RETURNING id
	`, monitorID, userID, req.Name, req.URL, req.Type, req.Method, req.ExpectedStatusCode, req.ExpectedResponseTimeMS,
		req.CheckIntervalSeconds, headersText, req.RequestBody, req.ExpectedBodyContains, req.Enabled).Scan(&id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create monitor"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}

func (h *Handler) UpdateMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	monitorID := c.Params("id")
	if _, err := uuid.Parse(monitorID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid monitor id"})
	}

	var req monitorRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := validateMonitorRequest(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	headersText, err := headersToJSON(req.Headers)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid headers"})
	}

	ct, err := h.DB.ExecContext(c.Context(), `
		UPDATE monitors
		SET name=?, url=?, type=?, method=?, expected_status_code=?, expected_response_time_ms=?,
			check_interval_seconds=?, headers=?, request_body=?, expected_body_contains=?,
			enabled=?, updated_at=CURRENT_TIMESTAMP
		WHERE id=? AND user_id=?
	`, req.Name, req.URL, req.Type, req.Method, req.ExpectedStatusCode, req.ExpectedResponseTimeMS,
		req.CheckIntervalSeconds, headersText, req.RequestBody, req.ExpectedBodyContains, req.Enabled, monitorID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update monitor"})
	}
	affected, _ := ct.RowsAffected()
	if affected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "monitor not found"})
	}

	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) DeleteMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	monitorID := c.Params("id")

	ct, err := h.DB.ExecContext(c.Context(), `DELETE FROM monitors WHERE id=? AND user_id=?`, monitorID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete monitor"})
	}
	affected, _ := ct.RowsAffected()
	if affected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "monitor not found"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) ToggleMonitor(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	monitorID := c.Params("id")
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	ct, err := h.DB.ExecContext(c.Context(), `UPDATE monitors SET enabled=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?`, body.Enabled, monitorID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to toggle monitor"})
	}
	affected, _ := ct.RowsAffected()
	if affected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "monitor not found"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handler) GetMonitorDetails(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	monitorID := c.Params("id")

	var monitor fiber.Map
	row := h.DB.QueryRowContext(c.Context(), `
		SELECT id, name, url, type, method, expected_status_code, expected_response_time_ms,
			check_interval_seconds, COALESCE(headers, '{}'), request_body, expected_body_contains,
			enabled, last_status, last_checked_at, last_response_time_ms, created_at, updated_at
		FROM monitors WHERE id=? AND user_id=?
	`, monitorID, userID)

	var (
		id, name, url, monitorType, method, headersText string
		expectedStatus, expectedResp, interval          int
		requestBody, expectedBodyContains               *string
		enabled                                         bool
		lastStatus                                      *string
		lastCheckedAt                                   *time.Time
		lastResponseTime                                *int
		createdAt, updatedAt                            time.Time
	)
	if err := row.Scan(&id, &name, &url, &monitorType, &method, &expectedStatus, &expectedResp, &interval,
		&headersText, &requestBody, &expectedBodyContains, &enabled, &lastStatus, &lastCheckedAt,
		&lastResponseTime, &createdAt, &updatedAt); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "monitor not found"})
	}
	monitor = fiber.Map{
		"id":                        id,
		"name":                      name,
		"url":                       url,
		"type":                      monitorType,
		"method":                    method,
		"expected_status_code":      expectedStatus,
		"expected_response_time_ms": expectedResp,
		"check_interval_seconds":    interval,
		"headers":                   headersText,
		"request_body":              requestBody,
		"expected_body_contains":    expectedBodyContains,
		"enabled":                   enabled,
		"last_status":               lastStatus,
		"last_checked_at":           lastCheckedAt,
		"last_response_time_ms":     lastResponseTime,
		"created_at":                createdAt,
		"updated_at":                updatedAt,
	}

	checksRows, err := h.DB.QueryContext(c.Context(), `
		SELECT id, timestamp, status, response_time_ms, http_status, error_message
		FROM monitor_checks
		WHERE monitor_id=? AND user_id=?
		ORDER BY timestamp DESC
		LIMIT 50
	`, monitorID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to fetch checks"})
	}
	defer checksRows.Close()

	checks := make([]fiber.Map, 0)
	for checksRows.Next() {
		var id int64
		var ts time.Time
		var status string
		var responseTime, httpStatus *int
		var errMsg *string
		if err := checksRows.Scan(&id, &ts, &status, &responseTime, &httpStatus, &errMsg); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to parse checks"})
		}
		checks = append(checks, fiber.Map{
			"id":               id,
			"timestamp":        ts,
			"status":           status,
			"response_time_ms": responseTime,
			"http_status":      httpStatus,
			"error_message":    errMsg,
		})
	}

	return c.JSON(fiber.Map{"monitor": monitor, "checks": checks})
}

func validateMonitorRequest(req monitorRequest) error {
	if req.Name == "" || req.URL == "" || req.Type == "" || req.Method == "" {
		return fmt.Errorf("name, url, type and method are required")
	}
	if req.ExpectedStatusCode < 100 || req.ExpectedStatusCode > 599 {
		return fmt.Errorf("expected_status_code must be between 100 and 599")
	}
	if req.ExpectedResponseTimeMS <= 0 {
		return fmt.Errorf("expected_response_time_ms must be positive")
	}
	validIntervals := map[int]bool{30: true, 60: true, 300: true, 600: true}
	if !validIntervals[req.CheckIntervalSeconds] {
		return fmt.Errorf("check_interval_seconds must be 30, 60, 300, or 600")
	}
	validTypes := map[string]bool{"website": true, "api": true}
	if !validTypes[req.Type] {
		return fmt.Errorf("type must be website or api")
	}
	validMethods := map[string]bool{"GET": true, "POST": true, "PUT": true, "DELETE": true}
	if !validMethods[req.Method] {
		return fmt.Errorf("method must be GET, POST, PUT, or DELETE")
	}
	return nil
}

func headersToJSON(headers map[string]string) (string, error) {
	if headers == nil {
		return "{}", nil
	}
	b, err := json.Marshal(headers)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func parseIntParam(c *fiber.Ctx, key string, defaultValue int) int {
	v := c.Query(key)
	if v == "" {
		return defaultValue
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return defaultValue
	}
	return n
}
