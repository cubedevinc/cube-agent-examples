# Ant Design Cube Embed SDK Example

This example demonstrates how to use the Cube Embed SDK with Ant Design components.

## Features

- Data asset exploration with collapsible cube members
- SQL query editor for semantic queries
- Results table with pagination
- Chart visualization with multiple chart types
- View mode toggle between results and charts

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Ant Design 6** - UI component library
- **@cube-dev/embed-sdk** - Cube embedding SDK
- **@tanstack/react-query** - Data fetching

## Setup

1. Install dependencies from the repository root:
```bash
yarn install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your Cube Cloud API key and deployment ID:
- `VITE_API_KEY` - Your Cube Cloud API key
- `VITE_DEPLOYMENT_ID` - Your deployment ID

3. Start the development server:
```bash
yarn dev
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── components/
│   ├── DataAssetPanel.tsx    # Semantic view explorer
│   ├── ReactLibExplorer.tsx  # Main component container
│   ├── ResultTable.tsx       # Query results display
│   └── SqlEditor.tsx         # SQL query editor
├── App.tsx                   # Main app with authentication
├── main.tsx                  # Entry point
└── index.css                 # Global styles
```
