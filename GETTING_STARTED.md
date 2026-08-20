# Getting Started with Shutaf — Live Prototype

Your app is ready to run! Here's how to see it live.

## 🚀 Run Locally (Development Server)

### 1. Install dependencies
```bash
cd web
npm install
```

### 2. Start the dev server
```bash
npm run dev
```

The app opens at **http://localhost:3000** in your browser.

### 3. Navigate the prototype
- **Bottom Nav Bar** routes you through:
  - `🏠 מפה` → `/map` (apartment listings on a map)
  - `✨ חיפוש` → `/discover` (swipe through roommates, filter by tags)
  - `💬 צ'אט` → `/chats` (message threads)
  - `👤 פרופיל` → `/profile` (your profile, settings, mode switcher)
  - `➕ הוסף` → `/compose` (post a new listing — overlays on current screen)

### 4. Hot reload
Edit any file in `web/src/` and the page refreshes instantly. No restart needed.

---

## 📱 View on Mobile

### Option A: Local Network
1. Find your machine's IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Open on phone: `http://<your-ip>:3000`
3. Bottom nav works great on mobile (fixed at bottom)

### Option B: DevTools Mobile Emulation
- Open DevTools (F12)
- Click device icon (top-left)
- Toggle to iPhone or Android
- Responsive design works perfectly

---

## 🌐 Deploy to Vercel (Production)

### Why Vercel?
- **Decided in DECISIONS.md** (K1: Web-first, Next.js on Vercel)
- Free tier supports full app
- One-click deployments from GitHub
- Automatic preview deploys per branch

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add core UI design system + main app layout"
git push origin master
```

### Step 2: Connect to Vercel
1. Go to **https://vercel.com**
2. Click **"New Project"**
3. Import your GitHub repository
4. Click **Deploy**

Vercel auto-detects Next.js and builds instantly.

### Step 3: Get your live URL
- After deploy completes, Vercel gives you a URL like `https://shutaf.vercel.app`
- Share this link with anyone
- Mobile-responsive out of the box

### Step 4: Auto-deploys
- Every push to `master` = new production deploy
- Every branch = preview URL (auto-generated)

---

## 📊 What You're Looking At

### Current State
✅ **UI Design System** — 15+ components (Button, Badge, Input, Avatar, Modal, SwipeCard, ListingCard, TagFilter, BottomNav)  
✅ **Main Layout** — Route group layout with fixed bottom nav  
✅ **Page Stubs** — All 5 main routes with placeholder content  
✅ **RTL Support** — Hebrew default, English ready (add `/en` routes later)  
✅ **Design Tokens** — Colors, radius, typography from DECISIONS.md  

### What's Not Built Yet
- Supabase integration (database, auth, realtime)
- Map rendering (use Mapbox or Leaflet later)
- User authentication flow
- Messaging realtime sync
- Analytics & error tracking

---

## 🔧 File Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx           (global RTL, Rubik font)
│   │   ├── page.tsx             (redirects to /map)
│   │   ├── globals.css          (design tokens: colors, radius, typography)
│   │   └── (main)/
│   │       ├── layout.tsx       (main layout with BottomNav)
│   │       ├── map/page.tsx
│   │       ├── discover/page.tsx
│   │       ├── chats/page.tsx
│   │       ├── profile/page.tsx
│   │       └── compose/page.tsx
│   └── components/
│       ├── ui/                  (Button, Badge, Input, Avatar, Modal)
│       ├── discovery/           (SwipeCard, ListingCard, TagFilter)
│       └── navigation/          (BottomNav)
├── public/                      (static assets)
├── package.json
├── tsconfig.json
├── tailwind.config.ts           (if needed)
└── next.config.ts
```

---

## 📖 Design System Reference

See `DESIGN_SYSTEM.md` for:
- Component API (all props & variants)
- Color palette & tokens
- Typography scale
- RTL/LTR best practices
- Code examples

---

## 🎯 Next Steps

1. **Run locally** (`npm run dev`)
2. **Play with the prototype** (click through all screens)
3. **Test on mobile** (DevTools or local network)
4. **Deploy to Vercel** when ready to share
5. **Start building screens** with real data:
   - Connect Supabase for auth
   - Wire up the feed logic
   - Integrate messaging
   - Add map rendering

---

## 🆘 Troubleshooting

**"Port 3000 is already in use"**
```bash
npm run dev -- -p 3001
```

**"Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**"RTL text looks wrong"**
- Check `lang="he"` and `dir="rtl"` in `layout.tsx` ✓ (already set)
- All CSS uses logical properties only ✓

**"Styles not applying"**
- Tailwind rebuild takes a few seconds; refresh browser
- Check `globals.css` for color token definitions

---

## 📝 Notes

- This is a **functional prototype**, not the final product
- All data is hardcoded/placeholder
- Backend logic (auth, matching, messaging) comes next
- Design is per DECISIONS.md — no changes without updating the register first

Enjoy! 🚀

