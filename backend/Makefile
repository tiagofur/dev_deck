.PHONY: tidy run migrate-up psql lint test

tidy:
	go mod tidy

run:
	go run ./cmd/api

migrate-up:
	for file in migrations/*.sql; do psql "$$DB_URL" -f "$$file"; done

psql:
	psql "$$DB_URL"

test:
	go test ./...

# Quick smoke test (requires server running + API_TOKEN env)
smoke-add:
	curl -s -X POST http://localhost:8080/api/repos \
	  -H "Authorization: Bearer $$API_TOKEN" \
	  -H "Content-Type: application/json" \
	  -d '{"url":"https://github.com/charmbracelet/bubbletea"}' | jq

smoke-list:
	curl -s http://localhost:8080/api/repos \
	  -H "Authorization: Bearer $$API_TOKEN" | jq
