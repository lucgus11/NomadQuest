# 🛰️ NomadQuest

Gamifiez vos pas. NomadQuest transforme la marche à pied dans le monde réel en exploration façon RPG :
un **brouillard de guerre** recouvre la carte, et se dissipe autour de vous à mesure que vous marchez.
En chemin, débusquez des **coffres** et collectionnez des **artefacts**, débloquez des **succès**, et
suivez votre progression dans un tableau de bord façon *radar sci-fi*.

**100% local.** Aucun backend, aucun compte, aucune donnée envoyée où que ce soit. Tout est stocké dans
IndexedDB, sur votre appareil.

---

## ✨ Fonctionnalités

- **Brouillard de guerre en temps réel** — grille de cellules (10 m) dissipée dans un rayon
  personnalisable (10–80 m) autour du joueur, rendue sur un canvas superposé à une carte Leaflet.
- **Suivi GPS** via l'API de Géolocalisation HTML5 (`watchPosition`), avec filtrage anti-saut GPS.
- **Système de butin algorithmique** — des coffres (communs / rares / légendaires) apparaissent en
  couronne devant le joueur ; approchez-vous à moins de 10 m pour les ouvrir et obtenir un artefact
  aléatoire pondéré par rareté.
- **11 artefacts collectibles** avec lore, et **16 succès** débloquables (distance, marche nocturne,
  série de jours actifs, coffres légendaires, etc.).
- **Dashboard de statistiques** — distance totale, % de zone locale et % du monde découverts (surface
  réelle en m² calculée depuis les cellules révélées), niveau/XP, vitesse record, série active.
- **Screen Wake Lock** — empêche l'écran de s'éteindre pendant le suivi, avec un bouton pour le
  désactiver manuellement (économie de batterie).
- **PWA installable, offline-first** — Service Worker (Workbox via `vite-plugin-pwa`), mise en cache
  des tuiles de carte, de l'app shell et des assets.
- **Export / réinitialisation des données** dans l'écran Réglages.

## 🧱 Stack technique

| Domaine      | Choix                                          |
| ------------ | ----------------------------------------------- |
| Framework    | React 18 + Vite + TypeScript                     |
| Style        | TailwindCSS (thème "radar HUD" sur-mesure)       |
| Carte        | Leaflet.js + tuiles CARTO Dark (OpenStreetMap)   |
| État global  | Zustand                                          |
| Persistance  | IndexedDB via `idb`                              |
| Icônes       | lucide-react                                     |
| PWA          | `vite-plugin-pwa` (Workbox)                      |
| Déploiement  | Vercel                                           |

## 📁 Structure du projet

```
nomadquest/
├─ public/
│  ├─ icons/                  # Icônes PWA (192, 512, maskable)
│  └─ favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ Map/MapView.tsx      # Carte Leaflet impérative + canvas de brouillard
│  │  ├─ Layout/MapScreen.tsx # Orchestration GPS + HUD + modals
│  │  └─ UI/                  # RadarHUD, StatsPanel, AchievementsPanel,
│  │                          # InventoryPanel, SettingsPanel, ChestModal,
│  │                          # BottomNav, AchievementToast
│  ├─ data/
│  │  ├─ artifacts.ts         # Catalogue des artefacts + tirage pondéré
│  │  └─ achievementsList.ts  # Catalogue des succès + conditions
│  ├─ hooks/
│  │  ├─ useGeolocation.ts    # watchPosition + filtrage précision
│  │  └─ useWakeLock.ts       # Screen Wake Lock API + toggle utilisateur
│  ├─ lib/
│  │  ├─ db.ts                # Schéma + accès IndexedDB (idb)
│  │  ├─ fog.ts               # Grille du brouillard (lat/lng <-> cellule)
│  │  ├─ fogRenderer.ts       # Rendu canvas du brouillard synchronisé à Leaflet
│  │  ├─ loot.ts              # Génération / renouvellement des coffres
│  │  ├─ mapIcons.ts          # Icônes HTML des marqueurs (divIcon)
│  │  ├─ geoUtils.ts          # Haversine, cap, conversions mètres/degrés
│  │  ├─ statsCalc.ts         # % zone locale / % monde, surfaces
│  │  ├─ xp.ts                # Courbe de niveau / XP
│  │  ├─ achievementsEngine.ts# Évaluation des succès débloqués
│  │  └─ wakelock.ts          # Wrapper API Wake Lock
│  ├─ store/useGameStore.ts   # Store Zustand = moteur de jeu central
│  ├─ types/index.ts          # Types du domaine
│  └─ App.tsx / main.tsx / index.css
├─ vite.config.ts             # Config Vite + vite-plugin-pwa (manifest, cache)
├─ tailwind.config.js         # Design tokens (couleurs, animations HUD)
└─ package.json
```

## 🚀 Démarrage

```bash
npm install
npm run dev       # http://localhost:5173
```

> ⚠️ L'API de géolocalisation exige un contexte sécurisé (HTTPS ou `localhost`). Sur mobile, testez soit
> via `npm run dev -- --host` + un tunnel HTTPS (ex. ngrok), soit après déploiement sur Vercel.

### Build de production

```bash
npm run build      # génère dist/ + Service Worker (sw.js)
npm run preview    # sert le build localement pour tester le mode PWA/offline
```

### Déploiement sur Vercel

Le projet est prêt à l'emploi : Vercel détecte automatiquement Vite (`npm run build`, dossier `dist`).

```bash
npm i -g vercel
vercel
```

## 🎮 Comment jouer

1. À l'ouverture, activez le GPS (le suivi est en pause par défaut pour préserver votre batterie et
   votre vie privée).
2. Marchez : le brouillard se dissipe autour de vous, votre distance et votre XP augmentent.
3. Des coffres (icônes colorées selon leur rareté) apparaissent sur votre chemin. Approchez-vous à
   moins de 10 m pour les ouvrir et récupérer un artefact.
4. Consultez vos statistiques, votre inventaire et vos succès depuis la barre de navigation basse.
5. Ajustez le rayon de dissipation du brouillard et gérez vos données depuis les Réglages.

## 🔒 Confidentialité

Aucune requête réseau n'est faite avec vos coordonnées GPS, en dehors du téléchargement (mis en cache)
des tuiles de carte auprès du fournisseur de tuiles. Toute la logique de jeu, la carte explorée et
l'inventaire restent strictement sur l'appareil, dans IndexedDB. Vous pouvez exporter (JSON) ou
réinitialiser vos données à tout moment depuis les Réglages.

## 🛠️ Pistes d'extension

- Mode "défis quotidiens" générés localement (ex. "révélez 200 nouvelles cellules aujourd'hui").
- Historique de trajet (polyline) avec export GPX.
- Thèmes de carte alternatifs (satellite, rétro).
- Artefacts combinables en "reliques" plus puissantes (déblocage de bonus XP).
- Mode "brume légère" révélant un aperçu flouté au-delà du rayon exploré, pour donner un indice de
  direction sans divulguer toute la carte.
