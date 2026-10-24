# Recoupe : présidentielle 2027

Outil de vérification de faits, non partisan, sur l'élection présidentielle française de 2027 :

- **Question à l'IA** (barre centrale) : la réponse est rédigée par MiniMax uniquement à partir de sources numérotées (fiches partis vérifiées, passages des programmes archivés, articles de presse récents, recherche web via SearXNG). Chaque source affiche sa fiabilité et l'orientation éditoriale documentée du média. Les citations qui ne renvoient à aucune source sont signalées.
- **Fil d'actualité** : flux RSS de 17 rédactions de lignes éditoriales différentes, filtrable par parti, avec suivi de partis (mémorisé dans le navigateur).
- **Programmes officiels** : documents publiés par les partis, archivés à l'identique (empreinte SHA-256, date d'archivage), avec visionneuse PDF et recherche plein texte sans IA.

## Démarrage (Docker)

```bash
cp .env.example .env    # puis renseigner MINIMAX_API_KEY, ADMIN_TOKEN et SEARXNG_SECRET
docker compose up -d --build
```

L'application est servie sur http://localhost:3000. Au premier démarrage, elle télécharge et indexe les programmes en tâche de fond (moins d'une minute), dans le volume `storage`.

## Données

| Fichier | Contenu |
| --- | --- |
| `data/parties.json` | Partis, candidatures, documents officiels. Chaque information renvoie à la page consultée (vérification du 24/10/2026). Les désaccords entre sources sont listés dans `openIssues`. |
| `data/sources.json` | Catalogue des sources : catégorie, donc fiabilité, et orientation éditoriale reprise de l'article Wikipédia du média (lien `ref`). Un domaine absent est « non évalué ». |
| `data/feeds.json` | Flux RSS de presse testés. |

Pour mettre à jour les données (nouveau programme, nouvelle candidature), modifiez `data/parties.json`, puis reconstruisez l'image et relancez l'archivage.

## Administration

```bash
# Relancer l'archivage (force=1 : retélécharger même les documents déjà archivés)
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" "http://localhost:3000/api/ingest?force=1"
curl http://localhost:3000/api/ingest      # état de l'archivage

# Déposer manuellement un document quand le site du parti bloque les téléchargements automatiques
# (l'identifiant du document est affiché sur sa page dans « Programmes officiels »)
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" --data-binary @programme.pdf \
  http://localhost:3000/api/documents/<docId>
```

Le site des Écologistes est protégé par Cloudflare : son programme 2027 doit être téléchargé depuis un navigateur puis déposé avec la commande ci-dessus. La copie est alors marquée « déposée manuellement ».

## Développement

```bash
npm install
cp .env.example .env.local   # SEARXNG_URL facultatif hors Docker
npm run dev
npm test                     # tests unitaires (vitest)
npm run lint
```

Stack : Next.js 16 (App Router, Cache Components, route handlers), MiniMax `MiniMax-M3.1-Flash` via son API compatible OpenAI, SearXNG auto-hébergé, MiniSearch pour l'index plein texte, unpdf pour l'extraction des PDF.

## Limites

- Un modèle de langage peut mal interpréter un passage, même bien cité : les citations surlignées servent à le vérifier.
- La fiabilité qualifie un type de source, pas un article particulier.
- Les données sur les candidatures datent du 24/10/2026 et doivent être tenues à jour.
