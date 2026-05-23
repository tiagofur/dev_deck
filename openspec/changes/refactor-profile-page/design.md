# SDD Design: Refactor ProfilePage into Sub-components (P1.7)

**ID del Cambio:** `refactor-profile-page`  
**Estrategia:** `hybrid`  
**Fase:** Design  

---

## 1. Patrón Arquitectónico: Container-Presentational

Adoptaremos el patrón **Container-Presentational** para separar limpiamente la orquestación de datos de la interfaz de usuario:

- **Componente Container (`ProfilePage.tsx`):**
  - Orquesta las llamadas a hooks de `react-query` (`useMe`, `useDecks`, `useItems`, `useStats`).
  - Controla el flujo de cierre de sesión (`handleLogout`) y navegación.
  - Administra el estado de apertura del modal de edición de perfil (`isModalOpen`).
  - Lógica para inyectar mutaciones de guardado de perfil (`useUpdateMe`) en el modal.
  - Diseña el layout de grid principal y distribuye los datos a los componentes presentacionales.

- **Componentes Presentacionales (`EditProfileModal`, `CropModal`, `ReputationDashboard`, `TechStackSection`, `ActivityTimeline`):**
  - Reciben datos e interacciones mediante `Props`.
  - Encapsulan su propio estado visual transitorio (ej. zoom en el canvas de recorte, campos de texto en el formulario de edición).
  - Emiten cambios al componente padre mediante callbacks tipados (ej. `onSave`, `onCrop`, `onClose`).

---

## 2. Decisiones de Diseño Técnico Detalladas

### 2.1. Gestión de Estado en `EditProfileModal.tsx`
El formulario debe inicializarse con los datos actuales del usuario obtenidos del hook query en `ProfilePage.tsx`. Para evitar desincronizaciones si el usuario abre y cierra el modal sin guardar:
- Usaremos estados locales React (`useState`) inicializados en un `useEffect` disparado cuando `isOpen` sea `true` o cambien los datos del `user`.
- Lógica de tags interactivos:
  - Mantener un array `stackTags` en estado local.
  - Al hacer click en un tag de `POPULAR_TAGS`, alternar su presencia en `stackTags`.
  - Al escribir un custom tag y pulsar Enter, limpiar el input y añadir al array local si no existe.

### 2.2. Aislamiento del Canvas de Recorte en `CropModal.tsx`
El modal de recorte usa una API de canvas imperativa de HTML5. Todo este código vivirá aislado dentro de `CropModal.tsx`:
- Un elemento `<canvas ref={canvasRef}>` con dimensiones brutalistas fijas de `300x300`.
- Control del estado de drag con variables React de referencia o estados (`isDragging`, `dragStart`, `offset`).
- Dibujo automático en el canvas mediante un `useEffect` que escucha cambios en el `zoom`, `offset` o la imagen cargada.
- Al confirmar, llama a `canvas.toBlob()` y emite el `Blob` resultante en el callback `onCrop`.

### 2.3. Gamificación en `ReputationDashboard.tsx`
El cálculo matemático de reputación y las insignias de logros se mantendrán en el componente principal o se computarán dinámicamente en el dashboard:
- **Achievements:**
  - *Early Adopter:* Desbloqueado por defecto para todos los usuarios registrados.
  - *Curator Master:* Desbloqueado si `totalItems >= 5`.
  - *Deck Builder:* Desbloqueado si `decksCount >= 1`.
  - *Flame Keeper:* Desbloqueado si `streakDays >= 1`.

---

## 3. Manejo de Traducciones y Dependencias

- **Localización (`i18n`):** Cada componente hijo importará `useTranslation` de `@devdeck/i18n` de forma local. Esto evita pasar docenas de strings traducidas como props, manteniendo las firmas de props ultra-limpias.
- **Iconos (`lucide-react`):** Cada subcomponente importará solo los iconos necesarios que renderiza, optimizando el bundle general.
- **Componentes UI Comunes:** Se importará el componente `Button` y la función `showToast` de `@devdeck/ui` de forma directa tal como se hace hoy.
