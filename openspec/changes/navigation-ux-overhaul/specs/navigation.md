# Specs: Core Navigation & Information Architecture Overhaul (P0.UX)

## Scenario 1: Persistent Left Navigation Sidebar on Desktop
- **Given** a user is on a desktop viewport (width >= 1024px)
- **When** they load any authenticated page of the application
- **Then** the `NavSidebar` MUST be persistently visible on the left side of the screen.
- **And** the page content and `Topbar` MUST fill the remaining horizontal space.
- **And** the `NavSidebar` MUST display the Vault, Tools, and System menu groups.

## Scenario 2: Progressive Disclosure of Team Navigation Menu
- **Given** a logged-in user has no active organization (`activeOrgId` is null or undefined)
- **When** the `NavSidebar` is rendered
- **Then** the "Team" menu group (including Activity/Feed, Team Review, and Org Insights) MUST NOT be visible.
- **Given** a logged-in user belongs to an active organization (`activeOrgId` is configured)
- **When** the `NavSidebar` is rendered
- **Then** the "Team" menu group MUST be visible.

## Scenario 3: Responsive Behavior and Drawer on Mobile Viewports
- **Given** a user is on a mobile viewport (width < 1024px)
- **When** they load any authenticated page of the application
- **Then** the `NavSidebar` MUST be hidden by default.
- **And** a menu toggle trigger button (hamburger icon) MUST be displayed on the screen.
- **When** the user clicks the menu toggle trigger button
- **Then** the `NavSidebar` MUST slide in from the left as an overlay drawer.
- **And** clicking outside the drawer or clicking the close toggle (X icon) MUST close the drawer.

## Scenario 4: Simplified Contextual Topbar Actions
- **Given** any page wrapped inside `AppShell`
- **When** the `Topbar` is rendered
- **Then** it MUST NOT render any text-based inline navigation links or dropdowns for primary or secondary navigation.
- **And** it MUST render:
  - The `WorkspaceSwitcher` on the left.
  - A centered global Search trigger button or search input.
  - The `SyncStatusIndicator`, `NotificationCenter` (bell icon), and profile avatar button on the right.
