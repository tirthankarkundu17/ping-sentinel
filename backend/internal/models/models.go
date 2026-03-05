package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Monitor struct {
	ID                     string     `json:"id"`
	UserID                 string     `json:"user_id"`
	Name                   string     `json:"name"`
	URL                    string     `json:"url"`
	Type                   string     `json:"type"`
	Method                 string     `json:"method"`
	ExpectedStatusCode     int        `json:"expected_status_code"`
	ExpectedResponseTimeMS int        `json:"expected_response_time_ms"`
	CheckIntervalSeconds   int        `json:"check_interval_seconds"`
	Headers                *string    `json:"headers"`
	RequestBody            *string    `json:"request_body"`
	ExpectedBodyContains   *string    `json:"expected_body_contains"`
	Enabled                bool       `json:"enabled"`
	LastStatus             *string    `json:"last_status"`
	LastCheckedAt          *time.Time `json:"last_checked_at"`
	LastResponseTimeMS     *int       `json:"last_response_time_ms"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type MonitorCheck struct {
	ID             int64     `json:"id"`
	MonitorID      string    `json:"monitor_id"`
	UserID         string    `json:"user_id"`
	Timestamp      time.Time `json:"timestamp"`
	Status         string    `json:"status"`
	ResponseTimeMS *int      `json:"response_time_ms"`
	HTTPStatus     *int      `json:"http_status"`
	ErrorMessage   *string   `json:"error_message"`
}
