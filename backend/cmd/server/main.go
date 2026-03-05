package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"

	"github.com/example/ping-sentinel/backend/internal/config"
	"github.com/example/ping-sentinel/backend/internal/db"
	"github.com/example/ping-sentinel/backend/internal/handlers"
	"github.com/example/ping-sentinel/backend/internal/middleware"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	sqlDB, err := db.NewDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db connection error: %v", err)
	}
	defer sqlDB.Close()

	if err := db.InitSchema(sqlDB, "migrations/001_init.sql"); err != nil {
		log.Fatalf("db schema init error: %v", err)
	}

	h := handlers.New(sqlDB, cfg.JWTSecret)
	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
	}))

	api := app.Group("/api")
	api.Get("/health", h.Health)
	api.Post("/auth/signup", h.SignUp)
	api.Post("/auth/login", h.Login)

	protected := api.Group("", middleware.JWT(cfg.JWTSecret))
	protected.Get("/dashboard/overview", h.DashboardOverview)
	protected.Get("/dashboard/monitors", h.DashboardMonitors)

	protected.Get("/monitors", h.ListMonitors)
	protected.Post("/monitors", h.CreateMonitor)
	protected.Put("/monitors/:id", h.UpdateMonitor)
	protected.Delete("/monitors/:id", h.DeleteMonitor)
	protected.Patch("/monitors/:id/toggle", h.ToggleMonitor)
	protected.Get("/monitors/:id/details", h.GetMonitorDetails)

	log.Printf("server listening on %s:%s", cfg.Host, cfg.Port)
	if err := app.Listen(cfg.Host + ":" + cfg.Port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
