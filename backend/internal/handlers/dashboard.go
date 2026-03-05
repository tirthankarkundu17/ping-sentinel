package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) Health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *Handler) DashboardOverview(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var total, up, down int
	var avgResp *float64
	err := h.DB.QueryRowContext(c.Context(), `
		SELECT
			COUNT(*) AS total,
			SUM(CASE WHEN last_status='UP' THEN 1 ELSE 0 END) AS up,
			SUM(CASE WHEN last_status='DOWN' THEN 1 ELSE 0 END) AS down,
			AVG(last_response_time_ms) AS avg_response_time
		FROM monitors
		WHERE user_id=?
	`, userID).Scan(&total, &up, &down, &avgResp)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load overview"})
	}

	return c.JSON(fiber.Map{
		"total_monitors":       total,
		"monitors_up":          up,
		"monitors_down":        down,
		"avg_response_time_ms": avgResp,
	})
}

func (h *Handler) DashboardMonitors(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	rows, err := h.DB.QueryContext(c.Context(), `
		SELECT m.id, m.name, m.url, m.last_status, m.last_checked_at, m.last_response_time_ms,
		COALESCE((
			SELECT ROUND(100.0 * SUM(CASE WHEN status='UP' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 2)
			FROM monitor_checks mc WHERE mc.monitor_id = m.id
		), 0) AS uptime_percent
		FROM monitors m
		WHERE m.user_id=?
		ORDER BY m.created_at DESC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load monitor dashboard"})
	}
	defer rows.Close()

	items := make([]fiber.Map, 0)
	for rows.Next() {
		var id, name, url string
		var lastStatus *string
		var lastCheckedAt *time.Time
		var lastResponseTime *int
		var uptime float64
		if err := rows.Scan(&id, &name, &url, &lastStatus, &lastCheckedAt, &lastResponseTime, &uptime); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to parse monitor dashboard"})
		}
		items = append(items, fiber.Map{
			"id":               id,
			"name":             name,
			"url":              url,
			"status":           lastStatus,
			"last_check":       lastCheckedAt,
			"response_time_ms": lastResponseTime,
			"uptime_percent":   uptime,
		})
	}

	return c.JSON(items)
}
