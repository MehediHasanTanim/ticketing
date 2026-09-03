# adapters/jazzcore/

**The only place a Jazz Core type may exist** (AD-5). One port, one owner.

Empty in Story 1.0 by design: the directory and the port (`core/src/ports/jazzcore.ts`)
are stood up here so Story 2.2 has one obvious home, and so the boundary lint is
already policing it before any Jazz Core code exists.
