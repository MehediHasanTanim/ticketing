/// The Dart half of AD-14's two-language release gate.
///
/// Reads the SAME vectors the TypeScript fold reads and exits non-zero on any
/// disagreement. Invoked by `npm run gate:sla-fixtures`.
import 'dart:convert';
import 'dart:io';

import '../lib/sla/sla_fold.dart';

void main(List<String> args) {
  final path = args.isNotEmpty ? args[0] : 'contracts/sla-fixtures/vectors.json';
  final doc = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;

  final declared = doc['foldVersion'] as int;
  if (declared != slaFoldVersion) {
    stderr.writeln('FAIL foldVersion: vectors declare $declared, Dart port is $slaFoldVersion');
    exit(1);
  }

  var failures = 0;
  for (final raw in (doc['vectors'] as List)) {
    final v = raw as Map<String, dynamic>;
    final expect = v['expect'] as Map<String, dynamic>;
    final got = foldSla(
      events: (v['events'] as List)
          .map((e) => JobClockEvent.fromJson(e as Map<String, dynamic>))
          .toList(),
      targetMinutes: v['targetMinutes'] as int,
      now: v['now'] as String,
    );
    final diffs = <String>[];
    void cmp(String name, Object actual, Object wanted) {
      if (actual != wanted) diffs.add('$name: got $actual, want $wanted');
    }
    cmp('elapsedMs', got.elapsedMs, expect['elapsedMs']);
    cmp('pausedMs', got.pausedMs, expect['pausedMs']);
    cmp('remainingMs', got.remainingMs, expect['remainingMs']);
    cmp('breached', got.breached, expect['breached']);
    if (diffs.isEmpty) {
      stdout.writeln('  dart  PASS  ${v['name']}');
    } else {
      failures++;
      stdout.writeln('  dart  FAIL  ${v['name']}');
      for (final d in diffs) stdout.writeln('              $d');
    }
  }
  if (failures > 0) {
    stderr.writeln('Dart port disagrees with ${failures} vector(s) - AD-14 violated');
    exit(1);
  }
  stdout.writeln('  dart  ${(doc['vectors'] as List).length} vectors passed (foldVersion $slaFoldVersion)');
}
