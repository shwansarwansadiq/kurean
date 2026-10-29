# Start here: continuing Kurean in Claude Code

Everything Claude needs is in this repo. `CLAUDE.md` (read automatically) holds the decisions, rules,
status and next steps; `.claude/skills/` holds the design skills.

## 1. One-time setup on your computer (about 15 minutes)

1. **Install Node.js 22 LTS** from https://nodejs.org (includes npm).
2. **Install Git** from https://git-scm.com.
3. **Install Claude Code**: follow https://docs.claude.com/en/docs/claude-code/overview and sign in.
4. **Get the code** (in a terminal, in the folder where you keep projects):
   ```bash
   git clone https://github.com/shwansarwansadiq/kurean
   cd kurean
   npm install
   ```
5. **Get the secret keys onto your computer** without copying them by hand, using the Vercel CLI:
   ```bash
   npm i -g vercel
   vercel login            # sign in with the same account (GitHub)
   vercel link             # pick team "kurean", project "kurean"
   vercel env pull .env.local
   ```
   `.env.local` is ignored by git, so the keys never get committed. Never paste them into chat.
6. **Check it runs**:
   ```bash
   npm test
   npm run dev             # open http://localhost:3000
   ```
7. **Optional: Impeccable's automatic design checks.** In the `kurean` folder run `npx impeccable install`,
   choose Claude Code and "this project", and accept the hook. This runs Impeccable's own program after
   every edit; skip it if you'd rather not.

## 2. Start Claude Code

In the `kurean` folder:

```bash
claude
```

## 3. First message to paste

> Read CLAUDE.md. We're building phases 3 and 4 together: the public website and the /admin approval
> dashboard, so the first story on the site is one I approved. Start by proposing the page structure and the
> visual direction using the taste-skill and impeccable skills, within Kurean's brand rules (Sorani RTL first,
> mobile first, berry/plum/blush/gold, the approved finger-heart logo). Show me the direction before building
> everything. The admin needs a login only I can use.

## Useful things to know

- **Deploying:** pushing to `main` deploys to https://kurean.vercel.app automatically.
- **Database:** Supabase project `eizsrdtmftjrbxmoawdl` → SQL editor and Table editor.
- **Running the jobs by hand:** see "Pipeline" step 6 in `CLAUDE.md`.
- **Plan doc:** https://claude.ai/artifact/Cbapd6o1PLqdh6iYRNpsGP (Glossary tab = Sorani spellings)
- **Logo and post templates:** https://claude.ai/artifact/49rPtou3u9Tv8Zfessh7FR
- **Still to supply:** the Rabar font files (put them in `public/fonts/` and tell Claude), a Pexels API key
  (for scenery stories), and access to the Meta app (for publishing).
