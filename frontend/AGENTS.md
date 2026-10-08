<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Frontend communicates directly with the existing Express backend via `src/services` using real PostgreSQL authentication and JWT authorization (base URL `VITE_API_BASE_URL` defaulting to `http://localhost:5001`).
- Backend enum values (statuses, priorities) live in `src/lib/constants.ts` so the UI never sends unsupported values.
- Load Spline with a dynamic import after hydration inside the shared auth scene, with a static fallback; browser-only graphics must not enter SSR or block forms.
- Keep reusable animation primitives in `src/components/motion`, honor reduced motion, and keep decorative motion away from task controls.
