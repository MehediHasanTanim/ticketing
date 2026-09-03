/// THE one permitted second implementation in the entire system (AD-14, amended
/// 2026-09-02b when the mobile client became Flutter).
///
/// The handset shows a live countdown while offline, so it can neither call nor
/// import the server's TypeScript fold. This file is therefore a deliberate,
/// fenced port of `core/src/job/sla.ts` - and it is the ONLY Dart copy of any
/// domain logic anywhere. Nothing else may be ported by hand.
///
/// Equivalence is not a matter of care: `contracts/sla-fixtures/vectors.json`
/// is executed by both languages and both runs gate the release. A vector added
/// on the server side that this port has not been updated for FAILS THE BUILD.
library;

const int slaFoldVersion = 1;

class JobClockEvent {
  const JobClockEvent({required this.type, required this.occurredAt});
  final String type; // 'JobLogged' | 'JobCompleted'
  final String occurredAt;

  factory JobClockEvent.fromJson(Map<String, dynamic> j) => JobClockEvent(
        type: j['type'] as String,
        occurredAt: j['occurredAt'] as String,
      );
}

class SlaSnapshot {
  const SlaSnapshot({
    required this.elapsedMs,
    required this.pausedMs,
    required this.remainingMs,
    required this.breached,
    required this.foldVersion,
  });
  final int elapsedMs;
  final int pausedMs;
  final int remainingMs;
  final bool breached;
  final int foldVersion;
}

int _ms(String iso) {
  final t = DateTime.tryParse(iso);
  if (t == null) throw ArgumentError('invalid RFC 3339 instant: $iso');
  return t.toUtc().millisecondsSinceEpoch;
}

/// Story 1.0 implements the TRIVIAL ELAPSED CASE ONLY, matching the TypeScript
/// fold exactly. Stories 3.4, 3.7 and 3.8 extend BOTH implementations together.
SlaSnapshot foldSla({
  required List<JobClockEvent> events,
  required int targetMinutes,
  required String now,
}) {
  final targetMs = targetMinutes * 60000;

  // AD-2: order by the domain clock. Arrival order is not causal order.
  final ordered = List<JobClockEvent>.from(events)
    ..sort((a, b) => _ms(a.occurredAt).compareTo(_ms(b.occurredAt)));

  JobClockEvent? logged;
  JobClockEvent? completed;
  for (final e in ordered) {
    if (logged == null && e.type == 'JobLogged') logged = e;
    if (completed == null && e.type == 'JobCompleted') completed = e;
  }

  if (logged == null) {
    return SlaSnapshot(
      elapsedMs: 0,
      pausedMs: 0,
      remainingMs: targetMs,
      breached: false,
      foldVersion: slaFoldVersion,
    );
  }

  final start = _ms(logged.occurredAt);
  final end = completed != null ? _ms(completed.occurredAt) : _ms(now);
  final elapsedMs = (end - start) < 0 ? 0 : (end - start);

  // Always 0 at foldVersion 1. Story 3.7 computes it; every reader already
  // consumes the field, so no caller changes when it starts moving.
  const pausedMs = 0;

  final measuredMs = elapsedMs - pausedMs;
  return SlaSnapshot(
    elapsedMs: elapsedMs,
    pausedMs: pausedMs,
    remainingMs: targetMs - measuredMs,
    breached: measuredMs > targetMs,
    foldVersion: slaFoldVersion,
  );
}
