# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Development Commands

- **Start development server**: `deno task start` - Starts the Fresh development
  server with file watching
- **Build for production**: `deno task build` - Builds the application for
  production deployment
- **Preview production build**: `deno task preview` - Runs the production build
  locally
- **Lint and check**: `deno task check` - Runs formatting, linting, and
  TypeScript checks on all files
- **Update Fresh**: `deno task update` - Updates Fresh framework to latest
  version

## Architecture

This is a **Fresh framework** application built with **Deno**. Fresh is a
full-stack web framework for Deno that uses server-side rendering with islands
architecture.

### Key Technologies

- **Runtime**: Deno (not Node.js)
- **Framework**: Fresh (Deno's full-stack web framework)
- **Frontend**: Preact with JSX
- **Styling**: Tailwind CSS
- **Signals**: @preact/signals for state management

### Project Structure

- `routes/` - File-based routing (pages and API endpoints)
- `islands/` - Client-side interactive components (islands architecture)
- `components/` - Server-side components
- `static/` - Static assets
- `dev.ts` - Development server entry point
- `main.ts` - Production server entry point
- `fresh.config.ts` - Fresh framework configuration
- `deno.json` - Deno configuration with tasks and dependencies

### Islands Architecture

Fresh uses islands architecture where most of the page is server-rendered, and
only specific components (in `islands/`) are hydrated on the client for
interactivity.

### Import Map

Dependencies are managed through the import map in `deno.json`. Fresh uses URL
imports from deno.land and esm.sh rather than npm packages.
