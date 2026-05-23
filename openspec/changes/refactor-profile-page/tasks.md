# SDD Tasks: Refactor ProfilePage into Sub-components (P1.7)

**ID del Cambio:** `refactor-profile-page`  
**Estrategia:** `hybrid`  
**Fase:** Tasks  

---

## Plan de Ejecución

- [x] **Fase 1: Preparación**
  - [x] Crear el directorio `packages/features/src/components/Profile/`
- [x] **Fase 2: Creación de Componentes Presentacionales**
  - [x] Crear `CropModal.tsx` encapsulando la lógica de recorte imperativa del canvas.
  - [x] Crear `ReputationDashboard.tsx` encapsulando stats y badges de logros.
  - [x] Crear `TechStackSection.tsx` encapsulando los badges de tech stack y CTA de edición.
  - [x] Crear `ActivityTimeline.tsx` encapsulando el feed histórico de capturas.
  - [x] Crear `EditProfileModal.tsx` encapsulando el formulario interactivo, selector de stack y subida/sincronización de avatar.
- [x] **Fase 3: Integración y Limpieza**
  - [x] Simplificar `ProfilePage.tsx` importando e integrando los subcomponentes.
  - [x] Limpiar las importaciones no utilizadas en `ProfilePage.tsx` (iconos, hooks locales).
- [x] **Fase 4: Verificación**
  - [x] Correr `pnpm typecheck` para asegurar coherencia tipada en TypeScript.
  - [x] Verificar manualmente el flujo completo (editar perfil, recortar avatar, interactuar con stack).
