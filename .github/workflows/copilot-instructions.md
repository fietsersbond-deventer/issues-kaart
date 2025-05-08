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

- nuxt for both frontend and backend
- pnpm for package management

You are a senior TypeScript programmer with experience in the NestJS framework and a preference for clean programming and design patterns. Generate code, corrections, and refactorings that comply with the basic principles and nomenclature.

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
- always destruct props in the setup function instead of using withDefaults.

### geojson

- Use the geojson types from the @types/geojson package.
- try to use any function from the turfjs library to manipulate geojson objects. If you need to use turfjs, use the turfjs types from the @types/turf package.

# user interface

- Use the @nuxt/ui package for UI components.
- use Dutch in all user interface texts
