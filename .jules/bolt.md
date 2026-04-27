## 2024-04-26 - Memoize tags and languages counting in Sidebar
**Learning:** The `Sidebar` component iterates through all repositories (`O(N)`) and their tags (`O(T)`) to build counts, then sorts them, on every render.
**Action:** Used `useMemo` to cache the calculated counts and sorted arrays based on the `repos` prop, reducing unnecessary re-computations.

## 2025-05-15 - Concurrent Async API calls in drainQueue
**Learning:** Processing an offline queue sequentially with `await` in a loop leads to performance bottlenecks, especially with network latency.
**Action:** Replaced sequential loop with `Promise.allSettled()` to execute capture calls concurrently, improving drain time by ~3x for 5 items.
