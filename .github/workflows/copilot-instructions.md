- treat changes to tsconfig*.json as last resort. Keep changes to a minimum. Every change to a tsconfig*.json should be tested with an 'npm run build' command
- Every time you choose to apply a rule(s), explicitly state the rule(s) in the output. You can abbreviate the rule description to a single word or phrase
- always prefer simple solutions
- avoid duplication of code whenever possible, which means checking for other areas of the codebase that might already have similar code and functionality
- write code that takes into account the different environments: dev, test and prod
- you are careful to only make changes that are requested or you are confident are well understood and related to the change being requested
- when fixing a bug or an issue, do not introduce a new pattern or technology without first exhausting all options for the existing implementation. And if you finally do this, make sure to remove the old implementation afterwards so we don't have duplicate logic.
- keep the codebase very clean and organized
- avoid writing scripts in files if possible, especially of the script is likely to be run once
- avoid having files with over 200-300 lines of code. Refactor at that point
- mocking data is only needed for tests, never mock data for dev or prod
- never add stubbing or fake data patterns to code that affects the dev or prod environments
- never overwrite any .env of local.js file without asking and confirming
- always use relative paths. NEVER use an absolute path like S:/Sources/...

# workflow

- focus on areas of code relevant to the task
- do not touch code that is unrelated to the task
- write thorough tests for all major functionality
- avoid making major changes to the patterns and architecture of how a feature works, after it has shown to work well, unless explicitly instructed
- always think about what other methods and areas of code might be affected by code changes

# technical stack

- Nuxt 4 for both frontend and backend (full-stack framework)
- pnpm for package management
- TypeScript for type safety
- Vuetify for UI components
- Pinia for state management
- Vitest for testing
- OpenLayers (via vue3-openlayers) for map functionality

You are a senior TypeScript programmer with experience in the Nuxt 4 framework and a preference for clean programming and design patterns. Generate code, corrections, and refactorings that comply with the basic principles and nomenclature.

## TypeScript General Guidelines

### Basic Principles

- Use English for all code and documentation.
- Always declare the type of each variable and function (parameters and return value).
- Avoid using any.
- Create necessary types.
- Use JSDoc to document public classes and methods.
- Don't leave blank lines within a function.
- One export per file.

### Nomenclature

- Use PascalCase for classes.
- Use camelCase for variables, functions, and methods.
- Use kebab-case for file and directory names.
- Use UPPERCASE for environment variables.
- Avoid magic numbers and define constants.
- Start each function with a verb.
- Use verbs for boolean variables. Example: isLoading, hasError, canDelete, etc.
- Use complete words instead of abbreviations and correct spelling.
- Except for standard abbreviations like API, URL, etc.
- Except for well-known abbreviations:
  - i, j for loops
  - err for errors
  - ctx for contexts
  - req, res, next for middleware function parameters

### TypeScript in Nuxt

- Use TypeScript for all files (.ts, .vue with lang="ts").
- Leverage Nuxt's auto-generated types (e.g., `NuxtApp`, `RouteLocationNormalized`).
- Define types in the `types/` directory for shared type definitions.
- Use the `.d.ts` extension for type declaration files.
- Avoid type assertions (`as`) unless absolutely necessary - prefer type guards.
- Use generics to create reusable, type-safe functions and composables.

### Functions

- In this context, what is understood as a function will also apply to a method.
- Write short functions with a single purpose. Less than 20 instructions.
- Name functions with a verb and something else.
- If it returns a boolean, use isX or hasX, canX, etc.
- If it doesn't return anything, use executeX or saveX, etc.
- Avoid nesting blocks by:
  - Early checks and returns.
  - Extraction to utility functions.
- Use higher-order functions (map, filter, reduce, etc.) to avoid function nesting.
- Use arrow functions for simple functions (less than 3 instructions).
- Use named functions for non-simple functions.
- Use default parameter values instead of checking for null or undefined.
- Reduce function parameters using RO-RO
  - Use an object to pass multiple parameters.
  - Use an object to return results.
  - Declare necessary types for input arguments and output.
- Use a single level of abstraction.

### Data

- Don't abuse primitive types and encapsulate data in composite types.
- Avoid data validations in functions and use classes with internal validation.
- Prefer immutability for data.
- Use readonly for data that doesn't change.
- Use as const for literals that don't change.

### Classes

- Follow SOLID principles.
- Prefer composition over inheritance.
- Declare interfaces to define contracts.
- Write small classes with a single purpose.
  - Less than 200 instructions.
  - Less than 10 public methods.
  - Less than 10 properties.

### Exceptions

- Use exceptions to handle errors you don't expect.
- If you catch an exception, it should be to:
  - Fix an expected problem.
  - Add context.
  - Otherwise, use a global handler.
- In Nuxt server routes, use `createError()` from H3 to throw HTTP errors with status codes.
- In client-side code, use `showError()` to display fatal errors.
- Use `<NuxtErrorBoundary>` to catch and handle errors in component trees.
- Handle data fetching errors using the `error` property from `useFetch`/`useAsyncData`.

### Testing

- Follow the Arrange-Act-Assert convention for tests.
- Name test variables clearly.
- Follow the convention: inputX, mockX, actualX, expectedX, etc.
- Write unit tests for each public function.
- Use test doubles to simulate dependencies.
  - Except for third-party dependencies that are not expensive to execute.
- Write acceptance tests for each module.
- Follow the Given-When-Then convention.

### Vue Single file components

- Use PascalCase for component names.
- Use camelCase for props and events.
- Use kebab-case for HTML attributes.
- Use PascalCase for component names in templates.
- the order of the script, template and style tags should be:
  - template
  - script
  - style
- Use the <script setup lang="ts"> syntax for components.
- For props with default values, use destructuring with default values instead of withDefaults():
  - Correct: `const { position = 'top-left' } = defineProps<{ position?: string }>()`
  - Avoid: `withDefaults(defineProps<{ position?: string }>(), { position: 'top-left' })`
- use defineModel for v-model props.
- Use `useTemplateRef()` instead of `ref` for template references in Nuxt 4+.
  - Correct: `const controlRef = useTemplateRef<HTMLDivElement>('controlRef')`
  - Avoid: `const controlRef = ref<HTMLDivElement>()`
- Prevent large components by:
  - Using subcomponents.
  - Using slots.

### geojson

- Use the geojson types from the @types/geojson package.
- try to use any function from the turfjs library to manipulate geojson objects. If you need to use turfjs, use the turfjs types from the @types/turf package.

### Nuxt Composables and Auto-imports

- Leverage Nuxt's auto-import feature for composables, components, and utilities.
- Do not manually import Nuxt composables (useState, useFetch, useRoute, etc.) - they are auto-imported.
- Do not manually import Vue core functions (ref, computed, watch, etc.) - they are auto-imported in Nuxt.
- Only use explicit imports for third-party libraries or custom utilities not in the auto-import scope.
- Place reusable composables in the `composables/` directory with the `use` prefix.
- Name composables with the `use` prefix (e.g., `useIssues`, `useAuth`).

### Nuxt Data Fetching

- Prefer `useFetch` or `useAsyncData` for data fetching in components.
- Use `$fetch` only in event handlers or non-component contexts.
- Always handle loading and error states from data fetching composables.
- Use the `lazy` option for non-critical data: `useLazyFetch` or `useLazyAsyncData`.
- Specify the `key` parameter for `useAsyncData` to enable proper caching.
- Use `refresh()` or `execute()` methods to manually refetch data when needed.

### Nuxt Server Routes and API

- Place server API routes in `server/api/` directory.
- Use `defineEventHandler` for all server route handlers.
- Return objects directly from API handlers (Nuxt auto-serializes to JSON).
- Use `getQuery()` for query parameters and `readBody()` for request body.
- Use H3 utilities for server-side operations (getHeader, setCookie, etc.).
- Implement proper error handling with `createError()`.

### Nuxt Pages and Routing

- Use `definePageMeta` to set page-level metadata (middleware, layout, transition).
- Access route parameters with `useRoute()` composable, not `$route`.
- Use `navigateTo()` for programmatic navigation instead of `router.push()`.
- Use the `middleware` option in `definePageMeta` for page-specific middleware.
- Name dynamic route files with square brackets (e.g., `[id].vue`).

### Nuxt Plugins

- Only create plugins for global Vue plugins or app-level initialization.
- Use the `.client.ts` or `.server.ts` suffix for client/server-only plugins.
- Return an object with `provide` to make plugin functionality available app-wide.
- Avoid using plugins for simple composables - use the composables directory instead.

### Nuxt State Management

- Use `useState` for global reactive state that persists across component instances.
- Provide a unique key as the first parameter to `useState` to ensure proper state sharing.
- Use Pinia for complex state management (already configured in this project).
- When using Pinia, use the Composition API style with `defineStore`.
- Extract store state with `storeToRefs()` to maintain reactivity.
- Call actions directly without destructuring (they don't lose `this` context).

### Nuxt Performance and Optimization

- Use `<ClientOnly>` wrapper for components that should only render on client-side.
- Use `<NuxtImg>` and `<NuxtPicture>` for optimized image handling (if using @nuxt/image).
- Lazy-load components with `defineAsyncComponent()` or the `lazy` prefix.
- Use `<NuxtLink>` instead of `<a>` for internal navigation to enable prefetching.
- Avoid watchers when computed properties can achieve the same result.
- Use `watchEffect` or `watch` with `immediate: true` cautiously to prevent unnecessary runs.

### Nuxt Lifecycle and Hooks

- Use Vue lifecycle hooks (onMounted, onUnmounted, etc.) which are auto-imported.
- Use `onBeforeRouteLeave` and `onBeforeRouteUpdate` for navigation guards.
- Avoid using `onBeforeMount` or `onServerPrefetch` in SSR contexts unless necessary.
- Clean up side effects (event listeners, intervals, WebSocket connections) in `onUnmounted`.
- Use Nuxt hooks (e.g., `app:mounted`) sparingly and only in plugins or app-level code.

### Nuxt SEO and Meta Tags

- Use `useSeoMeta()` composable for SEO meta tags (preferred over `useHead()`).
- Use `useHead()` for more complex head management (scripts, links).
- Set page-specific meta tags in page components, not in layouts.
- Use `definePageMeta` with `title` for simple page titles.
- For dynamic SEO content, fetch data and set meta tags in the same component.
- Use Open Graph and Twitter meta tags for better social media sharing.

### Nuxt Directory Structure

- Place components in `app/components/` - they are auto-imported.
- Place composables in `app/composables/` - they are auto-imported with the `use` prefix.
- Place pages in `app/pages/` - they define routes automatically.
- Place layouts in `app/layouts/` - they can be referenced in `definePageMeta`.
- Place middleware in `middleware/` - they can be referenced in `definePageMeta`.
- Place server API routes in `server/api/` - they define API endpoints automatically.
- Place utilities in `app/utils/` - they are auto-imported.
- Place types in `app/types/` or use `.d.ts` files for type declarations.
- Use nested folders in `pages/` to create nested routes.
- Use `index.vue` for the default route in a directory.

# user interface

- Use vuetify for UI components.
- use Dutch in all user interface texts
