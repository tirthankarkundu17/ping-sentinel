package handlers

import (
	"testing"
)

func TestValidateMonitorRequest_Intervals(t *testing.T) {
	tests := []struct {
		name      string
		interval  int
		expectErr bool
	}{
		{
			name:      "Interval too low (4s)",
			interval:  4,
			expectErr: true,
		},
		{
			name:      "Interval minimum edge (5s)",
			interval:  5,
			expectErr: false,
		},
		{
			name:      "Interval standard (60s)",
			interval:  60,
			expectErr: false,
		},
		{
			name:      "Interval custom (1234s)",
			interval:  1234,
			expectErr: false,
		},
		{
			name:      "Interval maximum edge (86400s)",
			interval:  86400,
			expectErr: false,
		},
		{
			name:      "Interval too high (86401s)",
			interval:  86401,
			expectErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := monitorRequest{
				Name:                   "Test Monitor",
				URL:                    "https://example.com",
				Type:                   "website",
				Method:                 "GET",
				ExpectedStatusCode:     200,
				ExpectedResponseTimeMS: 1000,
				CheckIntervalSeconds:   tt.interval,
			}

			err := validateMonitorRequest(req)
			if (err != nil) != tt.expectErr {
				t.Errorf("expected error: %v, got: %v", tt.expectErr, err)
			}
		})
	}
}
