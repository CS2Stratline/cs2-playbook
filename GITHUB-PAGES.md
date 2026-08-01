# GitHub Pages

Statisk Vite-bygg publiseres automatisk til GitHub Pages ved push til `main`.

## Første gangs oppsett

1. Opprett et GitHub-repo og push denne koden til `main`.
2. I repoet: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Vent på workflowen **Deploy to GitHub Pages**, eller kjør den manuelt under **Actions**.

Appen blir tilgjengelig på:

- Prosjektside: `https://<bruker>.github.io/<repo-navn>/`
- Bruker-/org-side (`<bruker>.github.io`): `https://<bruker>.github.io/`

## Base path

Workflowen setter `VITE_BASE_PATH` automatisk:

- `/<repo-navn>/` for vanlige prosjekt-repos
- `/` for repos navngitt `<bruker>.github.io`

Overstyr med repository-variabelen `VITE_BASE_PATH` under **Settings → Secrets and variables → Actions → Variables** hvis du trenger en annen base.

Lokalt brukes fortsatt `./` (relativ base), så `dist/` kan åpnes eller hostes uten GitHub.

## Data og hosting

GitHub Pages er bare filhosting. Strat-boka lagres i nettleserens `localStorage` per enhet. Det finnes ingen synkronisering mellom lagkamerater — bruk eksport/import i appen.

## Lokal sjekk før deploy

```bash
npm ci
VITE_BASE_PATH=/cs2-callout-app/ npm run build
npm run preview
```

Bytt `/cs2-callout-app/` til ditt faktiske repo-navn når du tester base path.
