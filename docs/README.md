<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->
# docs/

This folder holds the Combat Writing™ methodology prose and the documentation of the plugin. The repository is source-available; everything in this folder is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International license. The full text is in LICENSES/CC-BY-NC-SA-4.0.txt, and the attribution designation and the internal-use permission are in NOTICE at the repository root.

The methodology text is `combat-writing.md` in this folder: the terms, the four stages, the rating contract, the 19 steps as written in the app, and the list of where the plugin departs from the steps. The copy the plugin ships is `plugins/combat-writing/method/combat-writing.md`, so that the plugin carries it and never fetches it; the two files are byte-identical, and `tests/license_check.js` fails when they drift.

The app that the method ships in today is at https://combatwriting.learningproducers.com, with its source at https://github.com/LearningProducers/CombatWriting. Its provenance record is docs/combat-writing-prior-art.md in that repository.
