# -*- coding: utf-8 -*-
"""Generates mockups/mobile-key-screens.html — the full housekeeper + supervisor screen set.
Governed by DESIGN.md (tokens) and EXPERIENCE.md (IA, Component Patterns, State Patterns).
Data-driven so the 20 screens stay consistent; edit the SCREENS list, re-run, do not hand-edit the HTML."""

CSS = """
:root{
  --petrol:#27565D; --petrol-deep:#14343B; --steel:#5186B9; --highlight:#08FCFF;
  --surface-base:#F1F5F6; --surface-raised:#FFFFFF; --surface-sunken:#E2EAEC;
  --ink-primary:#14343B; --ink-secondary:#4E686E; --ink-disabled:#93AAAE; --ink-on-accent:#FFFFFF;
  --accent:#27565D; --accent-ink:#27565D; --accent-pressed:#1C4147;
  --ok:#0B7A52; --due:#A8490B; --breach:#C11B1B; --paused:#4E686E; --offline:#4A45D6;
  --hairline:#D3DFE1;
  --r-sm:8px; --r-md:14px; --r-lg:20px; --r-pill:999px;
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
}
.dark{
  --surface-base:#0B1F24; --surface-raised:#132E35; --surface-sunken:#071519;
  --ink-primary:#EAF3F4; --ink-secondary:#A3BDC1; --ink-disabled:#5F7B80; --ink-on-accent:#FFFFFF;
  --accent:#2F6A73; --accent-ink:#7FD3DC; --accent-pressed:#3C818B;
  --ok:#3ED89A; --due:#FF9A4D; --breach:#FF6B6B; --paused:#9DB4B8; --offline:#9B98FF;
  --hairline:#20444C;
}
*{box-sizing:border-box}
body{margin:0;color:#14161A;font:400 15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
.page{max-width:1560px;margin:0 auto;padding:40px 24px 72px}
.grid{display:flex;flex-wrap:wrap;gap:38px 32px;align-items:flex-start}
.slot{width:344px}
.cap{color:#fff;margin:0 0 12px;min-height:66px}
.cap b{display:block;font-size:16px;font-weight:650;margin-bottom:3px}
.cap span{display:block;font-size:13px;color:#C9D5D7;line-height:1.42}
.phone{width:344px;height:716px;background:var(--surface-base);color:var(--ink-primary);
 border:9px solid #22262D;border-radius:38px;overflow:hidden;position:relative;
 box-shadow:0 18px 44px rgba(0,0,0,.34);display:flex;flex-direction:column;
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.status{height:26px;flex:0 0 26px;display:flex;align-items:center;justify-content:space-between;
 padding:0 var(--s4);font-size:12px;color:var(--ink-secondary);font-variant-numeric:tabular-nums}
.appbar{flex:0 0 auto;padding:var(--s2) var(--s4) var(--s3);display:flex;align-items:center;gap:var(--s2);background:var(--surface-base)}
.appbar h2{font-size:20px;font-weight:650;margin:0;letter-spacing:-.01em;flex:1}
.appbar .sub{font-size:13px;color:var(--ink-secondary);font-weight:400;display:block;margin-top:2px;font-variant-numeric:tabular-nums}
.appbar .back{font-size:19px;color:var(--ink-secondary);flex:0 0 auto}
.avatar{width:34px;height:34px;border-radius:var(--r-pill);background:var(--surface-sunken);display:grid;place-items:center;
 font-size:13px;font-weight:650;color:var(--ink-secondary);flex:0 0 34px}
.qcount{display:inline-flex;align-items:center;gap:5px;border-radius:var(--r-pill);border:1.5px solid var(--offline);
 color:var(--offline);background:color-mix(in srgb,var(--offline) 12%,transparent);padding:3px 10px;font-size:12.5px;
 font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap}
.strip{background:var(--surface-sunken);color:var(--ink-primary);font-size:13.5px;padding:9px var(--s4);
 border-block:1px solid var(--hairline);display:flex;gap:8px;align-items:center}
.strip .g{color:var(--offline);font-weight:700}
.body{flex:1;overflow:hidden;padding:var(--s3) var(--s4) 0;display:flex;flex-direction:column;gap:var(--s3)}
.sec{font-size:12.5px;font-weight:700;color:var(--ink-secondary);margin:var(--s1) 0 calc(-1 * var(--s1))}
.card{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md);padding:var(--s3);
 display:flex;flex-direction:column;gap:7px}
.card.prio{border-inline-start:3px solid var(--breach);padding-inline-start:calc(var(--s3) - 2px)}
.card.done{background:var(--surface-sunken);opacity:.72}
.card.tight{gap:0}
.rowtop{display:flex;align-items:center;gap:var(--s2);justify-content:space-between}
.ttl{font-size:19px;font-weight:650;letter-spacing:-.01em;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:7px;flex-wrap:wrap}
.ttl small{font-size:14px;font-weight:500;color:var(--ink-secondary);letter-spacing:0}
.meta{font-size:13.5px;color:var(--ink-secondary);font-variant-numeric:tabular-nums}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:var(--r-pill);padding:4px 11px;font-size:13.5px;
 font-weight:700;border:1.5px solid;font-variant-numeric:tabular-nums;white-space:nowrap}
.pill .gl{font-size:12px;line-height:1}
.p-ok{color:var(--ok);border-color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent)}
.p-due{color:var(--due);border-color:var(--due);background:color-mix(in srgb,var(--due) 12%,transparent)}
.p-breach{color:var(--breach);border-color:var(--breach);background:color-mix(in srgb,var(--breach) 12%,transparent)}
.p-paused{color:var(--paused);border-color:var(--paused);background:color-mix(in srgb,var(--paused) 12%,transparent)}
.p-off{color:var(--offline);border-color:var(--offline);background:color-mix(in srgb,var(--offline) 12%,transparent)}
.p-flat{color:var(--ink-secondary);border-color:var(--hairline);background:transparent;font-weight:600}
.queued{font-size:13px;color:var(--offline);font-weight:650;display:flex;align-items:center;gap:6px}
.note{font-size:13px;color:var(--ink-secondary);background:var(--surface-sunken);border-radius:var(--r-sm);padding:8px 10px;line-height:1.4}
.bar{flex:0 0 auto;background:var(--surface-raised);border-top:1px solid var(--hairline);padding:var(--s3) var(--s4) var(--s4);
 box-shadow:0 -6px 18px rgba(0,0,0,.07);display:flex;gap:10px}
.btn{display:block;width:100%;height:60px;border:none;border-radius:var(--r-md);background:var(--accent);color:var(--ink-on-accent);
 font-size:18px;font-weight:700;letter-spacing:-.01em;line-height:60px;text-align:center}
.btn.sec{background:transparent;color:var(--accent-ink);border:2px solid var(--accent-ink);line-height:56px}
.btn.warn{background:transparent;color:var(--breach);border:2px solid var(--breach);line-height:56px}
.tabs{flex:0 0 auto;display:flex;background:var(--surface-raised);border-top:1px solid var(--hairline);padding:6px 0 12px}
.tab{flex:1;text-align:center;font-size:12.5px;color:var(--ink-secondary);padding:5px 0;font-weight:600}
.tab .ic{display:block;font-size:19px;margin-bottom:2px;line-height:1}
.tab.on{color:var(--accent-ink)}
.kv{display:flex;justify-content:space-between;gap:var(--s3);font-size:15px;padding:7px 0;border-bottom:1px solid var(--hairline)}
.kv:last-child{border:none}
.kv b{font-weight:650;text-align:end}
.kv .stale{color:var(--ink-secondary)}
.hist{border:1px solid var(--hairline);border-radius:var(--r-md);overflow:hidden;background:var(--surface-raised)}
.hist .h{background:var(--surface-sunken);padding:9px var(--s3);font-size:13px;font-weight:700;display:flex;justify-content:space-between}
.hist .r{padding:9px var(--s3);border-top:1px solid var(--hairline);font-size:13px;display:flex;justify-content:space-between;
 gap:8px;color:var(--ink-secondary);font-variant-numeric:tabular-nums}
.photos{display:flex;gap:9px}
.ph{width:62px;height:62px;border-radius:var(--r-sm);background:var(--surface-sunken);border:1px solid var(--hairline);
 display:grid;place-items:center;font-size:21px;color:var(--ink-disabled)}
.phl{font-size:11px;color:var(--offline);font-weight:650;text-align:center;margin-top:3px}
.scrim{position:absolute;inset:0;background:rgba(10,12,15,.5)}
.sheet{position:absolute;inset-inline:0;bottom:0;background:var(--surface-raised);border-radius:var(--r-lg) var(--r-lg) 0 0;
 padding:var(--s3) var(--s4) var(--s4);box-shadow:0 -10px 34px rgba(0,0,0,.3)}
.grab{width:40px;height:4px;border-radius:2px;background:var(--hairline);margin:0 auto var(--s3)}
.sheet h3{margin:0 0 var(--s3);font-size:18.5px;font-weight:650;line-height:1.3}
.sheet p{margin:0 0 var(--s3);font-size:14.5px;color:var(--ink-secondary);line-height:1.45}
.opt{border:1px solid var(--hairline);border-radius:var(--r-md);padding:13px var(--s3);font-size:16px;margin-bottom:9px;
 display:flex;justify-content:space-between;align-items:center;min-height:50px;gap:8px}
.opt.on{border-color:var(--accent-ink);border-width:2px;font-weight:650}
.roomgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.rm{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-sm);padding:8px 4px;text-align:center}
.rm b{display:block;font-size:15px;font-weight:650;font-variant-numeric:tabular-nums}
.rm i{display:block;font-style:normal;font-size:11.5px;font-weight:700;margin-top:2px}
.rm.ok i{color:var(--ok)} .rm.due i{color:var(--due)} .rm.br i{color:var(--breach)}
.rm.pa i{color:var(--paused)} .rm.fl i{color:var(--ink-secondary)}
.rm.br{border-color:var(--breach);border-width:2px;padding:7px 3px}
.seg{display:flex;border:1px solid var(--hairline);border-radius:var(--r-sm);overflow:hidden;background:var(--surface-raised)}
.seg div{flex:1;text-align:center;padding:9px 0;font-size:14px;font-weight:600;color:var(--ink-secondary);border-inline-end:1px solid var(--hairline)}
.seg div:last-child{border:none}
.seg div.on{background:var(--accent);color:var(--ink-on-accent)}
.att{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md);padding:11px var(--s3);
 display:flex;flex-direction:column;gap:7px}
.att .top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.att .nm{font-size:16px;font-weight:650}
.prog{height:8px;border-radius:var(--r-pill);background:var(--surface-sunken);overflow:hidden}
.prog span{display:block;height:100%;background:var(--accent)}
.prog.late span{background:var(--due)}
.chk{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--hairline);font-size:15.5px}
.chk:last-child{border:none}
.chk .yn{display:flex;gap:7px;flex:0 0 auto}
.chk .yn i{font-style:normal;width:42px;height:36px;border:1.5px solid var(--hairline);border-radius:var(--r-sm);
 display:grid;place-items:center;font-size:15px;font-weight:700;color:var(--ink-secondary)}
.chk .yn i.p{border-color:var(--ok);color:var(--ok);background:color-mix(in srgb,var(--ok) 12%,transparent)}
.chk .yn i.f{border-color:var(--breach);color:var(--breach);background:color-mix(in srgb,var(--breach) 12%,transparent)}
.kpis{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.kpi{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md);padding:11px var(--s3)}
.kpi b{display:block;font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1}
.kpi span{display:block;font-size:12.5px;color:var(--ink-secondary);margin-top:2px}
.kpi.alert b{color:var(--breach)}
.signin{flex:1;display:flex;flex-direction:column}
.signin-head{background:linear-gradient(160deg,var(--petrol) 0%,var(--steel) 150%);padding:var(--s6) var(--s4) var(--s5);
 color:#fff;display:flex;flex-direction:column;gap:var(--s4)}
.signin-pad{flex:1;padding:var(--s4);display:flex;flex-direction:column;gap:var(--s3);justify-content:center;background:var(--surface-base)}
.brand{text-align:center}
.brand b{font-size:26px;font-weight:700;letter-spacing:-.02em;display:block;color:#fff}
.brand b i{font-style:normal;color:var(--highlight)}
.brand span{display:block;font-size:14px;margin-top:3px;color:rgba(255,255,255,.84)}
.langs{display:flex;flex-wrap:wrap;gap:7px;justify-content:center}
.lang{border:1.5px solid rgba(255,255,255,.36);background:rgba(255,255,255,.10);color:#EAF3F4;border-radius:var(--r-pill);
 padding:6px 13px;font-size:14.5px}
.lang.on{background:var(--highlight);border-color:var(--highlight);color:#0B2A30;font-weight:700}
.dots{display:flex;gap:12px;justify-content:center;margin:var(--s2) 0}
.dot{width:15px;height:15px;border-radius:var(--r-pill);border:2px solid var(--ink-secondary)}
.dot.f{background:var(--ink-primary);border-color:var(--ink-primary)}
.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.key{height:60px;border-radius:var(--r-md);background:var(--surface-raised);border:1px solid var(--hairline);
 display:grid;place-items:center;font-size:25px;font-weight:650;font-variant-numeric:tabular-nums}
.key.blank{background:transparent;border:none}
.me{display:flex;flex-direction:column;gap:0;background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md)}
.me div{padding:14px var(--s3);border-bottom:1px solid var(--hairline);display:flex;justify-content:space-between;font-size:15.5px;gap:8px}
.me div:last-child{border:none}
.me div b{font-weight:650}
.chips{display:flex;gap:7px;flex-wrap:wrap}
.chip{border:1.5px solid var(--hairline);border-radius:var(--r-pill);padding:6px 12px;font-size:13.5px;
 color:var(--ink-secondary);background:var(--surface-raised);font-weight:600}
.chip.on{border-color:var(--accent);color:var(--ink-on-accent);background:var(--accent)}
.tick{width:26px;height:26px;border-radius:var(--r-sm);border:2px solid var(--hairline);display:grid;place-items:center;
 font-size:14px;color:transparent;flex:0 0 26px}
.tick.on{border-color:var(--accent);background:var(--accent);color:#fff}
.card.sel{border-color:var(--accent);border-width:2px;padding:calc(var(--s3) - 1px)}
/* selection must never mask priority — the red start edge outranks the selected outline */
.card.prio.sel{border-inline-start-color:var(--breach);border-inline-start-width:4px;padding-inline-start:calc(var(--s3) - 3px)}
.opt.dis{opacity:.5}
.opt .lk{font-size:12.5px;color:var(--ink-disabled);font-weight:600}
.axis{display:flex;gap:9px}
.axis>div{flex:1;background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md);padding:10px var(--s3)}
.axis span{display:block;font-size:12px;color:var(--ink-secondary);font-weight:600}
.axis b{display:block;font-size:16.5px;font-weight:650;margin-top:2px}
.axis .src{font-size:11.5px;color:var(--ink-disabled);font-weight:600;margin-top:3px}
.rtl{direction:rtl}
.num{unicode-bidi:isolate}
@media (max-width:760px){.page{padding:24px 14px 48px}.slot,.phone{width:100%;max-width:344px}}
"""

# ---------- helpers ----------
def pill(kind, glyph, text):
    return f'<span class="pill p-{kind}"><span class="gl">{glyph}</span>{text}</span>'
def phone(inner, dark=False, rtl=False):
    cls = "phone" + (" dark" if dark else "") + (" rtl" if rtl else "")
    return f'<div class="{cls}">{inner}</div>'
def status(time="09:41", dark=False, rtl=False):
    bat = "⌁ ▮▮▯" if rtl else "▮▮▯ ⌁"
    return f'<div class="status"><span>{time}</span><span>{bat}</span></div>'
def appbar(title, sub=None, right="", back=False):
    b = '<span class="back">‹</span>' if back else ''
    s = f'<span class="sub">{sub}</span>' if sub else ''
    return f'<div class="appbar">{b}<div style="flex:1"><h2>{title}</h2>{s}</div>{right}</div>'
def body(*blocks):
    return '<div class="body">' + "".join(blocks) + '</div>'
def bar(*btns):
    return '<div class="bar">' + "".join(btns) + '</div>'
def btn(label, kind=""):
    c = "btn" + (f" {kind}" if kind else "")
    return f'<div class="{c}" style="flex:1">{label}</div>'
def tabs(items, active):
    out = ""
    for ic, lab in items:
        on = " on" if lab == active else ""
        out += f'<div class="tab{on}"><span class="ic">{ic}</span>{lab}</div>'
    return f'<div class="tabs">{out}</div>'
def sec(t): return f'<div class="sec">{t}</div>'
def card(rowtop=None, title=None, metas=(), note=None, queued=None, cls=""):
    inner = ""
    if rowtop: inner += f'<div class="rowtop">{rowtop}</div>'
    if title: inner += f'<div class="ttl">{title}</div>'
    for m in metas: inner += f'<div class="meta">{m}</div>'
    if note: inner += f'<div class="note">{note}</div>'
    if queued: inner += f'<div class="queued">⇅ {queued}</div>'
    c = "card" + (f" {cls}" if cls else "")
    return f'<div class="{c}">{inner}</div>'
def rt(left, right=""): return f'{left}<span class="meta">{right}</span>'
def num(n): return f'<span class="num">{n}</span>'
def kvcard(rows):
    return '<div class="card tight">' + "".join(
        f'<div class="kv"><span>{k}</span><b class="{c}">{v}</b></div>' for k, v, c in rows) + '</div>'
def sheet(h3, inner, p=None):
    pp = f'<p>{p}</p>' if p else ''
    return f'<div class="scrim"></div><div class="sheet"><div class="grab"></div><h3>{h3}</h3>{pp}{inner}</div>'
def strip(text, glyph="⇅"):
    return f'<div class="strip"><span class="g">{glyph}</span> {text}</div>'

HK_TABS = [("▤","Board"),("◷","My work"),("✉","Inbox")]
SV_TABS = [("▦","Floor"),("◷","My work"),("✉","Inbox")]

# ================= HOUSEKEEPER =================
H = []
H.append(("H1","Sign in","Shared handset. Language before authentication, in its own script. Petrol ground, cyan only on the wordmark.",
 status()+'<div class="signin"><div class="signin-head">'
 '<div class="brand"><b>Jazz<i>Ticketing</i></b><span>Grand Meridian · Floor team</span></div>'
 '<div class="langs">'+''.join(f'<div class="lang{" on" if l=="Tagalog" else ""}">{l}</div>' for l in
   ["English","Tagalog","Español","Português","العربية","עברית","中文","Nederlands"])+'</div></div>'
 '<div class="signin-pad"><div><div style="text-align:center;font-size:16px;color:var(--ink-secondary);margin-bottom:6px">Ilagay ang iyong PIN</div>'
 '<div class="dots"><span class="dot f"></span><span class="dot f"></span><span class="dot f"></span><span class="dot"></span></div></div>'
 '<div class="pad">'+''.join(f'<div class="key">{k}</div>' for k in [1,2,3,4,5,6,7,8,9])+
 '<div class="key blank"></div><div class="key">0</div><div class="key">⌫</div></div></div></div>'))

H.append(("H2","Board — dual-role home","Rosa cleans and runs. Dispatched Jobs sit in a Now group above her rooms; Job cards and Room cards stay distinct types on one screen.",
 status()+appbar("My board","22 credits · 9 rooms left",'<div class="avatar">RS</div>')+
 body(sec("Now · 1 job"),
      card(rt(pill("due","●","9 min left"),"Runner"), f'{num("0914")} <small>Extra towels</small>', ["Dispatched 09:38 · guest in room"]),
      sec("My rooms · 9 left"),
      card(rt(pill("due","●","Re-clean"),"4 credits"), f'{num("1204")} <small>Departure</small>',
           note="Inspection rejected 09:22 — bathroom mirror marks. Photo attached.", cls="prio"),
      card(rt(pill("flat","○","Not started"),"3 credits"), f'{num("1206")} <small>Departure</small>', ["Arrival 14:00 · King"]),
      card(rt(pill("ok","✓","Clean 09:14"),"2 credits"), f'{num("1202")} <small>Stayover</small>', cls="done"))+
 tabs(HK_TABS,"Board")))

H.append(("H3","Room detail","One primary action, thumb-zone, verb-labelled. Guest context sits above the work; the room's own state is the title.",
 status("09:52")+appbar(num("1204"),"Departure · Started 09:44",'<div class="avatar">⋯</div>',back=True)+
 body(kvcard([("Guest","Checked out 08:10",""),("Clean type","Departure · 4 credits",""),("Next arrival","14:00","")]),
      sec("Faults in this room"),
      card(rt(pill("due","●","Open"),"Engineering"), '<small style="font-size:15px">Bathroom mirror cracked</small>', ["Raised 09:47 by you · photo attached"]),
      sec("Notes from inspection"),
      '<div class="note">Mirror marks near the basin — re-check before marking clean. — A. Rivera 09:22</div>')+
 bar(btn("Complete"))))

H.append(("H4","Raise a fault","Two taps to a Work Order: category, then photo or skip. Location is pre-filled and the room's own flow is never blocked.",
 status("09:47")+appbar(num("1204"),"Departure · Started 09:44",back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+kvcard([("Guest","Checked out 08:10",""),("Clean type","Departure · 4 credits","")])+'</div>'+
 sheet(f'Report a problem in {num("1204")}',
   ''.join(f'<div class="opt{" on" if o=="Damage — bathroom" else ""}">{o} <span>›</span></div>'
     for o in ["Damage — bathroom","Damage — bedroom","Hot / cold","Electrical","Plumbing"])+
   '<div style="display:flex;gap:10px;margin-top:var(--s3)"><div class="btn sec" style="flex:1">Skip photo</div><div class="btn" style="flex:1">Photo</div></div>')))

H.append(("H5","Complete — confirm","Irreversible actions get a confirm sheet that names the object. Everything else is immediate and undoable.",
 status("10:18")+appbar(num("1204"),"Departure · Started 09:44",back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+kvcard([("Guest","Checked out 08:10",""),("Clean type","Departure · 4 credits","")])+'</div>'+
 sheet(f'Mark {num("1204")} clean?',
   '<div class="photos" style="margin-bottom:var(--s4)"><div><div class="ph">▣</div><div class="phl">Queued</div></div><div><div class="ph">＋</div></div></div>'
   '<div style="display:flex;gap:10px"><div class="btn sec" style="flex:1">Not yet</div><div class="btn" style="flex:1">Mark clean</div></div>',
   p="It goes to your supervisor for inspection. The room shows as clean to the front desk straight away.")))

H.append(("H6","DND and refuse service","Not completing a room is a first-class outcome, not a failure state. A re-attempt reminder is set from the sheet.",
 status("11:02")+appbar(num("1211"),"Stayover · Not started",back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+kvcard([("Guest","In house · departs 02 Sep",""),("Clean type","Stayover · 2 credits","")])+'</div>'+
 sheet(f'{num("1211")} — what happened?',
   '<div class="opt on">Do not disturb sign <span>›</span></div>'
   '<div class="opt">Guest refused service <span>›</span></div>'
   '<div class="opt">Guest in room, asked me to return <span>›</span></div>'
   '<div class="note" style="margin:var(--s3) 0">We will remind you at 14:00. Your supervisor sees it on the floor view.</div>'
   '<div class="btn">Save</div>')))

H.append(("H7","Linen and amenities","Supply requests are Catalog Entries on the Job lifecycle — she keeps working while it runs.",
 status("10:24")+appbar("Request supplies",None,back=True)+
 body(sec("For room "+num("1206")),
      ''.join(f'<div class="opt{" on" if o.startswith("Bath towels") else ""}">{o} <span>{"3" if o.startswith("Bath") else "›"}</span></div>'
        for o in ["Bath towels","Hand towels","Bed linen — king","Pillows","Bathroom amenities","Minibar restock"]),
      sec("Deliver to"),
      '<div class="seg"><div class="on">This room</div><div>Floor pantry</div></div>')+
 bar(btn("Send request"))))

H.append(("H8","Inbox","Every push has an Inbox counterpart, so a missed notification is never lost work. A Job taken by someone else reads as taken, not gone.",
 status("10:31")+appbar("Inbox","2 new",'<span class="qcount">⇅ 1 queued</span>')+
 body(card(rt(pill("due","●","12 min left"),"Dispatched 10:29"), '<small style="font-size:16px">Extra towels · '+num("0914")+'</small>', ["Tap to accept"]),
      card(rt(pill("flat","○","Taken by Ana"),"10:22"), '<small style="font-size:16px">Iron · '+num("0705")+'</small>', ["No action needed"], cls="done"),
      card(rt(pill("breach","▲","Reassigned away"),"10:05"), '<small style="font-size:16px">'+num("1208")+' moved to Ana</small>',
           ["Your note and photo moved with it"]),
      card(rt(pill("ok","✓","Inspection passed"),"09:58"), '<small style="font-size:16px">'+num("1202")+'</small>', cls="done"))+
 tabs(HK_TABS,"Inbox")))

H.append(("H9","Me — queued work and shift end","Queued actions belong to the Staff Member, not the handset. Ending a shift returns unfinished rooms with their state intact.",
 status("15:44")+appbar("Rosa Santos","Room Attendant · Grand Meridian",'<div class="avatar">RS</div>')+
 body(sec("Waiting to send · 2"),
      '<div class="me"><div><span>'+num("1206")+' marked clean</span><b class="queued" style="font-size:13px">⇅ 14:52</b></div>'
      '<div><span>'+num("1211")+' DND</span><b class="queued" style="font-size:13px">⇅ 14:58</b></div></div>',
      sec("Settings"),
      '<div class="me"><div><span>Language</span><b>Tagalog</b></div><div><span>Notifications</span><b>On</b></div>'
      '<div><span>Text size</span><b>Large</b></div></div>')+
 bar(btn("End shift","sec"),btn("Sign out","warn"))))

H.append(("H-AR","Board — Arabic, dark, offline","Arabic ships in R1, so this is a shipping surface. Mirrored layout, not a second design. Credits and times take Eastern Arabic digits; Room numbers stay Western so they match the door.",
 status("١٠:١٤",rtl=True)+
 '<div class="appbar"><div style="flex:1"><h2>لوحتي</h2><span class="sub">٢٢ رصيد · ٩ غرف متبقية</span></div><span class="qcount">⇅ ٣ بالانتظار</span></div>'+
 strip("لا توجد إشارة — تم حفظ عملك على هذا الهاتف.")+
 body(card(rt(pill("due","●","إعادة تنظيف"),"٤ أرصدة"), f'{num("1204")} <small>مغادرة</small>', queued="بانتظار الإرسال", cls="prio"),
      card(rt(pill("flat","○","لم تبدأ"),"٣ أرصدة"), f'{num("1206")} <small>مغادرة</small>', ["الوصول ١٤:٠٠"]),
      card(rt(pill("paused","‖","ممنوع الإزعاج"),"٣ أرصدة"), f'{num("1211")} <small>إقامة</small>', queued="بانتظار الإرسال"),
      card(rt(pill("ok","✓","نظيفة ٠٩:١٤"),"٢ رصيد"), f'{num("1202")} <small>إقامة</small>', cls="done"))+
 '<div class="tabs"><div class="tab on"><span class="ic">▤</span>لوحتي</div><div class="tab"><span class="ic">◷</span>مهامي</div>'
 '<div class="tab"><span class="ic">✉</span>الوارد</div></div>', True, True))

# ================= SUPERVISOR =================
S = []
def rm(n, state, glyph):
    kinds = {"Ready":"ok","Clean":"ok","Dirty":"due","Redo":"br","DND":"pa","OOO":"br","In prog":"fl","Refused":"pa","Insp":"fl"}
    return f'<div class="rm {kinds[state]}"><b class="num">{n}</b><i>{glyph} {state}</i></div>'

S.append(("S1","Floor — live room status","The supervisor's home. A room grid she can read while walking, not the console's planning grid shrunk down. Status is written, never colour-only.",
 status("10:41")+appbar("Floor 12","8 dirty · 2 stuck · 14 arrivals by 15:00",'<div class="avatar">AR</div>')+
 body('<div class="seg"><div>10</div><div>11</div><div class="on">12</div><div>13</div><div>All</div></div>',
      '<div class="roomgrid">'+
      rm(1201,"Ready","✓")+rm(1202,"Clean","✓")+rm(1203,"Dirty","●")+rm(1204,"Redo","▲")+
      rm(1205,"In prog","▶")+rm(1206,"Dirty","●")+rm(1207,"Ready","✓")+rm(1208,"In prog","▶")+
      rm(1209,"Insp","◷")+rm(1210,"Dirty","●")+rm(1211,"DND","‖")+rm(1212,"OOO","▲")+
      '</div>',
      sec("Needs you"),
      card(rt(pill("breach","▲","Re-clean · 19 min"),"Rosa S."), f'{num("1204")} <small>Departure · arrival 14:00</small>', ["Rejected 09:22 · not restarted"], cls="prio"),
      card(rt(pill("breach","▲","Out of order"),"Engineering"), f'{num("1212")} <small>Fan-coil · since 08:10</small>', ["Expected back 02 Sep"]))+
 tabs(SV_TABS,"Floor")))

def att(nm, credits, done, total, pct, late=False, flag=None):
    lateflag = ' late' if late else ''
    f = f'<div class="meta">{flag}</div>' if flag else ''
    p = pill("due","●","20 min behind") if late else pill("ok","✓","On pace")
    return ('<div class="att"><div class="top"><span class="nm">'+nm+'</span>'+p+'</div>'
            f'<div class="meta">{done} of {total} rooms · {credits} credits</div>'
            f'<div class="prog{lateflag}"><span style="width:{pct}%"></span></div>{f}</div>')

S.append(("S2","Boards — who is where","Progress against this property's own median for the room type, not against a flat clock. The flag is computed server-side; the visual is the only design choice.",
 status("10:43")+appbar("Boards","4 attendants · 31 rooms left",'<span class="qcount">⇅ 1 queued</span>',back=True)+
 body(att("Rosa Santos",22,7,16,44,True,"Floors 9–11 · 1204 not restarted"),
      att("Ana Rivera",18,11,15,73),
      att("Marisol Cruz",20,9,17,53),
      att("Fatima Noor",16,14,16,88,flag="Finishing — can take rooms"))+
 bar(btn("Reassign rooms"))))

S.append(("S3","Reassign — mid-shift","Moving a started room asks for confirmation and preserves start time, notes and any Faults raised. The receiving attendant sees who had it.",
 status("10:45")+appbar("Reassign","From Rosa Santos",back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+att("Rosa Santos",22,7,16,44,True)+'</div>'+
 sheet("Move 6 rooms to Fatima Noor?",
   '<div class="note" style="margin-bottom:var(--s3)">'+num("1208")+' was started at 10:12. Its start time, notes and the fault Rosa raised move with it.</div>'
   '<div class="opt on">1206 · 1208 · 1210 · 1214 · 1216 · 1217 <span>6</span></div>'
   '<div style="display:flex;gap:10px;margin-top:var(--s3)"><div class="btn sec" style="flex:1">Cancel</div><div class="btn" style="flex:1">Move rooms</div></div>',
   p="Credits recalculate for both boards. Both attendants are notified.")))

S.append(("S4","Inspection","A scored checklist with pass and fail as equal-weight targets — no accidental pass. Rejection requires a note.",
 status("11:12")+appbar("Inspect "+num("1206"),"Marisol Cruz · clean 11:04",back=True)+
 body('<div class="card tight">'+
      ''.join(f'<div class="chk"><span>{lab}</span><div class="yn"><i class="{p}">Pass</i><i class="{f}">Fail</i></div></div>'
        for lab,p,f in [("Bathroom","p",""),("Bed made","p",""),("Floors","p",""),("Surfaces dusted","","f"),("Amenities stocked","p",""),("Minibar","p","")])+
      '</div>',
      sec("Note for the attendant"),
      '<div class="note">Dust on the desk and the window ledge. Photo attached.</div>')+
 bar(btn("Reject","warn"),btn("Pass"))))

S.append(("S5","Rejection sent","The rejected room returns to the originating attendant's board ahead of unstarted rooms, carrying the note and photo — the loop that makes inspection mean something.",
 status("11:14")+appbar("Inspect "+num("1206"),"Marisol Cruz · clean 11:04",back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+kvcard([("Result","Rejected",""),("Failed","Surfaces dusted","")])+'</div>'+
 sheet(f'{num("1206")} sent back to Marisol',
   '<div class="me"><div><span>Position on her board</span><b>Top</b></div><div><span>Note and photo</span><b>Attached</b></div>'
   '<div><span>Front desk</span><b>Room shows dirty again</b></div></div>'
   '<div class="btn" style="margin-top:var(--s4)">Done</div>',
   p="She is notified now. Arrival for this room is 15:30, so there is time.")))

S.append(("S6","My work — approvals and escalations","The supervisor's queue is other people's blocked work. Approvals and breaches, most urgent first, each with enough context to decide without opening it.",
 status("11:26")+appbar("My work","2 approvals · 1 breach")+
 body(sec("Needs a decision"),
      card(rt(pill("breach","▲","Escalated 4 min"),"Unaccepted"), f'{num("1518")} <small>Hot / cold · Priority</small>',
           ["No engineer accepted in 10 min · guest in room"], cls="prio"),
      card(rt(pill("due","●","Awaiting you"),"Recovery"), '<small style="font-size:16px">Room 0812 · $120 comp</small>',
           ["D. Okafor · above his threshold · glitch linked"]),
      card(rt(pill("due","●","Awaiting you"),"Recovery"), '<small style="font-size:16px">Room 1204 · one night</small>',
           ["D. Okafor · guest complained at checkout"]),
      sec("Mine to do"),
      card(rt(pill("ok","✓","On track"),"Inspection"), '<small style="font-size:16px">3 rooms awaiting inspection</small>', ["Floor 12"]))+
 tabs(SV_TABS,"My work")))

S.append(("S7","Escalation — decide and move","A breach the supervisor can resolve in one action: assign it to someone who is free, or take it. Reassigning preserves the SLA clock and the history.",
 status("11:27")+appbar(num("1518")+" · Hot / cold","Work Order · Priority · Engineering",back=True)+
 body('<div>'+pill("breach","▲","Overdue by 8 min")+'</div>',
      kvcard([("Guest","In house · VIP",""),("Reported","09:39 · front desk",""),("Escalated","11:23 · no acceptance","")]),
      sec("Who is free"),
      card(rt("<b>M. Ortiz</b>","2 open"), '<small style="font-size:15px">Floor 15 · nearest</small>', ["Last closed 11:04"]),
      card(rt("<b>K. Bello</b>","4 open"), '<small style="font-size:15px">Plant room</small>', ["One priority job open"]))+
 bar(btn("Take it","sec"),btn("Assign Ortiz"))))

S.append(("S8","Room detail — supervisor","Same room, more verbs. Overrides exist but are logged and never sit in the thumb zone; out-of-order goes to Jazz Core from here.",
 status("11:31")+appbar(num("1204"),"Departure · Rosa Santos",'<div class="avatar">⋯</div>',back=True)+
 body(kvcard([("Status","Re-clean · rejected 09:22",""),("Started","09:44 · not restarted",""),("Next arrival","14:00","")]),
      sec("History"),
      '<div class="hist"><div class="h"><span>This room today</span><span>5 events ›</span></div>'
      '<div class="r"><span>09:22 · inspection rejected</span><span>A. Rivera</span></div>'
      '<div class="r"><span>09:47 · fault raised</span><span>R. Santos</span></div>'
      '<div class="r"><span>10:18 · marked clean</span><span>R. Santos</span></div></div>',
      sec("Overrides"),
      '<div class="me"><div><span>Mark clean without inspection</span><b>›</b></div>'
      '<div><span>Set out of order</span><b>›</b></div><div><span>Reassign room</span><b>›</b></div></div>')+
 bar(btn("Message Rosa","sec"),btn("Inspect now"))))

S.append(("S9","Department load","What the shift looks like before it goes wrong. Every figure drills through; the panel names its own freshness because a stale number is worse than no number.",
 status("11:34")+appbar("Housekeeping","Shift 07:00–15:00 · live",back=True)+
 body('<div class="kpis">'
      '<div class="kpi"><b>31</b><span>rooms left</span></div>'
      '<div class="kpi alert"><b>2</b><span>SLA breaches</span></div>'
      '<div class="kpi"><b>14</b><span>arrivals by 15:00</span></div>'
      '<div class="kpi alert"><b>4</b><span>not ready for arrival</span></div>'
      '<div class="kpi"><b>26 min</b><span>median departure clean</span></div>'
      '<div class="kpi"><b>1</b><span>out of order</span></div></div>',
      sec("Against baseline"),
      '<div class="me"><div><span>Median clean time</span><b>26 min · was 31</b></div>'
      '<div><span>SLA compliance</span><b>91% · was 78%</b></div>'
      '<div><span>Re-cleans today</span><b>3 of 47</b></div></div>',
      '<div class="note">Updated 11:34. Housekeeping mobile use 94% of roster today — figures complete.</div>')+
 tabs(SV_TABS,"Floor")))

S.append(("S-AR","Floor — Arabic, dark, offline","The supervisor surface mirrored. The room grid reads right-to-left; room numbers stay Western. Offline is stated, not treated as an error.",
 status("١١:٤٠",rtl=True)+
 '<div class="appbar"><div style="flex:1"><h2>الطابق ١٢</h2><span class="sub">٨ غرف غير نظيفة · ١٤ وصول</span></div><span class="qcount">⇅ ٢ بالانتظار</span></div>'+
 strip("لا توجد إشارة — تم حفظ عملك على هذا الهاتف.")+
 body('<div class="seg"><div>١٠</div><div>١١</div><div class="on">١٢</div><div>الكل</div></div>',
      '<div class="roomgrid">'+
      '<div class="rm ok"><b class="num">1201</b><i>✓ جاهزة</i></div>'
      '<div class="rm due"><b class="num">1203</b><i>● غير نظيفة</i></div>'
      '<div class="rm br"><b class="num">1204</b><i>▲ إعادة</i></div>'
      '<div class="rm fl"><b class="num">1205</b><i>◐ جارية</i></div>'
      '<div class="rm due"><b class="num">1206</b><i>● غير نظيفة</i></div>'
      '<div class="rm ok"><b class="num">1207</b><i>✓ جاهزة</i></div>'
      '<div class="rm pa"><b class="num">1211</b><i>‖ لا إزعاج</i></div>'
      '<div class="rm br"><b class="num">1212</b><i>▲ خارج الخدمة</i></div>'+
      '</div>',
      sec("تحتاج إلى انتباهك"),
      card(rt(pill("breach","▲","إعادة تنظيف "+num("١٩ د")),"روزا"), f'{num("1204")} <small>مغادرة</small>', queued="بانتظار الإرسال", cls="prio"))+
 '<div class="tabs"><div class="tab on"><span class="ic">▦</span>الطابق</div><div class="tab"><span class="ic">◷</span>مهامي</div>'
 '<div class="tab"><span class="ic">✉</span>الوارد</div></div>', True, True))

# ---- added after review: explicit Room Status editing, and the supervisor's cross-department queue ----
H.append(("H10","Set room status directly","Status without doing the clean. Cleanliness is hers to set; occupancy is read-only from Jazz Core, because the PMS owns whether a room is sold (FR-51). Reached from the room's overflow, not buried in the clean flow.",
 status("13:05")+appbar(num("1206"),"Departure · not started",'<div class="avatar">⋯</div>',back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+
 '<div class="axis"><div><span>Cleanliness</span><b>Dirty</b><div class="src">set by staff</div></div>'
 '<div><span>Occupancy</span><b>Vacant</b><div class="src">from Jazz Core</div></div></div>'+'</div>'+
 sheet(f'Set status for {num("1206")}',
   '<div class="opt">Dirty <span>›</span></div>'
   '<div class="opt on">Clean <span>✓</span></div>'
   '<div class="opt dis">Inspected <span class="lk">Supervisor only</span></div>'
   '<div class="opt">Out of order <span class="lk">Needs engineering</span></div>'
   '<div class="note" style="margin:var(--s3) 0">Vacant or occupied comes from Jazz Core and cannot be changed here. '
   'If the room is not what the system says, report a discrepancy.</div>'
   '<div class="btn sec">Report a discrepancy</div>',
   p="Front desk sees this within seconds. It does not start or complete a clean.")))

H.append(("H11","Report a discrepancy","The room does not match what the system says. She reports what she sees; she never overrides occupancy. This is how sleeps and skips get caught on the floor instead of at night audit.",
 status("13:07")+appbar(num("1211"),"Stayover · shown vacant",back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+
 '<div class="axis"><div><span>Cleanliness</span><b>Dirty</b><div class="src">set by staff</div></div>'
 '<div><span>Occupancy</span><b>Vacant</b><div class="src">from Jazz Core</div></div></div>'+'</div>'+
 sheet("What did you find?",
   '<div class="opt on">Occupied — luggage and bed slept in <span>✓</span></div>'
   '<div class="opt">Vacant — but shown occupied <span>›</span></div>'
   '<div class="opt">Bed not slept in <span>›</span></div>'
   '<div class="photos" style="margin:var(--s3) 0"><div><div class="ph">＋</div></div></div>'
   '<div class="btn">Send to front desk</div>',
   p="Goes to the front desk and your supervisor. Occupancy stays as Jazz Core has it until they resolve it.")))

S.append(("S10","All open jobs — every department","Her whole property in one list, not just what needs her decision. Filter by department and SLA state; unassigned work is visually distinct because it is the only kind nobody is working on.",
 status("11:52")+appbar("Open jobs","18 open · 3 breached",'<span class="qcount">⇅ 1 queued</span>')+
 body('<div class="chips"><div class="chip on">All</div><div class="chip">Housekeeping</div><div class="chip">Engineering</div>'
      '<div class="chip">F&amp;B</div><div class="chip">Unassigned 4</div></div>',
      card(rt(pill("breach","▲","Overdue 8 min"),'<span class="tick on">✓</span>'),
           f'{num("1518")} <small>Hot / cold</small>', ["Engineering · unassigned · guest in room"], cls="prio sel"),
      card(rt(pill("due","●","9 min left"),'<span class="tick on">✓</span>'),
           f'{num("0914")} <small>Extra towels</small>', ["Housekeeping · unassigned"], cls="sel"),
      card(rt(pill("due","●","22 min left"),'<span class="tick"></span>'),
           f'{num("0812")} <small>Lamp not working</small>', ["Engineering · M. Ortiz · accepted 11:41"]),
      card(rt(pill("paused","‖","Paused 28 min"),'<span class="tick"></span>'),
           f'{num("0940")} <small>Shower draining</small>', ["Engineering · K. Bello · guest DND"]))+
 bar(btn("Assign 2 jobs"))))

S.append(("S11","Assign the resource","Who to send, decided on the two things that actually matter on a floor: current load and how far away they are. Skill match is stated, never assumed. Sending to a department queue stays an option — a queue nobody owns is worse than a queue everybody sees.",
 status("11:53")+appbar("Assign 2 jobs","1518 Hot/cold · 0914 Towels",back=True)+
 '<div class="body" style="filter:blur(1.5px)">'+
 card(rt(pill("breach","▲","Overdue 8 min"),""), f'{num("1518")} <small>Hot / cold</small>', ["Engineering · unassigned"], cls="prio")+'</div>'+
 sheet("Send to",
   '<div class="opt on"><span><b>M. Ortiz</b> · Engineering<br><span class="lk">2 open · floor 15 · HVAC certified</span></span><span>✓</span></div>'
   '<div class="opt"><span><b>K. Bello</b> · Engineering<br><span class="lk">4 open · plant room · HVAC certified</span></span><span>›</span></div>'
   '<div class="opt"><span><b>F. Noor</b> · Housekeeping<br><span class="lk">Finishing board · floor 9 · towels only</span></span><span>›</span></div>'
   '<div class="opt"><span>Engineering queue<br><span class="lk">Anyone eligible can accept · escalates in 10 min</span></span><span>›</span></div>'
   '<div style="display:flex;gap:10px;margin-top:var(--s3)"><div class="btn sec" style="flex:1">Cancel</div>'
   '<div class="btn" style="flex:1">Assign</div></div>',
   p="The SLA clock keeps running — assigning does not reset it. Both people are notified.")))


# ================= ASSEMBLE =================
EVIDENCE = [
 ("H1","Shared Devices and Sessions · Component Patterns (PIN pad) · i18n (language before auth) · KF-1.1"),
 ("H2","IA (dual-role home, Now group) · FR-63 mobile Job queue · FR-17 staff-raised Requests · Component Patterns (Now group, Room card) · State Patterns (rejected inspection to top) · KF-1.2"),
 ("H3","FR-21 attendant room flow · FR-62 photo attachment · Component Patterns (Room card, primary action bar) · KF-1.3"),
 ("H4","FR-22 raise a Fault from a Room · FR-17 staff-raised Requests · FR-62 photo capture · Interaction Primitives (tap-only) · KF-1.4"),
 ("H5","FR-21 completion requires configured fields · FR-62 photo queued offline · Interaction Primitives (confirm sheets) · KF-1.5"),
 ("H6","FR-21 DND and refuse service with re-attempt reminder · FR-13 pause conditions · State Patterns · Voice and Tone"),
 ("H7","FR-26 linen and amenities as Catalog Entries · FR-17 staff-raised Requests"),
 ("H8","FR-60 push notification with an Inbox counterpart · FR-67 suppression (taken Jobs read as taken) · FR-59 sync conflict surfaced"),
 ("H9","FR-58 offline queue belongs to the Staff Member · FR-64 sign-out clears guest context not queued work · FR-29 shift handover · FR-61 language"),
 ("H-AR","FR-61 multi-language and RTL · FR-58 offline queueing · numeral-form rule · DESIGN.md dark palette"),
 ("H10","FR-19 Room Status model · FR-21 direct cleanliness change · FR-51 Jazz Core authoritative for occupancy · Component Patterns (sheet depth 1)"),
 ("H11","FR-51 conflict authority · FR-79 discrepancy reporting · FR-58 queued offline with observed time · Voice and Tone"),
 ("S1","FR-27 floor view · FR-19 Room Status · FR-34 OOO · FR-63 SLA urgency ordering · mobile half of the Floor split"),
 ("S2","IA (Boards) · FR-27 progress against median · State Patterns (attendant behind)"),
 ("S3","IA (Reassign) · Component Patterns (confirm sheet) · FR-23 · KF-3"),
 ("S4","IA (Inspection) · FR-24 scored checklist · Accessibility Floor (equal-weight pass/fail targets)"),
 ("S5","FR-24 rejection loop · State Patterns (rejected room returns ahead of unstarted) · Voice and Tone"),
 ("S6","IA (Approvals) · FR-43 recovery thresholds · FR-11/FR-14 escalation · State Patterns (breach)"),
 ("S7","FR-9 reassignment preserves SLA clock and history · FR-14 escalation chain"),
 ("S8","FR-5 logged overrides · FR-34 OOO to Jazz Core · FR-52 write-back · FR-6 audit trail"),
 ("S9","FR-69 department dashboard · FR-71 against baseline · FR-74 data-completeness indicator"),
 ("S10","IA (Open jobs) · FR-18 open views filtered by department and SLA state · FR-38 engineering queue"),
 ("S11","FR-9 routing and supervisor override · FR-12 SLA clock survives reassignment · FR-11 queue escalation on non-acceptance"),
 ("S-AR","i18n and Bidirectionality on the supervisor surface · Offline and Sync"),
]

def slot(sid, title, caption, inner, dark=False, rtl=False):
    return (f'<div class="slot" id="{sid}"><div class="cap"><b>{sid} · {title}</b><span>{caption}</span></div>'
            + phone(inner, dark, rtl) + '</div>')

def section(label, blurb, screens):
    out = f'<h2 class="grp">{label}</h2><p class="grpsub">{blurb}</p><div class="grid">'
    for s in screens:
        sid, title, cap, inner = s[0], s[1], s[2], s[3]
        dark = s[4] if len(s) > 4 else False
        rtl = s[5] if len(s) > 5 else False
        out += slot(sid, title, cap, inner, dark, rtl)
    return out + '</div>'

rows = "".join(f'<tr><td>{i}</td><td>{v}</td></tr>' for i, v in EVIDENCE)

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JazzTicketing Mobile — Housekeeper &amp; Supervisor</title>
<style>{CSS}
body{{background:#173238}}
.masthead{{color:#fff;margin-bottom:36px;max-width:840px}}
.masthead h1{{font-size:31px;line-height:1.15;margin:0 0 10px;font-weight:700;letter-spacing:-.02em}}
.masthead p{{margin:0 0 8px;color:#A9C2C6;font-size:15.5px}}
.masthead code{{background:rgba(255,255,255,.12);padding:1px 6px;border-radius:5px;font-size:13.5px}}
.grp{{color:#fff;font-size:22px;font-weight:700;margin:46px 0 4px;letter-spacing:-.01em}}
.grpsub{{color:#A9C2C6;font-size:14.5px;margin:0 0 26px;max-width:70ch}}
.legend{{margin-top:52px;color:#fff;max-width:1000px}}
.legend h3{{font-size:18px;margin:0 0 10px;font-weight:650}}
.legend table{{border-collapse:collapse;width:100%;font-size:13.5px;background:rgba(255,255,255,.06);border-radius:10px;overflow:hidden}}
.legend td,.legend th{{padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.12);text-align:start;color:#E7EBF1;vertical-align:top}}
.legend th{{font-weight:650;color:#fff;background:rgba(255,255,255,.07)}}
.legend td:first-child{{font-weight:700;white-space:nowrap}}
</style></head>
<body><div class="page">
<div class="masthead">
<h1>JazzTicketing Mobile — housekeeper and supervisor</h1>
<p>Every mobile surface for the two roles that carry the floor, rendered against <code>DESIGN.md</code> tokens and <code>EXPERIENCE.md</code> behaviour. Generated from <code>.working/gen_screens.py</code> — edit the spec and re-run rather than hand-editing this file.</p>
<p>Primary actions are petrol with white ink. Cyan appears twice in the whole product: the wordmark, and a selected chip on a petrol ground. Every SLA and room state carries a glyph and a word, so all of it survives greyscale.</p>
</div>
{section("Housekeeper", "Rosa's day, in the order she meets it. She holds both Housekeeping and Runner roles, so her Board carries a Now group for dispatched Jobs — the one designer call in this set.", H)}
{section("Supervisor", "Ana's shift is other people's blocked work: rooms that are stuck, boards that are behind, inspections, approvals and breaches. Mobile Floor is for acting while walking; the console owns planning the whole property.", S)}
<div class="legend"><h3>What each screen is evidence for</h3>
<table><tr><th>Screen</th><th>Spine sections and requirements</th></tr>{rows}</table></div>
</div></body></html>"""

import io, os
os.makedirs("../mockups", exist_ok=True)
open("../mockups/mobile-key-screens.html", "w").write(html)
print("screens:", len(H) + len(S), "| bytes:", len(html))
