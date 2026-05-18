package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"devdeck/internal/domain/items"
	"devdeck/internal/store"

	"github.com/google/uuid"
)

// DefaultTools returns the set of standard tools the agent can use.
func DefaultTools(st *store.Store) []Tool {
	return []Tool{
		{
			Name:        "search_vault",
			Description: "Busca herramientas, repositorios y comandos en el vault personal o del equipo. Usala para encontrar información antes de actuar.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"query": {
						"type": "string",
						"description": "El término de búsqueda o pregunta."
					}
				},
				"required": ["query"]
			}`),
			Execute: func(ctx context.Context, args map[string]any) (json.RawMessage, error) {
				query, ok := args["query"].(string)
				if !ok {
					return nil, fmt.Errorf("missing query")
				}
				results, err := st.SearchItems(ctx, store.SearchModeHybrid, query, nil, 5)
				if err != nil {
					return nil, err
				}
				return json.Marshal(results)
			},
		},
		{
			Name:        "create_item",
			Description: "Guarda un nuevo recurso (link, repositorio o nota) en el vault.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"url": { "type": "string", "description": "URL del recurso." },
					"title": { "type": "string", "description": "Título descriptivo." },
					"notes": { "type": "string", "description": "Notas adicionales o explicaciones." },
					"tags": { "type": "array", "items": { "type": "string" } }
				},
				"required": ["title"]
			}`),
			Execute: func(ctx context.Context, args map[string]any) (json.RawMessage, error) {
				title, _ := args["title"].(string)
				url, _ := args["url"].(string)
				notes, _ := args["notes"].(string)
				tagsRaw, _ := args["tags"].([]any)
				
				tags := []string{}
				for _, t := range tagsRaw {
					if ts, ok := t.(string); ok {
						tags = append(tags, ts)
					}
				}

				item, err := st.CreateItem(ctx, store.CreateItemInput{
					Type:          items.TypeRepo, // Defaulting to repo for links
					Title:         title,
					URL:           &url,
					Notes:         notes,
					Tags:          tags,
					SourceChannel: "ai_agent",
				})
				if err != nil {
					return nil, err
				}
				return json.Marshal(item)
			},
		},
		{
			Name:        "create_runbook",
			Description: "Crea una lista de pasos operativos (runbook) vinculada a un item del vault.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"item_id": { "type": "string", "description": "ID del item al que se vincula (UUID)." },
					"title": { "type": "string", "description": "Título del runbook." },
					"steps": { 
						"type": "array", 
						"items": { 
							"type": "object",
							"properties": {
								"label": { "type": "string" },
								"command": { "type": "string" },
								"description": { "type": "string" }
							},
							"required": ["label"]
						} 
					}
				},
				"required": ["item_id", "title", "steps"]
			}`),
			Execute: func(ctx context.Context, args map[string]any) (json.RawMessage, error) {
				itemID, err := uuid.Parse(args["item_id"].(string))
				if err != nil {
					return nil, err
				}
				title, _ := args["title"].(string)
				stepsRaw, _ := args["steps"].([]any)

				rb, err := st.CreateRunbook(ctx, uuid.Nil, itemID, title, nil)
				if err != nil {
					return nil, err
				}

				for _, s := range stepsRaw {
					sm := s.(map[string]any)
					label, _ := sm["label"].(string)
					cmd, _ := sm["command"].(string)
					desc, _ := sm["description"].(string)

					var pCmd, pDesc *string
					if cmd != "" { pCmd = &cmd }
					if desc != "" { pDesc = &desc }

					_, _ = st.CreateRunbookStep(ctx, rb.ID, label, pCmd, pDesc)
				}

				return json.Marshal(rb)
			},
		},
		{
			Name:         "execute_shell_command",
			Description:  "Ejecuta un comando en la terminal local del usuario. Solo disponible en la Desktop App. Requiere aprobación manual del usuario.",
			IsClientSide: true,
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"command": {
						"type": "string",
						"description": "El comando bash a ejecutar localmente."
					}
				},
				"required": ["command"]
			}`),
			Execute: nil, // Delegated to client
		},
		{
			Name:        "read_url",
			Description: "Lee el contenido de una URL externa (documentación, posts, etc.). Usala para obtener información de internet.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"url": { "type": "string", "description": "La URL completa a leer." }
				},
				"required": ["url"]
			}`),
			Execute: func(ctx context.Context, args map[string]any) (json.RawMessage, error) {
				url, ok := args["url"].(string)
				if !ok {
					return nil, fmt.Errorf("missing url")
				}

				client := &http.Client{Timeout: 10 * time.Second}
				req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
				if err != nil {
					return nil, err
				}
				req.Header.Set("User-Agent", "DevDeck-Agent/1.0")

				resp, err := client.Do(req)
				if err != nil {
					return nil, err
				}
				defer resp.Body.Close()

				body, err := io.ReadAll(io.LimitReader(resp.Body, 50000))
				if err != nil {
					return nil, err
				}

				return json.Marshal(map[string]string{
					"content": string(body),
					"info":    "Mostrando los primeros 50KB del contenido.",
				})
			},
		},
	}
}
