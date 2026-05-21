# DevDeck — Developer Workbench

> Estado: propuesta de producto · Última actualización: Mayo 2026

DevDeck empezó como una memoria externa para developers: guardar, organizar y recuperar repos, CLIs, snippets, prompts, comandos, workflows y notas con contexto. El siguiente paso no es convertirlo en un IDE, un launcher genérico ni un clon de herramientas existentes.

El siguiente paso es más específico:

> **DevDeck convierte conocimiento dev guardado en acciones reutilizables.**

La diferencia importa. No queremos competir frontalmente con Raycast, Postman, DevToys, Notion, Obsidian o cualquier otra herramienta que ya hace bien su trabajo. Queremos que DevDeck sea la capa personal donde lo que encontrás, aprendés y usás queda conectado a acciones concretas: copiar un comando, abrir un runbook, probar un request, formatear un payload, reutilizar un snippet o recuperar una decisión técnica.

---

## 1. Principio de producto

DevDeck debe ser una herramienta diaria, pero no por acumulación infinita de features. Debe ganarse ese lugar por hacer muy bien tres cosas:

1. **Capturar rápido** lo que un developer no quiere perder.
2. **Recuperar por intención** aunque no recuerdes el nombre exacto.
3. **Accionar sin fricción** sobre ese conocimiento cuando vuelve a ser útil.

La promesa no es "tener todas las herramientas". La promesa es:

> Guardá una vez. Encontrá cuando importa. Reutilizá sin reconstruir contexto.

---

## 2. Qué es y qué no es

### Es

- Una memoria externa para trabajo de desarrollo.
- Un vault de assets dev: repos, CLIs, prompts, snippets, requests, comandos, workflows y runbooks.
- Un workbench local-first para tareas pequeñas y frecuentes.
- Una capa de contexto entre herramientas que ya usás.
- Un producto open-source que debe ser útil incluso sin cuenta cloud ni IA obligatoria.

### No es

- Un IDE.
- Un reemplazo completo de Raycast, Alfred, Postman, Insomnia, DevToys, 1Password o Notion.
- Un launcher genérico del sistema.
- Un gestor de secretos casero.
- Un chatbot que intenta responder cualquier cosa.

---

## 3. La frontera correcta

Cada nueva herramienta integrada debe pasar esta prueba:

> **¿Esta acción se vuelve más valiosa porque está conectada al vault de DevDeck?**

Si la respuesta es no, probablemente pertenece a otra app.

Ejemplos:

| Idea | Encaja si... | No encaja si... |
|------|--------------|-----------------|
| JSON formatter | Podés guardar el payload formateado como snippet, request o nota de debugging. | Solo duplica una web cualquiera de formateo. |
| JWT decoder | Ayuda a inspeccionar tokens localmente sin enviar datos sensibles fuera. | DevDeck empieza a almacenar tokens sin modelo de seguridad serio. |
| API tester | Requests rápidos se guardan como items reutilizables por proyecto. | Intenta reemplazar colecciones complejas de Postman. |
| Command palette | Busca items, comandos, tools y runbooks del vault. | Quiere reemplazar todo el launcher del sistema. |
| Clipboard/snippets | Reutiliza comandos y fragmentos explícitamente guardados. | Vigila todo el portapapeles por defecto. |

---

## 4. Developer Workbench

El módulo **Developer Workbench** agrupa utilidades pequeñas, locales y rápidas. Su objetivo es reducir cambios de contexto y evitar que el usuario pegue datos sensibles en webs aleatorias.

### 4.1 Utilities locales

Primera tanda recomendada:

- JSON formatter / validator.
- JWT decoder local.
- Base64 encode/decode.
- URL encode/decode.
- UUID generator.
- UNIX timestamp converter.
- SHA-256 / SHA-1 hash generator.
- Regex tester simple.

Reglas:

- Deben funcionar offline.
- No deben enviar input a servidores externos.
- Deben abrir rápido.
- Deben permitir copiar el resultado.
- Cuando tenga sentido, deben permitir guardar el resultado como item del vault.

### 4.2 Command Palette

La paleta debe empezar como una superficie de DevDeck, no como una promesa de reemplazar el sistema operativo.

MVP:

- Buscar items del vault.
- Abrir una utility.
- Copiar comandos de cheatsheets.
- Crear item rápido desde texto o URL.
- Filtrar por tipo (`repo`, `cli`, `snippet`, `prompt`, `request`, `workflow`).

Después:

- Atajo global en Desktop.
- Acciones rápidas por item.
- Resultados project-aware según el repo/carpeta actual.

### 4.3 Quick API Tester

No debe intentar ser Postman. Debe resolver el caso de uso rápido:

- Probar `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Headers y body básicos.
- Ver status, headers y respuesta.
- Copiar respuesta.
- Guardar request como item.
- Asociar request a proyecto, stack o runbook.

La ventaja de DevDeck no es tener más opciones que Postman. Es que un request queda junto al conocimiento que explica por qué existe.

### 4.4 Project-Aware Mode

Esta es una de las apuestas más importantes.

Cuando el usuario está trabajando en un repo o proyecto, DevDeck debería poder mostrar:

- Comandos frecuentes.
- `.env` esperados sin exponer secretos.
- Links internos.
- Runbooks.
- Requests API relacionados.
- Snippets guardados.
- Decisiones o notas técnicas.

Esto convierte DevDeck en memoria de trabajo, no solo archivo histórico.

---

## 5. Features sensibles

Algunas ideas son útiles, pero tienen coste alto o riesgo de confianza. Deben entrar más tarde y con reglas estrictas.

### Clipboard History y Snippet Expander

Valor:

- Reutilizar comandos y snippets sin buscarlos manualmente.
- Expandir alias personales como `:docker-run` o `:gh-release`.

Riesgos:

- Privacidad.
- Permisos del sistema.
- Captura accidental de secretos.

Reglas mínimas:

- Opt-in explícito.
- Pausa rápida.
- Lista de apps excluidas.
- Nunca sincronizar historial de portapapeles por defecto.
- Expansions basadas en snippets guardados, no vigilancia silenciosa.

### Screenshot to Code

Valor:

- Extraer código de videos, cursos, imágenes o screenshots.
- Guardarlo como snippet con contexto.

Riesgos:

- OCR imperfecto.
- Coste de IA.
- Demostración llamativa pero no necesariamente core.

Debe entrar después de que captura, búsqueda y utilities sean sólidas.

### Local Secret / Env Manager

Valor:

- Evitar perder tokens y variables entre proyectos.
- Ayudar a recordar qué variables necesita cada repo.

Riesgo:

- Seguridad. Esta feature no admite improvisación.

Regla:

> DevDeck puede ayudar a documentar variables esperadas y abrir integraciones con gestores seguros, pero no debe implementar criptografía propia.

Si se hace, debe usar mecanismos nativos:

- macOS Keychain.
- Windows Credential Manager.
- Linux Secret Service.
- Integraciones con 1Password, Bitwarden o `pass`.

---

## 6. Roadmap recomendado

### Fase 1 — Workbench MVP

Objetivo: utilidad diaria inmediata.

- Sección `Tools` o `Workbench`.
- JSON formatter / validator.
- JWT decoder local.
- Base64 / URL tools.
- UUID y timestamp tools.
- Copiar resultado.
- Guardar output como snippet o nota.

Éxito:

- Una utility abre en menos de 500 ms en Desktop.
- El usuario puede resolver una tarea común sin salir de DevDeck.
- Ningún input sensible se envía fuera del dispositivo.

### Fase 2 — Palette MVP

Objetivo: recuperar y accionar más rápido.

- Paleta dentro de la app.
- Buscar items.
- Abrir tools.
- Copiar comandos.
- Crear item rápido.
- Acciones por tipo de item.

Éxito:

- Copiar un comando guardado requiere como máximo dos acciones.
- Crear un item desde texto o URL toma menos de 3 segundos.

### Fase 3 — Requests y Runbooks

Objetivo: conectar ejecución ligera con conocimiento.

- Quick API Tester.
- Guardar request como item.
- Asociar requests a proyectos/runbooks.
- Ejecutar comandos documentados con confirmación humana.

Éxito:

- Un request probado hoy puede recuperarse y reutilizarse mañana sin reconstruir contexto.

### Fase 4 — Project-Aware DevDeck

Objetivo: que DevDeck entienda el contexto local de trabajo.

- Detectar repo/carpeta actual desde Desktop o CLI.
- Mostrar items relacionados.
- Sugerir comandos y runbooks por proyecto.
- Importar metadata local no sensible.

Éxito:

- Al entrar a un proyecto viejo, DevDeck te devuelve el mapa de trabajo en segundos.

### Fase 5 — Features avanzadas opt-in

Objetivo: ampliar poder sin romper confianza.

- Clipboard/snippet expander.
- OCR screenshot to snippet.
- Integraciones con gestores de secretos.
- Atajo global del sistema.

Éxito:

- Cada feature sensible tiene permisos claros, configuración visible y modo de apagado inmediato.

---

## 7. Métricas de producto

Métricas útiles para saber si esto funciona:

- **Time to capture:** tiempo para guardar un item nuevo.
- **Time to reuse:** tiempo para encontrar y reutilizar un comando/snippet/request.
- **Weekly saved items:** items capturados por semana.
- **Weekly reused items:** items abiertos, copiados o accionados por semana.
- **Tool usage:** utilities usadas por semana.
- **Local trust:** porcentaje de acciones ejecutadas sin red.
- **Search success:** búsquedas que terminan en abrir/copiar/usar un item.

La métrica más importante no es cuántas features tiene DevDeck. Es cuántas veces evita que el developer reconstruya contexto.

---

## 8. Estrategia open-source

Que hoy haya poca ayuda externa no invalida la dirección. La mayoría de proyectos open-source no reciben contribuciones hasta que el valor es obvio, repetible y fácil de probar.

Para llegar ahí:

- Mantener una demo simple y concreta.
- Documentar issues pequeñas para contributors.
- Separar `good first issue` de trabajo core.
- Publicar ejemplos reales de workflows.
- Evitar promesas grandilocuentes.
- Mostrar cómo DevDeck ahorra tiempo hoy, no solo lo que podría ser mañana.

La comunidad llega cuando el producto ya le resolvió algo a alguien.

---

## 9. Decisión

DevDeck debe evolucionar de:

> "Guardo cosas útiles para desarrollo"

a:

> "Guardo cosas útiles, las encuentro cuando las necesito y las convierto en acciones reutilizables."

Ese es el Developer Workbench.
