# clients/mobile - the handset (Flutter + Dart)

Per ARCHITECTURE-SPINE.md revision **2026-09-02b**: the mobile client is Flutter
3.2x + Dart 3.x, not React Native.

**What Story 1.0 puts here, and what it deliberately does not.**

Here now:
- `lib/sla/sla_fold.dart` - the ONE permitted Dart port of the SLA fold (AD-14).
- `bin/sla_fixtures.dart` - the Dart half of the two-language release gate.
- `pubspec.yaml` with a `[UNVERIFIED]` SDK constraint.

Not here, and not this story's job: screens, the Drift-backed durable queue, the
localisation/direction scaffold. Those are Stories 4.1-4.8. Story 1.0's client task
(T6) could not be completed in this build environment - see the story's Dev Agent
Record for what blocked it and what remains.

**Directional lint (AD-12).** When the Flutter app is scaffolded, the analyzer rule
banning `EdgeInsets.only(left:` / `right:` goes in `analysis_options.yaml` here, so
bidirectional layout is enforced from the first screen rather than retrofitted -
the spine is explicit that retrofitting it is a rebuild of the layout layer.
