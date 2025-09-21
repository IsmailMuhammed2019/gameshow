# Millionaire Game - Docker Management

.PHONY: help dev prod stop clean logs backend frontend db

# Default target
help:
	@echo "Millionaire Game - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  dev          Start development environment"
	@echo "  dev-build    Build and start development environment"
	@echo "  dev-logs     View development logs"
	@echo ""
	@echo "Production:"
	@echo "  prod         Start production environment"
	@echo "  prod-build   Build and start production environment"
	@echo "  prod-logs    View production logs"
	@echo ""
	@echo "Management:"
	@echo "  stop         Stop all containers"
	@echo "  clean        Stop and remove all containers and volumes"
	@echo "  logs         View logs for all services"
	@echo ""
	@echo "Individual Services:"
	@echo "  backend      Start only backend service"
	@echo "  frontend     Start only frontend service"
	@echo "  db           Start only database service"
	@echo ""
	@echo "Database:"
	@echo "  db-reset     Reset database (remove and recreate)"
	@echo "  db-seed      Seed database with sample data"
	@echo "  db-migrate   Run database migrations"

# Development environment
dev:
	docker-compose -f docker-compose.dev.yml up

dev-build:
	docker-compose -f docker-compose.dev.yml up --build

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

# Production environment
prod:
	docker-compose up

prod-build:
	docker-compose up --build

prod-logs:
	docker-compose logs -f

# Management commands
stop:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

clean:
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.dev.yml down -v --remove-orphans
	docker system prune -f

logs:
	docker-compose logs -f

# Individual services
backend:
	docker-compose -f docker-compose.dev.yml up backend

frontend:
	docker-compose -f docker-compose.dev.yml up frontend

db:
	docker-compose -f docker-compose.dev.yml up postgres

# Database commands
db-reset:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.dev.yml up postgres -d
	sleep 5
	docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name init
	docker-compose -f docker-compose.dev.yml exec backend npx prisma db seed

db-seed:
	docker-compose -f docker-compose.dev.yml exec backend npx prisma db seed

db-migrate:
	docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate dev
