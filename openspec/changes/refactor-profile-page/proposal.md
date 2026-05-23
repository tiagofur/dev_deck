# SDD Proposal: Refactor ProfilePage into Sub-components (P1.7)

**ID del Cambio:** `refactor-profile-page`  
**Estrategia:** `hybrid` (Archivos locales en `openspec/` + Engram)  
**Modo de Ejecución:** `interactive`  
**Delivery Strategy:** `ask-on-risk`  

---

## 1. Contexto y Objetivos

El archivo `ProfilePage.tsx` (`packages/features/src/pages/ProfilePage.tsx`) tiene **1019 líneas** y acumula demasiadas responsabilidades en un solo componente:
- Estado del formulario de edición de perfil.
- Lógica interactiva de selección de tags y custom tags para el tech stack.
- Carga de imágenes en Base64, interacción táctil/ratón en un `<canvas>` y zoom para recortar el avatar (`CropModal`).
- Integración de APIs de subida de avatar y sincronización desde GitHub.
- Cálculo de reputación gamificada y renderizado interactivo de badges/logros.
- Layouts masivos y repetitivos de estadísticas, tech stack, decks y timeline de actividad reciente.

### Objetivos del Refactor:
1. **Reducir la complejidad cognitiva:** Dividir el monolito en subcomponentes de menos de 200 líneas con responsabilidades únicas y bien definidas (Single Responsibility Principle).
2. **Facilitar el testing:** Permitir probar el `CropModal` o el `EditProfileModal` de forma aislada sin tener que simular todo el estado del perfil.
3. **Mantener la fidelidad visual y de comportamiento:** No alterar la UX, la estética brutalista ni las traducciones existentes.

---

## 2. Nueva Estructura Arquitectónica

Crearemos un nuevo directorio `packages/features/src/components/Profile/` donde residirán los nuevos componentes extraídos.

```
packages/features/src/
  ├── components/
  │   └── Profile/
  │       ├── EditProfileModal.tsx   <-- Formulario de edición + Stack tags + Upload
  │       ├── CropModal.tsx           <-- Recorte de imagen con canvas y zoom
  │       ├── ReputationDashboard.tsx <-- Stats Grid + Badges/Achievements
  │       ├── TechStackSection.tsx    <-- Visualización de stack
  │       └── ActivityTimeline.tsx    <-- Historial reciente de capturas
  └── pages/
      └── ProfilePage.tsx             <-- Contenedor principal simplificado (~150 líneas)
```

### Detalle de Componentes Modulares:

1. **`CropModal.tsx` [NUEVO]**
   - Extraer la lógica completa del canvas de recorte, zoom slider, eventos de ratón (`mousedown`, `mousemove`, `wheel`) y cálculo de blob de imagen.
   - **Props:**
     ```typescript
     interface CropModalProps {
       imageSrc: string
       onClose: () => void
       onCrop: (blob: Blob) => void
       isSubmitting: boolean
     }
     ```

2. **`EditProfileModal.tsx` [NUEVO]**
   - Contiene los campos del formulario (`username`, `bio`, `website`, `location`, `githubUrl`), selector interactivo de tags populares, inserción de tag personalizado y la integración de carga/crop de avatar.
   - Delegará el recorte a `CropModal`.
   - **Props:**
     ```typescript
     interface EditProfileModalProps {
       isOpen: boolean
       onClose: () => void
       user: UserType // Tipo tipado desde api-client
       onSave: (data: UpdateMePayload) => Promise<void>
     }
     ```

3. **`ReputationDashboard.tsx` [NUEVO]**
   - Renderiza el grid de estadísticas (Decks count, Tips/Items count, Streak days, Reputation calculated) y los Curation Achievements/Badges.
   - **Props:**
     ```typescript
     interface ReputationDashboardProps {
       totalItems: number
       decksCount: number
       streakDays: number
       reputation: number
       achievements: Array<{
         id: string
         title: string
         description: string
         icon: string
         unlocked: boolean
         color: string
       }>
     }
     ```

4. **`TechStackSection.tsx` [NUEVO]**
   - Renderiza los badges del stack tecnológico seleccionado del usuario. Si no hay elementos, muestra el botón de llamada a la acción para abrir el modal de edición.
   - **Props:**
     ```typescript
     interface TechStackSectionProps {
       stackTags: string[]
       onOpenEdit: () => void
     }
     ```

5. **`ActivityTimeline.tsx` [NUEVO]**
   - Muestra el historial cronológico de los últimos items capturados por el usuario.
   - **Props:**
     ```typescript
     interface ActivityTimelineProps {
       items: ItemType[]
       onNavigate: (path: string) => void
     }
     ```

---

## 3. Plan de Verificación

1. **Typechecking y Linting:**
   - Ejecutar `pnpm typecheck` en el monorepo para asegurar que la reestructuración mantenga los tipos válidos.
2. **Pruebas Unitarias de Regresión:**
   - Ejecutar los tests de perfil existentes si los hubiera en el Workspace.
3. **Validación Visual/Manual:**
   - Probar en el entorno local (desktop / web) que la edición del perfil, la carga y sincronización de avatares, la selección de tags y la navegación sigan funcionando a la perfección.
