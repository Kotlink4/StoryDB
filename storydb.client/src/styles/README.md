# Style System

`style-tokens.css` is the shared source for StoryDB visual tokens.

Use these rules for new UI:

- Put palette, shadows, focus rings, radii, and shared theme values in `style-tokens.css`.
- Use `--app-*` tokens for global or legacy screens.
- Use `--sp-*` tokens inside `.style-preview` and new frontend components.
- Keep component CSS in `StylePreview.css` or a component stylesheet only when it describes layout, spacing, or a component state.
- Avoid hard-coded colors in components and JSX. Dynamic runtime colors are fine when they represent data, such as timeline event colors.
- Prefer existing primitives from `StylePreviewPrimitives.tsx` before creating a new control style.
