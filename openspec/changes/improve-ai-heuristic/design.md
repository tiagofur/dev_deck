# SDD Design: Improve Heuristic AI Tagger (P1.4)

**ID del Cambio:** `improve-ai-heuristic`  
**Estrategia:** `hybrid`  
**Fase:** Design  

---

## 1. Diseño de la Lógica de Análisis en Go

### 1.1. Análisis Avanzado de URLs (`hostTag`)
Analizaremos no solo el dominio de la URL, sino también sus subcarpetas y dominios de paquetes populares para añadir tags automáticos y ultra-específicos:

```go
func hostAndEcosystemTags(rawURL *string) []string {
	if rawURL == nil || strings.TrimSpace(*rawURL) == "" {
		return nil
	}
	u, err := url.Parse(*rawURL)
	if err != nil || u.Host == "" {
		return nil
	}
	
	var tags []string
	host := strings.ToLower(strings.TrimPrefix(u.Hostname(), "www."))
	
	// Analizar hosts populares y sus subcarpetas
	switch {
	case host == "github.com":
		tags = append(tags, "github")
	case host == "npmjs.com" || host == "yarnpkg.com":
		tags = append(tags, "npm", "node", "javascript")
	case host == "crates.io":
		tags = append(tags, "rust", "cargo")
	case host == "pypi.org" || host == "pypi.python.org":
		tags = append(tags, "python", "pip")
	case host == "pkg.go.dev":
		tags = append(tags, "go", "golang")
	case host == "hub.docker.com":
		tags = append(tags, "docker", "containers")
	case host == "aws.amazon.com":
		tags = append(tags, "aws", "cloud")
	case host == "cloud.google.com":
		tags = append(tags, "gcp", "cloud")
	case host == "kubernetes.io":
		tags = append(tags, "kubernetes", "k8s")
	default:
		// Fallback genérico para extraer el nombre del host
		parts := strings.Split(host, ".")
		if len(parts) >= 2 {
			tags = append(tags, normalizeTag(parts[len(parts)-2]))
		}
	}
	return tags
}
```

### 1.2. Mapeo de Diccionario Tecnológico (`techKeywordTags`)
Escanear el título y descripción contra un mapa predefinido e inyectar tags asociados:

```go
func techKeywordTags(title, description string) []string {
	combined := strings.ToLower(title + " " + description)
	var tags []string

	// Diccionario de tecnologías
	mappings := []struct {
		keywords []string
		tags     []string
	}{
		{[]string{"react", "nextjs", "next.js", "vue", "angular", "svelte", "nuxt", "tailwind"}, []string{"frontend", "web"}},
		{[]string{"golang", "goroutine", "go-lang"}, []string{"go", "backend"}},
		{[]string{"rustlang", "cargo", "rust"}, []string{"rust", "systems"}},
		{[]string{"python", "django", "flask", "fastapi"}, []string{"python", "backend"}},
		{[]string{"bash", "shell", "zsh", "fish", "command-line", "terminal"}, []string{"cli", "terminal"}},
		{[]string{"postgres", "mysql", "sqlite", "mongodb", "redis", "prisma", "sql", "database"}, []string{"database", "sql"}},
		{[]string{"docker", "kubernetes", "k8s", "helm", "terraform", "ansible"}, []string{"devops", "infrastructure"}},
		{[]string{"openai", "gemini", "llm", "ai", "langchain", "rag", "agent", "deepseek"}, []string{"ai", "machine-learning"}},
		{[]string{"testing", "test", "vitest", "playwright", "jest", "cypress"}, []string{"testing", "qa"}},
		{[]string{"typescript", "ts", "javascript", "js"}, []string{"javascript"}},
	}

	for _, m := range mappings {
		matched := false
		for _, kw := range m.keywords {
			if strings.Contains(combined, kw) {
				matched = true
				break
			}
		}
		if matched {
			tags = append(tags, m.tags...)
		}
	}

	return tags
}
```

---

## 2. Coherencia en la Generación del Resumen

En `Summarize`, diseñaremos un pipeline prioritario para que la heurística entregue resúmenes fluidos de alta legibilidad:

1. **Prioridad 1:** Si `in.WhySaved != ""` -> Generar `fmt.Sprintf("Saved because: %s. %s.", in.WhySaved, in.Title)` (o la descripción si existiese).
2. **Prioridad 2:** Si `in.Description != ""` -> Usar `cleanSentence(in.Description)` recortado a 160 caracteres.
3. **Prioridad 3:** Ecosistema de URL detectado:
   - NPM -> `fmt.Sprintf("NPM package %s saved for node/javascript projects.", title)`
   - Cargo/Rust -> `fmt.Sprintf("Rust crate %s saved for systems development.", title)`
   - PyPI/Python -> `fmt.Sprintf("Python package %s saved for python development.", title)`
   - Go -> `fmt.Sprintf("Go module %s saved for backend development.", title)`
4. **Prioridad 4:** Fallback por tipo de item (usando el mapeo actual con oraciones mejoradas y más humanas).
