# SDD Specification: Refactor ProfilePage into Sub-components (P1.7)

**ID del Cambio:** `refactor-profile-page`  
**Estrategia:** `hybrid`  
**Fase:** Specs  

---

## 1. Mapeo de Archivos

Definimos los componentes a crear y modificar con sus paths correspondientes:

| Estado | Archivo | Responsabilidad |
|--------|---------|-----------------|
| **[NUEVO]** | `packages/features/src/components/Profile/CropModal.tsx` | Ventana modal autónoma para recortar imágenes a través de un canvas local con soporte multitáctil, zoom y exportación de blobs. |
| **[NUEVO]** | `packages/features/src/components/Profile/EditProfileModal.tsx` | Ventana modal del formulario completo de edición de usuario. Controla campos simples, inserción y click interactivo de tags, y delega a `CropModal` para carga de avatar. |
| **[NUEVO]** | `packages/features/src/components/Profile/ReputationDashboard.tsx` | Módulo de gamificación y estadísticas del perfil del usuario (número de Decks, Tips/Items, Streak days, y render de Achievements logrados/no logrados). |
| **[NUEVO]** | `packages/features/src/components/Profile/TechStackSection.tsx` | Sección visual del stack tecnológico. Renderiza tags o bien una llamada a la acción vacía. |
| **[NUEVO]** | `packages/features/src/components/Profile/ActivityTimeline.tsx` | Timeline cronológico de las últimas 5 capturas realizadas por el usuario con links de navegación contextuales. |
| **[MODIFY]**| `packages/features/src/pages/ProfilePage.tsx` | Orquestador principal de la vista de perfil. Lee hooks de react-query, inicializa subcomponentes y dibuja el layout general. |

---

## 2. Definición Detallada de Interfaces (TypeScript)

### 2.1. `CropModal.tsx`
```typescript
import React from 'react'

export interface CropModalProps {
  imageSrc: string
  onClose: () => void
  onCrop: (blob: Blob) => Promise<void> | void
  isSubmitting: boolean
}

export declare function CropModal(props: CropModalProps): React.JSX.Element
```

### 2.2. `EditProfileModal.tsx`
```typescript
import React from 'react'
import { User, UpdateUserInput } from '@devdeck/api-client'

export interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onSave: (data: UpdateUserInput) => Promise<void>
  isSaving: boolean
}

export declare function EditProfileModal(props: EditProfileModalProps): React.JSX.Element
```

### 2.3. `ReputationDashboard.tsx`
```typescript
import React from 'react'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlocked: boolean
  color: string
}

export interface ReputationDashboardProps {
  totalItems: number
  decksCount: number
  streakDays: number
  reputation: number
  achievements: Achievement[]
}

export declare function ReputationDashboard(props: ReputationDashboardProps): React.JSX.Element
```

### 2.4. `TechStackSection.tsx`
```typescript
import React from 'react'

export interface TechStackSectionProps {
  stackTags: string[]
  onOpenEdit: () => void
}

export declare function TechStackSection(props: TechStackSectionProps): React.JSX.Element
```

### 2.5. `ActivityTimeline.tsx`
```typescript
import React from 'react'
import { Item } from '@devdeck/api-client'

export interface ActivityTimelineProps {
  items: Item[]
  onNavigate: (path: string) => void
}

export declare function ActivityTimeline(props: ActivityTimelineProps): React.JSX.Element
```

---

## 3. Comportamientos y Requisitos UX

- **CropModal:** Mantener el styling brutalista (#f3f4f6 para el fondo del canvas, bordes negros gruesos `border-3 border-ink`, sombras robustas `shadow-hard`). Soporte completo para slider de zoom interactivo y inputs manuales si los hubiere.
- **EditProfileModal:** Sincronizar el avatar usando GitHub OAuth avatar endpoint (`https://github.com/${username}.png`) al accionar el botón "Sincronizar" o trigger de subida local. Utilizar triggers ocultos para la subida de ficheros (`<input type="file" />` activado por el clic sobre el avatar actual).
- **Internationalization (i18n):** Todo texto e interactivo debe seguir utilizando el hook `useTranslation()` de `@devdeck/i18n` para garantizar la compatibilidad con el sistema multiidioma (español e inglés).
