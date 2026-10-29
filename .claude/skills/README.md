# Design skills for Kurean

These open-source skills load automatically when Claude Code works in this repo.

| Skill | Source | Use it for |
| --- | --- | --- |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0) | Design, critique, audit and `/impeccable polish` passes before shipping |
| `taste-skill` (design-taste-frontend) | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT) | Art direction and anti-generic styling for pages and app screens |
| `emil-design-eng`, `animate`, `improve-animations`, `review-animations`, `animation-performance`, `animation-vocabulary` | [emilkowalski/skill](https://github.com/emilkowalski/skill) (MIT) | Motion: how things move, timing, easing, reviewing animations |

Installed as files only. Impeccable's automatic design-check hooks were left out on purpose:
they run a downloaded binary on every edit. To add them later, run `npx impeccable install` in this repo.

Kurean-specific rules always win over these skills: Sorani right-to-left layout, the Rabar font,
the brand colours (berry #E8508A, plum #2A1E3B, blush #FFF2F7, sun gold #FFB938), and the
approved logo.

To update: copy the newer skill folders from the source repos over these ones.
