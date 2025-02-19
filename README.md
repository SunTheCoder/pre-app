# Pre-App

This is a [Next.js](https://nextjs.org) project with Mapbox GL JS integration, bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Features

- Next.js 15 with App Router
- Mapbox GL JS integration
- Supabase integration
- Tailwind CSS for styling
- Dark mode support
- Geist font family integration

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Create a `.env.local` file in the root directory and add your Mapbox access token:
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Routes

- `/` - Home page
- `/map` - Interactive Mapbox map

## Environment Variables

The following environment variables are required:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` - Your Mapbox access token (get one at https://account.mapbox.com/)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

**Important**: When deploying, make sure to add your `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to your Vercel environment variables.
