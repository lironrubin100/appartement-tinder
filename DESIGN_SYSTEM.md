# Shutaf Design System

The core UI design system for Shutaf, built per DECISIONS.md and architected in Tailwind 4 with full RTL/LTR support.

## Core Principles

- **Logical Properties Only**: Use `start`/`end` instead of `left`/`right`, `ms`/`me` instead of `ml`/`mr`. Direction flows from the locale automatically.
- **Color Tokens**: All colors live in `globals.css` as CSS variables. Reference them via Tailwind or raw `var()`.
- **Hebrew-First**: Default locale is Hebrew (RTL). English lives under `/en` prefix (LTR).
- **Lean Components**: No over-engineering. Single responsibility. Reuse before building.

---

## Component Structure

```
src/components/
├── ui/
│   ├── Button.tsx          # Primary, secondary, ghost, danger variants
│   ├── Badge.tsx           # Inline tag/category display
│   ├── Input.tsx           # Text input with label, error, helper text
│   ├── Avatar.tsx          # User profile image with verified badge
│   ├── Modal.tsx           # Overlay dialog
│   └── index.ts            # Barrel export
├── discovery/
│   ├── SwipeCard.tsx       # Profile card (roommates, groups)
│   ├── ListingCard.tsx     # Apartment listing card
│   ├── TagFilter.tsx       # Filterable tag/category selector
│   └── index.ts            # Barrel export
└── navigation/
    ├── BottomNav.tsx       # Five-button mobile nav (Profile, Discover, Map, Plus, Chats)
    └── index.ts            # Barrel export
```

---

## Color Palette

All colors defined in `globals.css @theme`:

| Token | Hex | Usage |
|---|---|---|
| `--color-orange` | `#E2883A` | Primary accent, CTAs, brand |
| `--color-orange-soft` | `#FBE7D2` | Light backgrounds, badges |
| `--color-orange-dark` | `#B5661F` | Hover/pressed states |
| `--color-teal` | `#1F94B3` | Secondary accent, info |
| `--color-gold` | `#F0B429` | Favorites, stars |
| `--color-success` | `#4E9F63` | Success messages |
| `--color-error` | `#DB5A4A` | Errors, destructive actions |
| `--color-ink` | `#262220` | Primary text |
| `--color-body-text` | `#4A4340` | Body/secondary text |
| `--color-muted-text` | `#837B76` | Disabled/hint text |
| `--color-neutral-bg` | `#F1ECE5` | Secondary backgrounds |
| `--color-neutral-bg-soft` | `#F8F5F1` | Soft hover states |
| `--color-card-border` | `#E8E2DC` | Card/input borders |
| `--color-page-bg` | `#FBF9F6` | Page background |

**In Tailwind**: Use `bg-orange`, `text-orange`, `border-card-border`, etc.

---

## Typography

- **Font**: Rubik (Hebrew + Latin subsets)
- **Scale**:
  - Display: 800 weight, 48px
  - H1: 700 weight, 24px
  - Body: 400 weight, 16px
  - Caption: 500 weight, 13px

Configured in `app/layout.tsx` and applied globally.

---

## Spacing & Radius

**Radius Tokens** (in `globals.css`):
- `--radius-shutaf-sm`: 12px
- `--radius-shutaf-md`: 16px
- `--radius-shutaf-lg`: 20px
- `--radius-shutaf-xl`: 24px
- `--radius-shutaf-2xl`: 28px

**In Tailwind**: Use `rounded-shutaf-md`, `rounded-shutaf-lg`, etc.

---

## UI Components

### Button

```tsx
import { Button } from '@/components/ui';

<Button variant="primary">Save</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost">Learn more</Button>
<Button variant="danger" size="lg">Delete account</Button>
```

**Props**:
- `variant`: `'primary'` | `'secondary'` | `'ghost'` | `'danger'` (default: `primary`)
- `size`: `'sm'` | `'md'` | `'lg'` (default: `md`)
- Standard HTML button attributes

---

### Badge

```tsx
import { Badge } from '@/components/ui';

<Badge>Cleanliness: High</Badge>
<Badge variant="success">Verified</Badge>
<Badge removable onRemove={() => {}}>Tag</Badge>
```

**Props**:
- `variant`: `'default'` | `'success'` | `'error'` | `'warning'` (default: `default`)
- `removable`: Show ✕ button (default: `false`)
- `onRemove`: Callback when ✕ clicked

---

### Input

```tsx
import { Input } from '@/components/ui';

<Input label="Name" placeholder="Your name" />
<Input label="Email" type="email" error="Invalid email" />
<Input label="Price" icon={<DollarSign />} helperText="Monthly rent" />
```

**Props**:
- `label`: Optional label text
- `error`: Error message (disables helperText)
- `helperText`: Hint below input
- `icon`: ReactNode displayed inside (inset-end)
- Standard HTML input attributes

---

### Avatar

```tsx
import { Avatar } from '@/components/ui';

<Avatar src="/photo.jpg" size="lg" />
<Avatar initials="AR" verified />
<Avatar initials="JS" size="sm" />
```

**Props**:
- `size`: `'sm'` | `'md'` | `'lg'` | `'xl'` (default: `md`)
- `initials`: Fallback text if no `src`
- `src`: Image URL
- `verified`: Show green checkmark badge
- Standard HTML img attributes

---

### Modal

```tsx
import { Modal, Button } from '@/components/ui';

const [open, setOpen] = useState(false);

<Modal
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Confirm action"
  footer={<>
    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    <Button>Confirm</Button>
  </>}
>
  Are you sure?
</Modal>
```

**Props**:
- `isOpen`: Boolean
- `onClose`: Callback
- `title`: Optional header text
- `footer`: Optional footer content
- `size`: `'sm'` | `'md'` | `'lg'` (default: `md`)
- `closeButton`: Show ✕ button (default: `true`)

---

## Discovery Components

### SwipeCard

```tsx
import { SwipeCard } from '@/components/discovery';

<SwipeCard
  id="user-123"
  name="Sarah"
  age={22}
  initials="SR"
  photo="/sarah.jpg"
  bio="Love cooking and board games"
  tags={[
    { label: 'Clean' },
    { label: 'Night Owl' },
    { label: 'Vegetarian' },
  ]}
  matchPercentage={87}
  verified={true}
  onLike={(id) => console.log('liked', id)}
  onPass={(id) => console.log('passed', id)}
/>
```

**Props**:
- `id`, `name`, `age`, `bio`: Profile data
- `photo`, `initials`: Image or fallback
- `tags`: Array of `{ label: string; icon?: string }`
- `matchPercentage`: Optional compatibility score (0-100)
- `verified`: Show blue checkmark
- `onLike`, `onPass`: Action callbacks

---

### ListingCard

```tsx
import { ListingCard } from '@/components/discovery';

<ListingCard
  id="apt-456"
  title="3-bed modern apartment"
  price={3500}
  image="/apt.jpg"
  location="Ramat Gan"
  bedrooms={3}
  availableFrom="2026-09-01"
  tags={['AC', 'Parking', 'Pet-friendly']}
  interestedCount={5}
  saved={false}
  onSave={(id) => {}}
  onMessage={(id) => {}}
  onClick={() => {}}
/>
```

**Props**:
- `id`, `title`, `price`, `location`, `bedrooms`, `availableFrom`: Listing data
- `image`: Photo URL or fallback
- `tags`: Display up to 3 + "+N more" count
- `interestedCount`: Number of interested users
- `saved`: Heart filled state
- Callbacks: `onSave`, `onMessage`, `onClick`

---

### TagFilter

```tsx
import { TagFilter } from '@/components/discovery';

const [selected, setSelected] = useState([]);

<TagFilter
  title="Cleanliness"
  options={[
    { id: 'very-clean', label: 'Very Clean' },
    { id: 'clean', label: 'Clean' },
    { id: 'messy', label: 'Messy' },
  ]}
  selected={selected}
  onChange={setSelected}
  multiSelect={true}
  collapsible={true}
/>
```

**Props**:
- `title`: Filter category name
- `options`: Array of `{ id: string; label: string }`
- `selected`: Array of selected IDs
- `onChange`: Callback with new selection
- `multiSelect`: Allow multiple selections (default: `true`)
- `collapsible`: Can collapse/expand (default: `false`)

---

## Navigation

### BottomNav

```tsx
import { BottomNav } from '@/components/navigation';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
```

**Auto-features**:
- Five fixed buttons: Profile, Discover, Map, Plus, Chats
- Plus opens composer overlay (does not navigate)
- Active indicator bar at top
- Badge support (e.g., unread message count)
- Mobile-only (hidden on desktop)
- RTL-aware link ordering

**Props**: None (reads from `usePathname()`)

---

## RTL/LTR Best Practices

### ✅ DO

```tsx
className="ms-4 pe-6 inset-e-2"         // start/end physical directions
className="flex flex-row-reverse"        // LTR flips to RTL
style={{ insetInlineStart: '10px' }}   // CSS Logical Properties
```

### ❌ DON'T

```tsx
className="ml-4 pr-6 right-2"     // Physical left/right
className="flex flex-row"         // Always LTR
style={{ left: '10px' }}          // Not direction-aware
```

---

## Design Decisions Reference

- **I1**: Brand name = "Shutaf"
- **I2**: Font = Rubik (Hebrew + Latin)
- **I3**: Component lib = shadcn/ui fundamentals + Tailwind custom
- **I4**: Navigation = 5 buttons (Profile, Discover, Map, Plus, Chats)
- **I15**: Colors = See color palette above
- **I16**: Bilingual = Hebrew (RTL) default + English (`/en` LTR)
- **I17**: All layouts = Logical properties (start/end, ms/me)

See `DECISIONS.md` for full context.

---

## Next Steps

1. **Install components globally**: Import from `@/components` in your pages
2. **Build screens**: Map, Discover, Profile using these primitives
3. **Add state management**: Context or store as needed (not in this layer)
4. **Test RTL**: Verify all text direction and icon mirroring
5. **Iterate**: Gather feedback on spacing, contrast, motion

---

## Maintenance

- Update `globals.css` if colors change (per DECISIONS.md)
- Keep components in their folders (`ui/`, `discovery/`, `navigation/`)
- Use barrel exports (`index.ts`) to simplify imports
- Document any new variants in this file
- Enforce logical properties in code review

