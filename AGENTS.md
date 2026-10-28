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

## Architecture decisions

- Admin area lives under `_authenticated/_admin` (routes `/admin-login`, `/admin`), gated client-side by `supabase.auth.getUser()` plus a `user_roles` check — the seeded admin account and `has_role` helper come from the migration; never hardcode admin credentials in code.
- Homepage pricing reads the `plans` table through the public `listPublicPlans` server fn (publishable client, anon SELECT); admin plan edits feed this table, so never re-hardcode plan prices in UI code.
