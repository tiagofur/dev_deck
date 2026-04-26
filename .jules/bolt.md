## 2024-04-26 - Memoize tags and languages counting in Sidebar
**Learning:** The `Sidebar` component iterates through all repositories (`O(N)`) and their tags (`O(T)`) to build counts, then sorts them, on every render.
**Action:** Used `useMemo` to cache the calculated counts and sorted arrays based on the `repos` prop, reducing unnecessary re-computations.
