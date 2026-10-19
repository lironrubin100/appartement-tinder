This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## CARTO basemap configuration

The map uses Leaflet with CARTO Positron (`light_all`). CARTO now requires a
**Basemaps API key** in raster tile requests. Without one it returns HTTP 200
watermark images saying `API KEY REQUIRED`; successful image loading is not
proof that the map works. See [CARTO's integration instructions](https://github.com/CartoDB/basemap-styles).

Request a key from the [CARTO Basemaps dashboard](https://carto.com/basemaps/apikey/).
The owner must complete any terms acceptance. Use the free tier only; a paid plan
requires separate owner approval (K3). A CARTO Workspace/MCP or management token
is not the browser Basemaps key.

Set `NEXT_PUBLIC_CARTO_BASEMAPS_KEY` in `web/.env.local` for local development and
in the Vercel project's relevant environment before building. Restart the dev
server or rebuild/redeploy after setting/changing it: Next.js embeds this value
in the browser bundle. Deployment requires its own authorization.

This key is intentionally browser-visible. Use CARTO's origin restrictions for
the actual production/preview/local origins; never put a management/admin token
in a `NEXT_PUBLIC_` variable or commit a real key. Missing configuration shows a
localized unavailable state and does not request keyless tiles.

After configuration, visually verify actual streets (not just loaded image tags
or HTTP 200), markers and OSM/CARTO attribution on `/map` and `/en/map` at desktop
and 390px width. Verify tile-failure retry separately. Invalid/restricted keys may
also return placeholder images and require this visual check.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
