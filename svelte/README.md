# TALISM

SvelteKit project with Supabase configuration.

## Supabase setup

Create a `.env.local` file from the example and fill in your project values:

```bash
cp .env.example .env.local
```

```env
PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

The client is initialized in `src/lib/supabase.js` and can be imported as:

```js
import { getSupabase } from '$lib/supabase';

const supabase = getSupabase();
const { data, error } = await supabase.from('profiles').select('*');
```

## Development

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
