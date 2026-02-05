
# Fix: Blank Page on Root Route (/)

## Problem Identified

The dashboard page shows a blank screen with the following console errors:
- `Warning: Function components cannot be given refs. Attempts to access this ref will fail.`
- `TypeError: Component is not a function`

After thorough investigation, I found two root causes:

1. **Skeleton Component Issue**: The current `forwardRef` implementation has a problematic pattern where the inner function shares the same name as the outer const, which can cause issues with Vite's Hot Module Replacement.

2. **Duplicate React Instances**: Vite may be bundling multiple copies of React, causing components from different copies to fail when sharing context or refs.

## Solution Overview

### Step 1: Fix the Skeleton Component

Rewrite `src/components/ui/skeleton.tsx` using a more reliable pattern:
- Use an arrow function inside forwardRef (the standard shadcn/ui pattern)
- Add `displayName` for better debugging and HMR stability
- Import React properly with namespace import

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
});
Skeleton.displayName = "Skeleton";

export { Skeleton };
```

### Step 2: Add Vite Dedupe Configuration

Update `vite.config.ts` to prevent duplicate React instances:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent duplicate React instances
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/skeleton.tsx` | Rewrite using standard shadcn/ui forwardRef pattern with displayName |
| `vite.config.ts` | Add `dedupe` configuration to resolve section |

## Technical Details

### Why this happens

1. **forwardRef Naming**: When the inner function inside `forwardRef` has the same name as the exported const, React's component identity can get confused during hot reloading, causing "Component is not a function" errors.

2. **Duplicate React**: When multiple copies of React exist in the bundle (can happen with certain dependency resolutions), components cannot share refs or context across boundaries, causing the "cannot be given refs" warning followed by a crash.

### Why this fix works

1. The standard shadcn/ui pattern (arrow function + displayName) is battle-tested and works reliably with Vite's HMR.

2. The `dedupe` configuration ensures only one copy of React is used throughout the application, preventing context sharing issues.

## Expected Outcome

After these changes:
- The dashboard will render correctly at `/`
- No more "Function components cannot be given refs" warnings
- No more "Component is not a function" crashes
- The loading skeleton will display properly during auth state resolution
- Navigation throughout the app will work reliably
