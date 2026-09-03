# -*- coding: utf-8 -*-
"""Generates mockups/web-key-screens.html — the JazzTicketing web console.
Shares DESIGN.md tokens with mobile; console-only density and components live in
DESIGN.md 'Web console' and EXPERIENCE-WEB.md. Data-driven: edit the spec, re-run."""

CSS = """
:root{
  --petrol:#27565D; --petrol-deep:#14343B; --steel:#5186B9; --highlight:#08FCFF;
  --surface-base:#F1F5F6; --surface-raised:#FFFFFF; --surface-sunken:#E2EAEC;
  --ink-primary:#14343B; --ink-secondary:#4E686E; --ink-disabled:#93AAAE; --ink-on-accent:#FFFFFF;
  --accent:#27565D; --accent-ink:#27565D; --accent-soft:#E4EEEF;
  --ok:#0B7A52; --due:#A8490B; --breach:#C11B1B; --paused:#4E686E; --offline:#4A45D6;
  --hairline:#D3DFE1; --hairline-soft:#E8EEEF;
  --r-sm:6px; --r-md:10px; --r-lg:14px; --r-pill:999px;
}
.dark{
  --surface-base:#0B1F24; --surface-raised:#132E35; --surface-sunken:#071519;
  --ink-primary:#EAF3F4; --ink-secondary:#A3BDC1; --ink-disabled:#5F7B80;
  --accent:#2F6A73; --accent-ink:#7FD3DC; --accent-soft:#15353C;
  --ok:#3ED89A; --due:#FF9A4D; --breach:#FF6B6B; --paused:#9DB4B8; --offline:#9B98FF;
  --hairline:#20444C; --hairline-soft:#193A41;
}
*{box-sizing:border-box}
.win{width:1280px;background:var(--surface-base);color:var(--ink-primary);border-radius:12px;overflow:hidden;
 box-shadow:0 20px 50px rgba(0,0,0,.34);border:1px solid #2A3138;
 font:400 13.5px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.chrome{height:34px;background:#23282E;display:flex;align-items:center;gap:8px;padding:0 12px;flex:0 0 34px}
.chrome i{width:11px;height:11px;border-radius:50%;background:#4A525B;display:block}
.chrome span{margin-inline-start:14px;background:#171B20;color:#9AA6B2;font-size:11.5px;padding:4px 12px;
 border-radius:5px;font-family:ui-monospace,monospace}
.shell{display:flex;height:748px}
.nav{width:212px;flex:0 0 212px;background:var(--petrol);color:#fff;padding:14px 0;display:flex;flex-direction:column}
.dark .nav{background:#0A2429}
.brand{padding:0 16px 14px;font-size:17px;font-weight:700;letter-spacing:-.02em;white-space:nowrap}
.nav.op .brand{font-size:15.5px}
.brand i{font-style:normal;color:var(--highlight)}
.nav .grp{padding:12px 16px 5px;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5)}
.nav a{display:flex;align-items:center;gap:9px;padding:8px 16px;color:rgba(255,255,255,.86);text-decoration:none;font-size:13.5px}
.nav a.on{background:rgba(255,255,255,.13);color:#fff;font-weight:650;box-shadow:inset 3px 0 0 var(--highlight)}
.nav a b{margin-inline-start:auto;font-size:11.5px;font-weight:700;background:rgba(255,255,255,.16);border-radius:var(--r-pill);padding:1px 7px}
.nav a b.hot{background:var(--breach);color:#fff}
.nav .foot{margin-top:auto;padding:10px 16px 0;border-top:1px solid rgba(255,255,255,.14);font-size:12px;color:rgba(255,255,255,.66)}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.top{height:52px;flex:0 0 52px;background:var(--surface-raised);border-bottom:1px solid var(--hairline);
 display:flex;align-items:center;gap:12px;padding:0 18px}
.top h1{font-size:17px;font-weight:650;margin:0;letter-spacing:-.01em}
.top .prop{font-size:12.5px;color:var(--ink-secondary);border:1px solid var(--hairline);border-radius:var(--r-sm);padding:4px 9px}
.top .sp{flex:1}
.search{border:1px solid var(--hairline);border-radius:var(--r-sm);padding:6px 10px;color:var(--ink-disabled);
 font-size:12.5px;width:250px;background:var(--surface-base)}
.who{width:28px;height:28px;border-radius:50%;background:var(--surface-sunken);display:grid;place-items:center;
 font-size:11.5px;font-weight:700;color:var(--ink-secondary)}
.strip{background:var(--surface-sunken);border-bottom:1px solid var(--hairline);padding:9px 18px;font-size:13px;
 color:var(--ink-primary);display:flex;gap:8px;align-items:center;flex:0 0 auto}
.content{flex:1;overflow:hidden;padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}
.row{display:flex;gap:12px;align-items:stretch;min-width:0}
.panel{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md);overflow:hidden;
 min-width:0;display:flex;flex-direction:column}
.content>.row:last-child,.content>.panel:last-child{flex:1;min-height:0}
.panel>table,.panel>.pad{min-height:0}
.panel>h3{margin:0;padding:11px 14px;font-size:13px;font-weight:700;border-bottom:1px solid var(--hairline-soft);
 display:flex;align-items:center;gap:8px}
.panel>h3 em{font-style:normal;margin-inline-start:auto;font-size:11.5px;font-weight:600;color:var(--ink-secondary)}
.pad{padding:14px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:start;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-secondary);
 padding:8px 12px;border-bottom:1px solid var(--hairline);background:var(--surface-base);white-space:nowrap}
td{padding:9px 12px;border-bottom:1px solid var(--hairline-soft);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr.sel td{background:var(--accent-soft)}
tr.hot td:first-child{box-shadow:inset 3px 0 0 var(--breach)}
td.n,th.n{font-variant-numeric:tabular-nums}
td b{font-weight:650}
.pill{display:inline-flex;align-items:center;gap:5px;border-radius:var(--r-pill);padding:2px 9px;font-size:12px;
 font-weight:700;border:1.5px solid;font-variant-numeric:tabular-nums;white-space:nowrap}
.pill .gl{font-size:10.5px}
.p-ok{color:var(--ok);border-color:var(--ok);background:color-mix(in srgb,var(--ok) 11%,transparent)}
.p-due{color:var(--due);border-color:var(--due);background:color-mix(in srgb,var(--due) 11%,transparent)}
.p-breach{color:var(--breach);border-color:var(--breach);background:color-mix(in srgb,var(--breach) 11%,transparent)}
.p-paused{color:var(--paused);border-color:var(--paused);background:color-mix(in srgb,var(--paused) 11%,transparent)}
.p-off{color:var(--offline);border-color:var(--offline);background:color-mix(in srgb,var(--offline) 11%,transparent)}
.p-flat{color:var(--ink-secondary);border-color:var(--hairline);background:transparent;font-weight:600}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:34px;padding:0 15px;border-radius:var(--r-sm);
 background:var(--accent);color:var(--ink-on-accent);font-size:13.5px;font-weight:650;border:none;white-space:nowrap}
.btn.sec{background:transparent;color:var(--accent-ink);border:1.5px solid var(--accent-ink)}
.btn.warn{background:transparent;color:var(--breach);border:1.5px solid var(--breach)}
.btn.sm{height:28px;padding:0 11px;font-size:12.5px}
.chips{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.chip{border:1px solid var(--hairline);border-radius:var(--r-pill);padding:4px 11px;font-size:12.5px;color:var(--ink-secondary);
 background:var(--surface-raised);font-weight:600;white-space:nowrap}
.chip.on{border-color:var(--accent);background:var(--accent);color:var(--ink-on-accent)}
.tick{width:17px;height:17px;border-radius:4px;border:1.5px solid var(--hairline);display:inline-grid;place-items:center;
 font-size:11px;color:transparent;vertical-align:middle}
.tick.on{border-color:var(--accent);background:var(--accent);color:#fff}
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.kpi{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md);padding:11px 13px}
.kpi span{display:block;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink-secondary)}
.kpi b{display:block;font-size:27px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.15;margin-top:3px}
.kpi em{font-style:normal;display:block;font-size:11.5px;color:var(--ink-secondary);margin-top:1px}
.kpi.alert b{color:var(--breach)}
.grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px}
.rm{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-sm);padding:6px 3px;text-align:center}
.rm b{display:block;font-size:12.5px;font-weight:650;font-variant-numeric:tabular-nums}
.rm i{display:block;font-style:normal;font-size:10px;font-weight:700;margin-top:1px}
.rm.ok i{color:var(--ok)} .rm.due i{color:var(--due)} .rm.br i{color:var(--breach)}
.rm.pa i{color:var(--paused)} .rm.fl i{color:var(--ink-secondary)}
.rm.br{border-color:var(--breach);border-width:1.5px}
.drawer{position:absolute;inset-block:34px 0;inset-inline-end:0;width:520px;background:var(--surface-raised);
 border-inline-start:1px solid var(--hairline);box-shadow:-14px 0 40px rgba(0,0,0,.16);display:flex;flex-direction:column}
.drawer .dh{padding:14px 18px;border-bottom:1px solid var(--hairline);display:flex;align-items:flex-start;gap:10px}
.drawer .dh h2{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em}
.drawer .dh p{margin:2px 0 0;font-size:12.5px;color:var(--ink-secondary)}
.drawer .db{flex:1;overflow:hidden;padding:14px 18px;display:flex;flex-direction:column;gap:13px}
.drawer .df{padding:12px 18px;border-top:1px solid var(--hairline);display:flex;gap:9px}
.scrim{position:absolute;inset-block:34px 0;inset-inline:0;background:rgba(10,20,22,.34)}
.kv{display:flex;justify-content:space-between;gap:14px;font-size:13px;padding:6px 0;border-bottom:1px solid var(--hairline-soft)}
.kv:last-child{border:none}
.kv b{font-weight:650;text-align:end}
.kv .mut{color:var(--ink-secondary);font-weight:600}
.tl{position:relative;padding-inline-start:18px}
.tl:before{content:"";position:absolute;inset-block:4px;inset-inline-start:4px;width:2px;background:var(--hairline)}
.tl div{position:relative;padding:0 0 11px}
.tl div:before{content:"";position:absolute;inset-inline-start:-18px;top:5px;width:10px;height:10px;border-radius:50%;
 background:var(--surface-raised);border:2px solid var(--ink-disabled)}
.tl div.now:before{border-color:var(--breach);background:var(--breach)}
.tl div.done:before{border-color:var(--ok);background:var(--ok)}
.tl b{display:block;font-size:13px;font-weight:650}
.tl span{display:block;font-size:12px;color:var(--ink-secondary);font-variant-numeric:tabular-nums}
.note{font-size:12.5px;color:var(--ink-secondary);background:var(--surface-sunken);border-radius:var(--r-sm);padding:9px 11px;line-height:1.45}
.seg{display:inline-flex;border:1px solid var(--hairline);border-radius:var(--r-sm);overflow:hidden;background:var(--surface-raised)}
.seg div{padding:6px 13px;font-size:12.5px;font-weight:600;color:var(--ink-secondary);border-inline-end:1px solid var(--hairline)}
.seg div:last-child{border:none}
.seg div.on{background:var(--accent);color:var(--ink-on-accent)}
.bars{display:flex;flex-direction:column;gap:9px}
.brow{display:grid;grid-template-columns:118px 1fr 42px;align-items:center;gap:10px;font-size:12.5px}
.brow .tr{height:16px;background:var(--surface-sunken);border-radius:3px;overflow:hidden}
.brow .tr i{display:block;height:100%;background:var(--petrol);border-radius:0 4px 4px 0}
.dark .brow .tr i{background:#4E9AA6}
.brow .vn{text-align:end;font-variant-numeric:tabular-nums;font-weight:650}
.lgd{display:flex;gap:14px;font-size:12px;color:var(--ink-secondary);align-items:center}
.lgd i{display:inline-block;width:14px;height:3px;border-radius:2px;background:var(--petrol);margin-inline-end:5px}
.lgd i.dash{background:none;border-top:2px dashed var(--ink-disabled);height:0}
.form{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.f{display:flex;flex-direction:column;gap:4px}
.f label{font-size:11.5px;font-weight:700;color:var(--ink-secondary);letter-spacing:.03em;text-transform:uppercase}
.f div.in{border:1px solid var(--hairline);border-radius:var(--r-sm);padding:8px 10px;font-size:13px;background:var(--surface-raised)}
.f div.in.mut{color:var(--ink-disabled)}
.hint{font-size:11.5px;color:var(--ink-secondary)}
.health{display:flex;align-items:center;gap:9px;padding:10px 12px;border:1px solid var(--hairline);border-radius:var(--r-md);
 background:var(--surface-raised);font-size:13px}
.dot{width:9px;height:9px;border-radius:50%;flex:0 0 9px}
.dot.ok{background:var(--ok)} .dot.br{background:var(--breach)} .dot.due{background:var(--due)}
.plan{display:flex;flex-direction:column}
.side{display:grid;grid-template-columns:repeat(11,1fr);gap:5px}
.rmp{background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-sm);padding:5px 2px;text-align:center}
.rmp b{display:block;font-size:11.5px;font-weight:650;font-variant-numeric:tabular-nums}
.rmp i{display:block;font-style:normal;font-size:9.5px;font-weight:700;margin-top:1px}
.rmp.ok i{color:var(--ok)} .rmp.due i{color:var(--due)} .rmp.br i{color:var(--breach)}
.rmp.pa i{color:var(--paused)} .rmp.fl i{color:var(--ink-secondary)}
.rmp.br{border-color:var(--breach);border-width:1.5px}
.rmp.svc{background:var(--surface-sunken);border-style:dashed;color:var(--ink-secondary)}
.corr{margin:7px 0;height:30px;border-block:1px dashed var(--hairline);background:var(--surface-sunken);
 display:flex;align-items:center;justify-content:space-between;padding:0 11px;font-size:11px;font-weight:600;
 letter-spacing:.06em;text-transform:uppercase;color:var(--ink-disabled)}
.zone{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:11.5px;font-weight:700;
 letter-spacing:.06em;text-transform:uppercase;color:var(--ink-secondary)}
.zone em{font-style:normal;font-weight:600;letter-spacing:0;text-transform:none;color:var(--ink-disabled)}
.modal{position:absolute;inset-block:34px 0;inset-inline:0;display:grid;place-items:center}
.modal>.sheet{position:relative;width:720px;max-height:93%;background:var(--surface-raised);border-radius:var(--r-lg);
 box-shadow:0 26px 60px rgba(0,0,0,.34);display:flex;flex-direction:column;overflow:hidden}
.modal .mh{padding:15px 20px;border-bottom:1px solid var(--hairline);display:flex;align-items:center;gap:10px}
.modal .mh h2{margin:0;font-size:18px;font-weight:700}
.modal .mh span.x{margin-inline-start:auto;color:var(--ink-disabled);font-size:17px}
.modal .mb{padding:18px 20px;display:flex;flex-direction:column;gap:15px;overflow:hidden}
.modal .mf{padding:13px 20px;border-top:1px solid var(--hairline);display:flex;gap:9px;justify-content:flex-end}
.mx td,.mx th{text-align:center}
.mx td:first-child,.mx th:first-child{text-align:start}
.mx .y{color:var(--ok);font-weight:700} .mx .n{color:var(--ink-disabled)}
.av{width:26px;height:26px;border-radius:50%;background:var(--surface-sunken);display:inline-grid;place-items:center;
 font-size:10.5px;font-weight:700;color:var(--ink-secondary);margin-inline-end:8px;vertical-align:middle}
.tag{display:inline-block;border:1px solid var(--hairline);border-radius:var(--r-sm);padding:1px 7px;font-size:11.5px;
 font-weight:600;color:var(--ink-secondary);margin-inline-end:4px}
.login{flex:1;display:flex}
.login .art{flex:1;background:linear-gradient(155deg,var(--petrol) 0%,var(--steel) 130%);color:#fff;padding:52px 46px;
 display:flex;flex-direction:column;justify-content:space-between}
.login .art h2{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:0 0 10px;line-height:1.2}
.login .art h2 i{font-style:normal;color:var(--highlight)}
.login .art p{font-size:14.5px;color:rgba(255,255,255,.84);margin:0;max-width:38ch;line-height:1.6}
.login .art .st{font-size:12.5px;color:rgba(255,255,255,.7)}
.login .form2{width:420px;flex:0 0 420px;background:var(--surface-raised);padding:52px 44px;display:flex;
 flex-direction:column;gap:15px;justify-content:center}
.login .form2 h3{margin:0;font-size:20px;font-weight:700}
.perm{border:1px solid var(--hairline);border-radius:var(--r-md);overflow:hidden;background:var(--surface-raised)}
.perm .ph{background:var(--surface-base);padding:7px 12px;font-size:11px;font-weight:700;letter-spacing:.06em;
 text-transform:uppercase;color:var(--ink-secondary);border-bottom:1px solid var(--hairline)}
.perm .pr{display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--hairline-soft);font-size:13px}
.perm .pr:last-child{border:none}
.perm .pr .lbl{flex:1}
.perm .pr .lbl em{font-style:normal;display:block;font-size:11.5px;color:var(--ink-disabled)}
.sw2{width:38px;height:21px;border-radius:var(--r-pill);background:var(--surface-sunken);border:1px solid var(--hairline);
 position:relative;flex:0 0 38px}
.sw2 i{position:absolute;top:2px;inset-inline-start:2px;width:15px;height:15px;border-radius:50%;background:var(--ink-disabled);display:block}
.sw2.on{background:var(--accent);border-color:var(--accent)}
.sw2.on i{inset-inline-start:auto;inset-inline-end:2px;background:#fff}
.sw2.lk{opacity:.45}
.map{display:grid;grid-template-columns:1fr 26px 1fr;gap:9px;align-items:center}
.map .src2{border:1px solid var(--hairline);border-radius:var(--r-sm);padding:7px 10px;font-size:12.5px;background:var(--surface-base);
 font-family:ui-monospace,monospace}
.map .arw{text-align:center;color:var(--ink-disabled)}
.map .dst{border:1px solid var(--hairline);border-radius:var(--r-sm);padding:7px 10px;font-size:13px;background:var(--surface-raised);font-weight:600}
.map .dst.skip{color:var(--ink-disabled);font-weight:400}
.steps{display:flex;flex-direction:column;gap:0}
.steps>div{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--hairline-soft)}
.steps>div:last-child{border:none}
.steps .ic2{width:22px;height:22px;border-radius:50%;flex:0 0 22px;display:grid;place-items:center;font-size:11px;font-weight:700;
 background:var(--surface-sunken);color:var(--ink-secondary);border:1.5px solid var(--hairline)}
.steps .ic2.done{background:var(--ok);border-color:var(--ok);color:#fff}
.steps .ic2.now{background:var(--accent);border-color:var(--accent);color:#fff}
.steps .ic2.blk{background:color-mix(in srgb,var(--breach) 14%,transparent);border-color:var(--breach);color:var(--breach)}
.steps b{display:block;font-size:13.5px;font-weight:650}
.steps span{display:block;font-size:12.5px;color:var(--ink-secondary);margin-top:1px}
.steps .act{margin-inline-start:auto;flex:0 0 auto}
.bar2{height:7px;border-radius:var(--r-pill);background:var(--surface-sunken);overflow:hidden}
.bar2 i{display:block;height:100%;background:var(--accent)}
.nav.op{background:#1F252C}
.nav.op a.on{box-shadow:inset 3px 0 0 #F0B24A}
.opbadge{background:#F0B24A;color:#1F252C;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
 border-radius:4px;padding:2px 7px;margin-inline-start:8px}
.warnstrip{background:color-mix(in srgb,#F0B24A 18%,var(--surface-raised));border:1px solid #F0B24A;border-radius:var(--r-md);
 padding:10px 13px;font-size:13px;display:flex;gap:9px;align-items:flex-start}
.rtl{direction:rtl}
.num{unicode-bidi:isolate}
"""

def pill(k,g,t): return f'<span class="pill p-{k}"><span class="gl">{g}</span>{t}</span>'
def num(n): return f'<span class="num">{n}</span>'
def nav(active, badges=None):
    badges = badges or {}
    items=[("OPERATIONS",None),("Dispatch","◷"),("Housekeeping","▤"),("Engineering","⚙"),("Incidents","⚑"),
           ("INSIGHT",None),("Dashboard","▦"),("Reports","▤"),
           ("SETUP",None),("Configuration","⚙"),("Jazz Core","⇄"),
           ("ADMINISTRATION",None),("Users","◉"),("Roles","◈"),("Properties","▣"),("Audit log","≡")]
    out=f'<div class="nav"><div class="brand">Jazz<i>Ticketing</i></div>'
    for lab,ic in items:
        if ic is None:
            out+=f'<div class="grp">{lab}</div>'; continue
        b=badges.get(lab,"")
        bd=f'<b class="{"hot" if b.startswith("!") else ""}">{b.lstrip("!")}</b>' if b else ""
        on=" on" if lab==active else ""
        out+=f'<a class="{on.strip()}" href="#"><span>{ic}</span>{lab}{bd}</a>'
    out+='<div class="foot">Grand Meridian · 240 rooms<br>Shift 07:00–15:00</div></div>'
    return out
def top(title, right="", prop="Grand Meridian ▾", search="Search rooms, jobs, guests   ⌘K"):
    return (f'<div class="top"><h1>{title}</h1><span class="prop">{prop}</span><span class="sp"></span>'
            f'<div class="search">{search}</div>{right}<div class="who">AR</div></div>')
def win(inner, dark=False, rtl=False, url="app.jazzticketing.com/dispatch"):
    c="win"+(" dark" if dark else "")+(" rtl" if rtl else "")
    return (f'<div class="{c}"><div class="chrome"><i></i><i></i><i></i><span>{url}</span></div>'
            f'<div class="shell" style="position:relative">{inner}</div></div>')
def panel(title, body_html, em="", style=""):
    h=f'<h3>{title}{f"<em>{em}</em>" if em else ""}</h3>' if title else ""
    return f'<div class="panel" style="{style}">{h}{body_html}</div>'
def table(cols, rows):
    th="".join(f'<th class="{c[1]}">{c[0]}</th>' for c in cols)
    tb=""
    for r in rows:
        cls=r[0]; cells="".join(f'<td class="{c[1]}">{c[0]}</td>' for c in r[1])
        tb+=f'<tr class="{cls}">{cells}</tr>'
    return f'<table><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table>'
def strip(text, glyph="⇅"):
    return f'<div class="strip">{glyph} {text}</div>'
def kpi(label,val,sub="",alert=False):
    return f'<div class="kpi{" alert" if alert else ""}"><span>{label}</span><b>{val}</b><em>{sub}</em></div>'

# ---------- charts (dataviz: single series + labelled baseline reference; magnitude bars in one hue) ----------
def area_chart(vals, baseline, w=560, h=170, pad=(30,12,26,36)):
    """One series (petrol) + a dashed baseline reference that is directly labelled.
    Not a two-series categorical chart — the baseline is context, not a competing series."""
    t,r,b,l = pad
    iw, ih = w-l-r, h-t-b
    lo, hi = 60, 100
    def X(i): return l + iw*i/(len(vals)-1)
    def Y(v): return t + ih*(1-(v-lo)/(hi-lo))
    pts=" ".join(f"{X(i):.1f},{Y(v):.1f}" for i,v in enumerate(vals))
    area=f"M{X(0):.1f},{Y(vals[0]):.1f} "+" ".join(f"L{X(i):.1f},{Y(v):.1f}" for i,v in enumerate(vals))+f" L{X(len(vals)-1):.1f},{t+ih} L{l},{t+ih} Z"
    g="".join(f'<line x1="{l}" y1="{Y(v):.1f}" x2="{l+iw}" y2="{Y(v):.1f}" stroke="var(--hairline-soft)" stroke-width="1"/>'
              f'<text x="{l-8}" y="{Y(v)+4:.1f}" text-anchor="end" font-size="10.5" fill="var(--ink-disabled)">{v}%</text>' for v in (70,85,100))
    last=len(vals)-1
    return f'''<svg viewBox="0 0 {w} {h}" width="100%" height="{h}" role="img"
 aria-label="SLA compliance by day, last 14 days, rising from 79 to 94 percent against a 78 percent baseline">
{g}
<path d="{area}" fill="var(--petrol)" opacity=".10"/>
<polyline points="{pts}" fill="none" stroke="var(--petrol)" stroke-width="2" stroke-linejoin="round"/>
<line x1="{l}" y1="{Y(baseline):.1f}" x2="{l+iw}" y2="{Y(baseline):.1f}" stroke="var(--ink-disabled)" stroke-width="2" stroke-dasharray="5 4"/>
<text x="{l+iw-2}" y="{Y(baseline)-7:.1f}" text-anchor="end" font-size="10.5" font-weight="700" fill="var(--ink-secondary)">Baseline {baseline}%</text>
<circle cx="{X(last):.1f}" cy="{Y(vals[last]):.1f}" r="4.5" fill="var(--petrol)" stroke="var(--surface-raised)" stroke-width="2"/>
<text x="{X(last)-6:.1f}" y="{Y(vals[last])-10:.1f}" text-anchor="end" font-size="11.5" font-weight="700" fill="var(--ink-primary)">{vals[last]}%</text>
<g transform="translate({X(9)-52:.1f},{Y(vals[9])-46:.1f})">
 <rect width="104" height="38" rx="6" fill="var(--ink-primary)" opacity=".92"/>
 <text x="9" y="15" font-size="10.5" fill="#C9D5D7">28 Aug</text>
 <text x="9" y="29" font-size="12" font-weight="700" fill="#fff">{vals[9]}% within SLA</text>
</g>
<circle cx="{X(9):.1f}" cy="{Y(vals[9]):.1f}" r="4" fill="var(--surface-raised)" stroke="var(--petrol)" stroke-width="2"/>
<text x="{l}" y="{h-6}" font-size="10.5" fill="var(--ink-disabled)">19 Aug</text>
<text x="{l+iw}" y="{h-6}" text-anchor="end" font-size="10.5" fill="var(--ink-disabled)">01 Sep</text>
</svg>'''

def bars(rows, maxv=None):
    mx = maxv or max(v for _,v in rows)
    out='<div class="bars">'
    for lab,v in rows:
        out+=(f'<div class="brow"><span>{lab}</span><div class="tr"><i style="width:{v/mx*100:.0f}%"></i></div>'
              f'<span class="vn">{v}</span></div>')
    return out+'</div>'

W=[]
# ---- W1 operator console ----
W.append(("W1","Dispatch — a guest call becomes a Request",
 "The wedge screen, and the only one with a stopwatch on it. Jazz Core reports the call, so the room and stay are resolved before the operator speaks. Catalog search is keyboard-first: type, Enter, done — fifteen seconds without leaving the call.",
 nav("Dispatch",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Dispatch")+
 '<div class="content"><div class="row" style="flex:1">'+
 panel("Live call <span class=\"pill p-due\"><span class=\"gl\">●</span>00:41</span>",
   '<div class="pad" style="display:flex;flex-direction:column;gap:12px">'
   '<div class="kv"><span class="mut">Room</span><b style="font-size:19px">'+num("0812")+'</b></div>'
   '<div class="kv"><span class="mut">Guest</span><b>Mr. H. Okonkwo · VIP</b></div>'
   '<div class="kv"><span class="mut">Stay</span><b>28 Aug – 03 Sep · King</b></div>'
   '<div class="kv"><span class="mut">Language</span><b>English</b></div>'
   '<div class="note">Resolved from Jazz Core call event at 11:52:03. Two prior Requests this stay.</div>'
   '<div><label class="hint">Request type</label>'
   '<div class="f" style="margin-top:4px"><div class="in"><b>iron</b> — matched “Iron and board”</div></div></div>'
   '<div class="chips"><span class="chip on">Iron and board · Housekeeping · 15 min</span></div>'
   '<div class="form"><div class="f"><label>Department</label><div class="in">Housekeeping</div></div>'
   '<div class="f"><label>SLA target</label><div class="in">15 min · median 9 min</div></div></div>'
   '<div class="f"><label>Note (optional)</label><div class="in mut">Guest asked for it before 12:30</div></div>'
   '<div style="display:flex;gap:9px"><span class="btn">Log and dispatch</span><span class="btn sec">Add another</span></div>'
   '<div class="hint">↵ logs and dispatches · ⌥N adds another for the same room</div>'
   '</div>', style="flex:0 0 430px")+
 panel("Open now", table(
   [("Room","n"),("Request","" ),("Dept",""),("Assigned",""),("SLA","n")],
   [("hot",[(num("1518"),"n"),("Hot / cold <b>Priority</b>",""),("Engineering",""),("<span class='p-flat pill'>Unassigned</span>",""),(pill("breach","▲","Overdue 8m"),"n")]),
    ("",[(num("0914"),"n"),("Extra towels",""),("Housekeeping",""),("<span class='p-flat pill'>Unassigned</span>",""),(pill("due","●","9m left"),"n")]),
    ("",[(num("0812"),"n"),("Lamp not working",""),("Engineering",""),("M. Ortiz",""),(pill("due","●","22m left"),"n")]),
    ("",[(num("0940"),"n"),("Shower draining",""),("Engineering",""),("K. Bello",""),(pill("paused","‖","Paused 28m"),"n")]),
    ("",[(num("1204"),"n"),("Re-clean after inspection",""),("Housekeeping",""),("R. Santos",""),(pill("due","●","19m"),"n")]),
    ("",[(num("0705"),"n"),("Iron and board",""),("Housekeeping",""),("F. Noor",""),(pill("ok","✓","Closed 11:12"),"n")]),
   ]), em="18 open · 3 breached", style="flex:1")+
 '</div></div></div>'))

# ---- W2 jobs board ----
W.append(("W2","All jobs — filter, then act on several at once",
 "The dispatcher's list. Filters in one row, unassigned called out because it is the only state nobody owns, and multi-select so a supervisor clears four jobs in one decision instead of four.",
 nav("Dispatch",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("All jobs", '<span class="btn sec sm">Export</span>')+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">All departments</span><span class="chip">Housekeeping 7</span>'
 '<span class="chip">Engineering 8</span><span class="chip">F&amp;B 3</span><span class="chip">Unassigned 4</span>'
 '<span class="chip">Breached 3</span><span class="chip">Paused 2</span></div>'
 '<div class="seg"><div class="on">Open</div><div>Today</div><div>All</div></div></div>'+
 panel("", table(
   [("<span class='tick on'>✓</span>",""),("Job","n"),("Request / fault",""),("Dept",""),("Location","n"),("Assigned",""),("Raised","n"),("SLA","n")],
   [("hot sel",[("<span class='tick on'>✓</span>",""),(num("J-2841"),"n"),("Hot / cold <b>Priority</b>",""),("Engineering",""),(num("1518"),"n"),("<span class='p-flat pill'>Unassigned</span>",""),("09:39","n"),(pill("breach","▲","Overdue 8m"),"n")]),
    ("sel",[("<span class='tick on'>✓</span>",""),(num("J-2856"),"n"),("Extra towels",""),("Housekeeping",""),(num("0914"),"n"),("<span class='p-flat pill'>Unassigned</span>",""),("11:38","n"),(pill("due","●","9m left"),"n")]),
    ("",[("<span class='tick'></span>",""),(num("J-2833"),"n"),("Lamp not working",""),("Engineering",""),(num("0812"),"n"),("M. Ortiz",""),("11:04","n"),(pill("due","●","22m left"),"n")]),
    ("",[("<span class='tick'></span>",""),(num("J-2829"),"n"),("Shower draining slowly",""),("Engineering",""),(num("0940"),"n"),("K. Bello",""),("10:41","n"),(pill("paused","‖","Paused 28m"),"n")]),
    ("",[("<span class='tick'></span>",""),(num("J-2844"),"n"),("Re-clean after inspection",""),("Housekeeping",""),(num("1204"),"n"),("R. Santos",""),("09:22","n"),(pill("due","●","19m"),"n")]),
    ("",[("<span class='tick'></span>",""),(num("J-2851"),"n"),("Minibar restock",""),("F&amp;B",""),(num("1109"),"n"),("<span class='p-flat pill'>Queue</span>",""),("11:20","n"),(pill("due","●","44m left"),"n")]),
    ("",[("<span class='tick'></span>",""),(num("J-2818"),"n"),("Lift 2 juddering",""),("Engineering",""),("Lift lobby",""),("M. Ortiz",""),("08:12","n"),(pill("ok","✓","Closed 10:58"),"n")]),
   ]), em="2 selected")+
 '<div class="row" style="align-items:center"><span class="btn">Assign 2 jobs</span><span class="btn sec">Change department</span>'
 '<span class="btn sec">Set priority</span><span class="sp" style="flex:1"></span>'
 '<span class="hint">Selection never hides a job\'s own state — a selected priority job keeps its red edge.</span></div>'
 '</div></div>'))

# ---- W3 job detail drawer ----
W.append(("W3","Job detail — the whole record, without leaving the list",
 "A drawer, not a page: context stays behind it. The timeline is the point — every state change with actor and clock, including the pause and who escalated. This is what a dispute at checkout gets settled from.",
 nav("Dispatch",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("All jobs")+
 '<div class="content"><div class="chips"><span class="chip on">All departments</span><span class="chip">Engineering 8</span></div>'+
 panel("", table([("Job","n"),("Request",""),("Location","n"),("SLA","n")],
   [("hot",[(num("J-2841"),"n"),("Hot / cold",""),(num("1518"),"n"),(pill("breach","▲","Overdue 8m"),"n")]),
    ("",[(num("J-2833"),"n"),("Lamp not working",""),(num("0812"),"n"),(pill("due","●","22m"),"n")]),
    ("",[(num("J-2829"),"n"),("Shower draining",""),(num("0940"),"n"),(pill("paused","‖","Paused"),"n")])]))+
 '</div></div>'
 '<div class="scrim"></div>'
 '<div class="drawer"><div class="dh"><div style="flex:1"><h2>'+num("1518")+' · Hot / cold</h2>'
 '<p>Work Order '+num("J-2841")+' · Engineering · Priority</p></div>'+pill("breach","▲","Overdue by 8 min")+'</div>'
 '<div class="db">'
 '<div><div class="kv"><span class="mut">Guest</span><b>Ms. L. Haddad · in house · VIP</b></div>'
 '<div class="kv"><span class="mut">Reported</span><b>09:39 · front desk · phone</b></div>'
 '<div class="kv"><span class="mut">Asset</span><b>Fan-coil FCU-1518 · <span style="color:var(--breach)">4 work orders in 90 days</span></b></div>'
 '<div class="kv"><span class="mut">SLA target</span><b>30 min · paused 0 min</b></div></div>'
 '<div class="note">“Room won’t cool below 26°.” Guest called twice.</div>'
 '<div><h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:var(--ink-secondary);letter-spacing:.06em">TIMELINE</h3>'
 '<div class="tl"><div class="done"><b>Logged by front desk</b><span>09:39 · A. Kadir · via Jazz Core call event</span></div>'
 '<div class="done"><b>Dispatched to Engineering queue</b><span>09:39 · rule: department + open load</span></div>'
 '<div><b>Not accepted within 10 min</b><span>09:49 · escalated to Chief Engineer</span></div>'
 '<div class="now"><b>Escalated again — breach</b><span>11:23 · Duty Manager notified</span></div></div></div>'
 '</div>'
 '<div class="df"><span class="btn">Assign to M. Ortiz</span><span class="btn sec">Reassign</span>'
 '<span class="btn sec">Add note</span><span class="btn warn">Cancel job</span></div></div>'))

# ---- W4 housekeeping floor ----
W.append(("W4","Housekeeping — the whole property against arrivals",
 "The console half of Floor. Where mobile shows one floor to act on, this shows every floor at once and the one number that decides the shift: rooms not ready against arrivals due. Bulk actions live here because planning does.",
 nav("Housekeeping",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Housekeeping", '<span class="btn sec sm">Print boards</span>')+
 '<div class="content">'
 '<div class="kpis" style="grid-template-columns:repeat(6,1fr)">'+
 kpi("Occupancy","67%","161 of 240")+kpi("Dirty","31","departures 18")+kpi("Not ready","4","for arrivals today",True)+
 kpi("Arrivals by 15:00","14","2 VIP")+kpi("Median clean","26 min","baseline 31")+kpi("Out of order","1","1212 · fan-coil",True)+
 '</div>'
 '<div class="row"><div class="seg"><div class="on">Floors 9–12</div><div>All floors</div><div>Public areas</div></div>'
 '<div class="chips"><span class="chip">Departures</span><span class="chip">Stayovers</span><span class="chip on">Not ready 4</span></div></div>'+
 panel("Floor 12", '<div class="pad"><div class="grid">'+
   "".join(f'<div class="rm {c}"><b class="num">{n}</b><i>{g} {s}</i></div>' for n,s,g,c in [
     (1201,"Ready","✓","ok"),(1202,"Clean","✓","ok"),(1203,"Dirty","●","due"),(1204,"Redo","▲","br"),(1205,"In prog","▶","fl"),
     (1206,"Dirty","●","due"),(1207,"Ready","✓","ok"),(1208,"In prog","▶","fl"),(1209,"Insp","◷","fl"),(1210,"Dirty","●","due"),
     (1211,"DND","‖","pa"),(1212,"OOO","▲","br"),(1214,"Ready","✓","ok"),(1215,"Refused","‖","pa"),(1216,"Dirty","●","due"),
     (1217,"Clean","✓","ok"),(1218,"Ready","✓","ok"),(1219,"Dirty","●","due"),(1220,"Stay","●","due"),(1221,"Ready","✓","ok")])+
   '</div></div>', em="20 rooms · 8 dirty · 2 stuck")+
 panel("Not ready for arrival", table(
   [("Room","n"),("Arrival","n"),("Status",""),("Attendant",""),("Blocked by","")],
   [("hot",[(num("1204"),"n"),("14:00","n"),(pill("breach","▲","Redo · not restarted"),""),("R. Santos",""),("Inspection rejected 09:22","")]),
    ("hot",[(num("1212"),"n"),("15:30","n"),(pill("breach","▲","Out of order"),""),("—",""),("Fan-coil · engineering","")]),
    ("",[(num("1206"),"n"),("14:00","n"),(pill("due","●","Dirty"),""),("M. Cruz",""),("Queued 4th on board","")]),
    ("",[(num("1211"),"n"),("16:00","n"),(pill("paused","‖","DND since 09:31"),""),("R. Santos",""),("Re-attempt 14:00","")])]))+
 '</div></div>'))

# ---- W5 boards planning ----
W.append(("W5","Boards — build and balance the shift",
 "Credits, not room counts, because a departure suite is not a stayover twin. The imbalance is stated in the header rather than left for the Executive Housekeeper to compute, and the table is the whole editor — no drag-and-drop a night manager cannot do on a laptop trackpad.",
 nav("Housekeeping",{"Dispatch":"18"})+
 '<div class="main">'+top("Boards · 02 Sep", '<span class="btn sm">Publish boards</span>')+
 '<div class="content">'
 '<div class="note">Generated from 240 rooms · 18 departures prioritised by arrival time. '
 '<b>Fatima is 6 credits under and Rosa is 4 over</b> — move rooms or accept the imbalance.</div>'+
 panel("Attendants on shift", table(
   [("Attendant",""),("Floors",""),("Rooms","n"),("Credits","n"),("Load",""),("Progress",""),("",""),],
   [("",[("<b>Rosa Santos</b>",""),("9–11",""),("16","n"),("22","n"),(pill("due","●","4 over"),""),
        ('<div class="tr" style="height:14px;background:var(--surface-sunken);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:44%;background:var(--due)"></i></div>',""),
        ('<span class="btn sec sm">Move rooms</span>',"")]),
    ("",[("<b>Ana Rivera</b>",""),("12–13",""),("15","n"),("18","n"),(pill("ok","✓","Balanced"),""),
        ('<div class="tr" style="height:14px;background:var(--surface-sunken);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:73%;background:var(--petrol)"></i></div>',""),
        ('<span class="btn sec sm">Move rooms</span>',"")]),
    ("",[("<b>Marisol Cruz</b>",""),("14–15",""),("17","n"),("20","n"),(pill("ok","✓","Balanced"),""),
        ('<div class="tr" style="height:14px;background:var(--surface-sunken);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:53%;background:var(--petrol)"></i></div>',""),
        ('<span class="btn sec sm">Move rooms</span>',"")]),
    ("sel",[("<b>Fatima Noor</b>",""),("16",""),("16","n"),("16","n"),(pill("due","●","6 under"),""),
        ('<div class="tr" style="height:14px;background:var(--surface-sunken);border-radius:3px;overflow:hidden"><i style="display:block;height:100%;width:88%;background:var(--petrol)"></i></div>',""),
        ('<span class="btn sm">Add rooms</span>',"")]),
    ("",[("<b>Unassigned</b>",""),("—",""),("6","n"),("8","n"),(pill("breach","▲","Nobody"),""),("",""),
        ('<span class="btn sm">Assign</span>',"")])]), em="4 attendants · 6 rooms unassigned")+
 '<div class="row">'+
 panel("Credit rules", '<div class="pad"><div class="kv"><span>Departure · standard</span><b>1.5</b></div>'
   '<div class="kv"><span>Departure · suite</span><b>2.5</b></div><div class="kv"><span>Stayover</span><b>1.0</b></div>'
   '<div class="kv"><span>Turndown</span><b>0.5</b></div><div class="kv"><span>Refused / DND</span><b>0.25</b></div>'
   '<div class="hint" style="margin-top:8px">Property-configurable · changes apply to boards generated after the change.</div></div>', style="flex:1")+
 panel("Turndown pass", '<div class="pad"><div class="kv"><span>Rooms</span><b>62 occupied</b></div>'
   '<div class="kv"><span>Window</span><b>17:00 – 21:00</b></div><div class="kv"><span>Assigned</span><b>2 attendants</b></div>'
   '<div class="hint" style="margin-top:8px">A separate Room Assignment — it does not overwrite today’s clean record.</div>'
   '<div style="margin-top:10px"><span class="btn sec sm">Generate turndown</span></div></div>', style="flex:1")+
 '</div></div></div>'))

# ---- W6 engineering + PM ----
W.append(("W6","Engineering — reactive work and preventive schedule in one place",
 "Preventive work is the first casualty of a busy day, so it is not on another page: overdue PM sits beside the reactive queue where a chief engineer cannot pretend not to see it.",
 nav("Engineering",{"Dispatch":"18","Engineering":"!2"})+
 '<div class="main">'+top("Engineering", '<span class="btn sm">New work order</span>')+
 '<div class="content">'
 '<div class="kpis" style="grid-template-columns:repeat(5,1fr)">'+
 kpi("Open reactive","8","2 priority")+kpi("Breached","2","both guest-facing",True)+kpi("PM due this week","11","3 overdue",True)+
 kpi("Rooms OOO","1","4 room-nights lost")+kpi("Recurring flags","3","assets over threshold",True)+'</div>'
 '<div class="row">'+
 panel("Reactive queue", table([("Loc","n"),("Fault",""),("Assigned",""),("SLA","n")],
   [("hot",[(num("1518"),"n"),("Hot / cold <b>Priority</b>",""),("<span class='p-flat pill'>Unassigned</span>",""),(pill("breach","▲","Overdue 8m"),"n")]),
    ("hot",[("Lift lobby",""),("Lift 2 juddering",""),("M. Ortiz",""),(pill("breach","▲","Overdue 41m"),"n")]),
    ("",[(num("0812"),"n"),("Lamp not working",""),("M. Ortiz",""),(pill("due","●","22m"),"n")]),
    ("",[(num("0940"),"n"),("Shower draining",""),("K. Bello",""),(pill("paused","‖","DND"),"n")]),
    ("",[("Pool plant",""),("Dosing pump noise",""),("K. Bello",""),(pill("due","●","2h"),"n")])]), em="8 open", style="flex:1.2")+
 panel("Preventive schedule", table([("Asset",""),("Rule",""),("Due","n"),("State","")],
   [("hot",[("AHU-Roof-2",""),("Quarterly filter",""),("26 Aug","n"),(pill("breach","▲","3 days over"),"")]),
    ("hot",[("Lift 2",""),("Monthly inspection",""),("30 Aug","n"),(pill("breach","▲","Overdue"),"")]),
    ("",[("Boiler-1",""),("Weekly blowdown",""),("02 Sep","n"),(pill("due","●","Today"),"")]),
    ("",[("FCU floor 12",""),("Runtime 2000h",""),("04 Sep","n"),(pill("flat","○","Scheduled"),"")]),
    ("",[("Pool plant",""),("Weekly service",""),("05 Sep","n"),(pill("flat","○","Scheduled"),"")])]), em="11 due this week", style="flex:1")+
 '</div></div></div>'))

# ---- W7 asset detail ----
W.append(("W7","Asset — the history that makes a pattern visible",
 "One fan-coil, five visits, four of them closed as “recharged”. The recurring-fault flag is computed, not spotted, and it clears on a review action rather than quietly — because the point of the record is that somebody decides.",
 nav("Engineering",{"Dispatch":"18"})+
 '<div class="main">'+top("Asset · FCU-1518", '<span class="btn sec sm">Move asset</span>')+
 '<div class="content">'
 '<div class="note" style="border-inline-start:3px solid var(--breach)"><b>Recurring fault flagged.</b> '
 '5 work orders in 90 days against a threshold of 3. Flagged 30 Aug — awaiting a review decision from the Chief Engineer.</div>'
 '<div class="row">'+
 panel("Asset", '<div class="pad">'
   '<div class="kv"><span class="mut">Type</span><b>Fan-coil unit</b></div>'
   '<div class="kv"><span class="mut">Location</span><b>Room '+num("1518")+' · floor 15</b></div>'
   '<div class="kv"><span class="mut">Installed</span><b>Mar 2019</b></div>'
   '<div class="kv"><span class="mut">Warranty</span><b>Expired Mar 2024</b></div>'
   '<div class="kv"><span class="mut">Parts YTD</span><b>R-410A ×4 · filter ×3</b></div>'
   '<div class="kv"><span class="mut">Room-nights lost</span><b>6</b></div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn sm">Record review</span><span class="btn sec sm">Plan replacement</span></div>'
   '</div>', style="flex:0 0 340px")+
 panel("Work order history", table([("Date","n"),("Fault",""),("Root cause",""),("Engineer",""),("Outcome","")],
   [("hot",[("30 Aug","n"),("Hot / cold",""),("<b>Recurring — suspect coil</b>",""),("M. Ortiz",""),(pill("breach","▲","Guest complained"),"")]),
    ("",[("12 Aug","n"),("Hot / cold",""),("Refrigerant low",""),("M. Ortiz",""),(pill("ok","✓","Recharged"),"")]),
    ("",[("28 Jul","n"),("Hot / cold",""),("Refrigerant low",""),("M. Ortiz",""),(pill("ok","✓","Recharged"),"")]),
    ("",[("09 Jul","n"),("Hot / cold",""),("Refrigerant low",""),("K. Bello",""),(pill("ok","✓","Recharged"),"")]),
    ("",[("14 Jun","n"),("Noise",""),("Fan bearing",""),("K. Bello",""),(pill("ok","✓","Lubricated"),"")])]), em="5 in 90 days", style="flex:1")+
 '</div></div></div>'))

# ---- W8 glitch + recovery ----
W.append(("W8","Incident — log the failure, record the recovery, name the cause",
 "Compensation gets recorded with an approver and a linked cause, so a GM can later ask what service failures actually cost and get an answer. Above the duty manager's threshold it routes for approval rather than quietly posting.",
 nav("Incidents",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Incident · GL-0412")+
 '<div class="content"><div class="row">'+
 panel("Glitch", '<div class="pad">'
   '<div class="form"><div class="f"><label>Stay</label><div class="in">Ms. L. Haddad · '+num("1518")+' · 28 Aug – 03 Sep</div></div>'
   '<div class="f"><label>Logged by</label><div class="in">D. Okafor · Duty Manager · 11:48</div></div>'
   '<div class="f"><label>Category</label><div class="in">Engineering — guest impact</div></div>'
   '<div class="f"><label>Severity</label><div class="in">High · repeat failure</div></div>'
   '<div class="f"><label>Department at fault</label><div class="in">Engineering</div></div>'
   '<div class="f"><label>Root cause</label><div class="in">Recurring equipment fault</div></div></div>'
   '<div class="f" style="margin-top:12px"><label>What happened</label>'
   '<div class="in">Room not cooling for a third night. Guest called twice; work order breached SLA by 8 minutes and was escalated.</div></div>'
   '<div style="margin-top:12px"><label class="hint">Linked causes</label>'
   '<div class="chips" style="margin-top:5px"><span class="chip">Work order '+num("J-2841")+' · breached</span>'
   '<span class="chip">Asset FCU-1518 · recurring</span><span class="chip">Request '+num("R-1180")+' · 30 Aug</span></div></div>'
   '</div>', style="flex:1.1")+
 panel("Recovery", '<div class="pad">'
   '<div class="form"><div class="f"><label>Type</label><div class="in">Room-night comp</div></div>'
   '<div class="f"><label>Value</label><div class="in">USD 320.00</div></div></div>'
   '<div class="note" style="margin-top:12px;border-inline-start:3px solid var(--due)">'
   '<b>Above your threshold.</b> Duty Manager limit is USD 150. This routes to the GM for approval and is not authorised until then.</div>'
   '<div style="margin-top:12px"><h3 style="margin:0 0 8px;font-size:12px;font-weight:700;color:var(--ink-secondary);letter-spacing:.06em">APPROVAL</h3>'
   '<div class="tl"><div class="done"><b>Submitted</b><span>11:52 · D. Okafor</span></div>'
   '<div class="now"><b>Awaiting GM</b><span>Escalates to Area Manager at 13:52</span></div></div></div>'
   '<div class="note" style="margin-top:12px">JazzTicketing records the recovery. It does not post to the folio — that stays a Jazz Core / PMS function.</div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn">Submit for approval</span><span class="btn sec">Save draft</span></div>'
   '</div>', style="flex:1")+
 '</div></div></div>'))

# ---- W9 stay timeline ----
W.append(("W9","Stay — everything that happened to this guest",
 "The screen a duty manager opens when a guest is angry at checkout. Not a log dump: requests, faults, recoveries and room moves on one clock, so the conversation is about facts instead of recollection.",
 nav("Incidents",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Stay · Ms. L. Haddad")+
 '<div class="content">'
 '<div class="kpis" style="grid-template-columns:repeat(5,1fr)">'+
 kpi("Nights","6","28 Aug – 03 Sep")+kpi("Requests","7","2 repeats")+kpi("Faults","3","1 recurring",True)+
 kpi("Glitches","1","engineering",True)+kpi("Recovery","USD 320","pending approval")+'</div>'
 '<div class="row">'+
 panel("Stay timeline", '<div class="pad"><div class="tl">'
   '<div class="done"><b>Checked in · '+num("1518")+' · King</b><span>28 Aug 15:12 · via Jazz Core</span></div>'
   '<div class="done"><b>Request · extra pillows</b><span>28 Aug 22:40 · closed in 11 min · F. Noor</span></div>'
   '<div class="done"><b>Work order · hot / cold</b><span>30 Aug 21:14 · closed 22:50 · recharged · M. Ortiz</span></div>'
   '<div class="done"><b>Request · hot / cold <em style="font-style:normal;color:var(--due);font-weight:700">repeat</em></b><span>31 Aug 20:02 · closed 21:30</span></div>'
   '<div class="now"><b>Work order · hot / cold · breached</b><span>02 Sep 09:39 · escalated 11:23 · unassigned 8 min over</span></div>'
   '<div class="now"><b>Glitch logged · engineering, guest impact</b><span>02 Sep 11:48 · D. Okafor</span></div>'
   '<div><b>Recovery · room-night comp USD 320</b><span>02 Sep 11:52 · awaiting GM approval</span></div>'
   '<div><b>Departure due</b><span>03 Sep 11:00</span></div>'
   '</div></div>', em="on one clock", style="flex:1.2")+
 panel("Guest and room", '<div class="pad">'
   '<div class="kv"><span class="mut">Guest</span><b>Ms. L. Haddad</b></div>'
   '<div class="kv"><span class="mut">Loyalty</span><b>VIP · Gold</b></div>'
   '<div class="kv"><span class="mut">Language</span><b>Arabic</b></div>'
   '<div class="kv"><span class="mut">Room</span><b>'+num("1518")+' · no moves</b></div>'
   '<div class="kv"><span class="mut">Prior stays</span><b>4 · 1 prior glitch</b></div>'
   '<div class="note" style="margin-top:10px">Guest fields come from Jazz Core and are limited to name, room, stay dates, VIP flag and language. '
   'No payment or document data enters JazzTicketing.</div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn sec sm">Print for GM</span><span class="btn sec sm">Log a glitch</span></div>'
   '</div>', style="flex:0 0 320px")+
 '</div></div></div>'))

# ---- W10 GM dashboard (charts) ----
SLA=[79,81,80,84,83,86,88,87,90,89,91,92,93,94]
W.append(("W10","Dashboard — the shift, then the trend",
 "Operational state first, trend second, and every figure drills through. The compliance chart is one series against a labelled baseline, not two competing lines; the department bars encode magnitude in one hue rather than colouring departments for decoration. The panel names its own freshness, and says so when a department's data is thin.",
 nav("Dashboard",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Dashboard", '<div class="seg"><div class="on">Today</div><div>7 days</div><div>30 days</div></div>')+
 '<div class="content">'
 '<div class="kpis">'+
 kpi("Open jobs","18","across 3 departments")+kpi("Breached","3","2 guest-facing",True)+
 kpi("Not ready","4","against 14 arrivals",True)+kpi("Median response","7 min","baseline 14 min")+
 kpi("Rooms OOO","1","4 room-nights")+kpi("Open glitches","3","1 awaiting approval",True)+'</div>'
 '<div class="row" style="flex:1">'+
 panel("SLA compliance · last 14 days", '<div class="pad">'+area_chart(SLA,78)+
   '<div class="lgd" style="margin-top:8px"><span><i></i>Jobs closed within SLA target</span>'
   '<span><i class="dash"></i>Pre-launch baseline</span>'
   '<span style="margin-inline-start:auto">Hover any day for the count · <b>Table view</b></span></div></div>',
   em="94% today · +16 pts", style="flex:1.35")+
 panel("Open jobs by department", '<div class="pad">'+bars([("Engineering",8),("Housekeeping",7),("F&amp;B",3),("Front office",0)])+
   '<div class="note" style="margin-top:12px">F&amp;B mobile use is 41% of roster — <b>its figures are incomplete</b> and cannot be compared.</div>'
   '<div class="hint" style="margin-top:8px">Updated 11:52 · live</div></div>', style="flex:1")+
 '</div>'+
 panel("Needs attention now", table(
   [("What",""),("Where","n"),("Since","n"),("Owner",""),("Why it is here",""),("",""),],
   [("hot",[("Work order breached",""),(num("1518"),"n"),("09:39","n"),("<span class='pill p-flat'>Unassigned</span>",""),
        ("Priority hot/cold · guest in house · escalated twice",""),('<span class="btn sm">Assign</span>',"")]),
    ("hot",[("Room not ready for arrival",""),(num("1204"),"n"),("09:22","n"),("R. Santos",""),
        ("Inspection rejected, not restarted · arrival 14:00",""),('<span class="btn sec sm">Open board</span>',"")]),
    ("hot",[("Recovery awaiting approval",""),(num("1518"),"n"),("11:52","n"),("D. Okafor",""),
        ("USD 320 · above duty manager threshold · escalates 13:52",""),('<span class="btn sm">Review</span>',"")]),
    ("",[("Asset recurring fault",""),("FCU-1518",""),("30 Aug","n"),("Chief Engineer",""),
        ("5 work orders in 90 days · awaiting review decision",""),('<span class="btn sec sm">Open asset</span>',"")]),
    ("",[("Jazz Core capability degraded",""),("Property",""),("10:41","n"),("Property admin",""),
        ("Wake-up events retrying · wake-up panel hidden",""),('<span class="btn sec sm">Diagnostics</span>',"")])]),
   em="5 items · each drills through")+
 '</div></div>'))

# ---- W11 SLA reporting ----
W.append(("W11","Reports — measured against this property's own baseline",
 "Medians and percentiles, never means alone, because a mean hides the one guest who waited ninety minutes. Paused time is separable from active time, and the baseline is the property's own pre-launch figure rather than a benchmark nobody agreed to.",
 nav("Reports",{"Dispatch":"18"})+
 '<div class="main">'+top("Reports · Response and SLA", '<span class="btn sec sm">Export CSV</span><span class="btn sec sm">PDF</span>')+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">Aug 2026</span><span class="chip">All departments</span>'
 '<span class="chip">All shifts</span><span class="chip">Exclude paused time</span></div>'
 '<span class="hint">Baseline captured 01–30 Jul, before go-live.</span></div>'
 '<div class="row">'+
 panel("Response time by department", table(
   [("Department",""),("Jobs","n"),("Median","n"),("p90","n"),("Within SLA","n"),("vs baseline","n")],
   [("",[("Housekeeping",""),("1,204","n"),("6 min","n"),("18 min","n"),("96%","n"),(pill("ok","✓","+14 pts"),"n")]),
    ("",[("Engineering",""),("418","n"),("14 min","n"),("52 min","n"),("88%","n"),(pill("ok","✓","+11 pts"),"n")]),
    ("hot",[("F&amp;B",""),("96","n"),("22 min","n"),("94 min","n"),("71%","n"),(pill("breach","▲","Data incomplete"),"n")]),
    ("",[("Front office",""),("212","n"),("4 min","n"),("9 min","n"),("98%","n"),(pill("ok","✓","+6 pts"),"n")]),
    ("",[("<b>Property</b>",""),("<b>1,930</b>","n"),("<b>7 min</b>","n"),("<b>31 min</b>","n"),("<b>94%</b>","n"),(pill("ok","✓","+16 pts"),"n")])]),
   em="August 2026", style="flex:1.3")+
 panel("Breaches by request type", '<div class="pad">'+
   bars([("Hot / cold",14),("Lift fault",9),("Shower / drain",7),("Re-clean",6),("Minibar",4),("Extra towels",2)])+
   '<div class="hint" style="margin-top:12px">42 breaches of 1,930 jobs. Hot/cold is a third of them and clusters on 4 assets.</div></div>',
   style="flex:1")+
 '</div>'+
 panel("Counter-metrics — watched, not optimised", '<div class="pad"><div class="row">'
   '<div style="flex:1"><div class="kv"><span class="mut">Requests per occupied room</span><b>1.9 · was 1.2</b></div>'
   '<div class="hint">Rising is success — capture improving, not demand.</div></div>'
   '<div style="flex:1"><div class="kv"><span class="mut">Rejected inspections</span><b>3.1%</b></div>'
   '<div class="hint">Fast closes that create rework are not speed.</div></div>'
   '<div style="flex:1"><div class="kv"><span class="mut">Notifications per staff / shift</span><b>11</b></div>'
   '<div class="hint">A rising count is a defect, not engagement.</div></div>'
   '<div style="flex:1"><div class="kv"><span class="mut">Config hours at onboarding</span><b>6.5</b></div>'
   '<div class="hint">Speed bought by pushing work onto the hotel is not a win.</div></div>'
   '</div></div>')+
 '</div></div>'))

# ---- W12 configuration ----
W.append(("W12","Configuration — catalog, SLA and escalation, without engineering",
 "A property administrator changes these, not a support ticket. Every value is property-scoped over a tenant default, changes apply only to jobs created after them, and a running SLA clock is never rewritten retroactively.",
 nav("Configuration",{"Dispatch":"18"})+
 '<div class="main">'+top("Configuration · Request catalog", '<span class="btn sm">New catalog entry</span>')+
 '<div class="content">'
 '<div class="row"><div class="seg"><div class="on">Catalog</div><div>SLA and pauses</div><div>Escalation</div><div>Credits</div>'
 '<div>Checklists</div><div>Roles</div><div>Notifications</div></div>'
 '<span class="hint" style="margin-inline-start:auto">Tenant defaults inherited unless overridden here.</span></div>'+
 panel("", table(
   [("Entry",""),("Department",""),("Accept","n"),("Complete","n"),("Pauses",""),("Requires",""),("Scope","")],
   [("",[("<b>Hot / cold</b> <span class='pill p-breach'><span class='gl'>▲</span>Priority</span>",""),("Engineering",""),("5 min","n"),("30 min","n"),("Guest DND · parts",""),("Root cause · photo",""),(pill("flat","○","Property"),"")]),
    ("",[("<b>Extra towels</b>",""),("Housekeeping",""),("5 min","n"),("15 min","n"),("Guest DND",""),("—",""),(pill("flat","○","Tenant"),"")]),
    ("",[("<b>Iron and board</b>",""),("Housekeeping",""),("5 min","n"),("15 min","n"),("Guest DND",""),("—",""),(pill("flat","○","Tenant"),"")]),
    ("sel",[("<b>Lamp not working</b>",""),("Engineering",""),("10 min","n"),("60 min","n"),("Parts · guest not in room",""),("Root cause",""),(pill("flat","○","Property"),"")]),
    ("",[("<b>Minibar restock</b>",""),("F&amp;B",""),("15 min","n"),("90 min","n"),("—",""),("—",""),(pill("flat","○","Property"),"")]),
    ("",[("<b>Lost item enquiry</b> <span class='pill p-flat'>R4</span>",""),("Front office",""),("—","n"),("24 h","n"),("—",""),("Photo",""),(pill("flat","○","Tenant"),"")])]),
   em="6 of 42 entries")+
 '<div class="row">'+
 panel("Editing · Lamp not working", '<div class="pad"><div class="form">'
   '<div class="f"><label>Accept within</label><div class="in">10 minutes</div></div>'
   '<div class="f"><label>Complete within</label><div class="in">60 minutes</div></div>'
   '<div class="f"><label>Escalation chain</label><div class="in">Supervisor → Chief Engineer → Duty Manager</div></div>'
   '<div class="f"><label>Interval per step</label><div class="in">10 minutes</div></div></div>'
   '<div class="note" style="margin-top:12px">Applies to jobs created after saving. <b>The 8 jobs of this type open right now keep their current targets</b> — a running clock is never rewritten.</div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn">Save changes</span><span class="btn sec">Discard</span></div></div>', style="flex:1")+
 panel("Change history", '<div class="pad"><div class="tl">'
   '<div class="done"><b>Complete target 45 → 60 min</b><span>28 Aug 09:14 · T. Kabir</span></div>'
   '<div class="done"><b>Pause “parts” added</b><span>21 Aug 16:02 · T. Kabir</span></div>'
   '<div class="done"><b>Entry created from tenant default</b><span>04 Aug 11:30 · system</span></div></div>'
   '<div class="hint" style="margin-top:8px">Every configuration change is attributed and retained in the audit trail.</div></div>', style="flex:1")+
 '</div></div></div>'))

# ---- W13 Jazz Core health ----
W.append(("W13","Jazz Core — the seam, made visible to the property",
 "The dependency the whole product rests on, shown to a property administrator without engineering access. Capability negotiation is stated per property, so a missing feature reads as a known absence rather than as a broken screen — and latency is split so nobody argues about whose seconds they are.",
 nav("Jazz Core",{"Dispatch":"18"})+
 '<div class="main">'+top("Jazz Core connection", '<span class="btn sec sm">Download diagnostics</span>')+
 '<div class="content">'
 '<div class="row">'
 '<div class="health" style="flex:1"><span class="dot ok"></span><div><b>Connected</b><div class="hint">Last exchange 3s ago</div></div></div>'
 '<div class="health" style="flex:1"><span class="dot ok"></span><div><b>Room status · two-way</b><div class="hint">p95 4.1s · ours 0.9s</div></div></div>'
 '<div class="health" style="flex:1"><span class="dot ok"></span><div><b>Call events</b><div class="hint">p95 1.2s</div></div></div>'
 '<div class="health" style="flex:1"><span class="dot due"></span><div><b>Wake-up events</b><div class="hint">Degraded · retrying</div></div></div>'
 '<div class="health" style="flex:1"><span class="dot ok"></span><div><b>OOO write-back</b><div class="hint">2 today · both accepted</div></div></div>'
 '</div>'
 '<div class="row">'+
 panel("Capabilities at this property", table([("Capability",""),("State",""),("Effect in JazzTicketing","")],
   [("",[("Room status subscribe / publish",""),(pill("ok","✓","Available"),""),("Floor and boards live","")]),
    ("",[("Stay and master data",""),(pill("ok","✓","Available"),""),("Guest context on jobs","")]),
    ("",[("Guest call events",""),(pill("ok","✓","Available"),""),("Dispatch pre-resolves the room","")]),
    ("",[("Wake-up events",""),(pill("due","●","Degraded"),""),("Wake-up panel hidden · failures not raised as jobs","")]),
    ("",[("Phone-posted status",""),(pill("ok","✓","Available"),""),("Phone codes treated as in-app changes","")]),
    ("",[("Minibar postings",""),(pill("flat","○","Not enabled here"),""),("Minibar affordance not shown — a known absence","")])]),
   em="6 capabilities", style="flex:1.2")+
 panel("Conflicts resolved today", table([("Time","n"),("Room","n"),("Held",""),("Won","")],
   [("",[("11:31","n"),(num("1206"),"n"),("Clean / Dirty",""),("Ours · cleanliness","")]),
    ("",[("10:14","n"),(num("0812"),"n"),("Vacant / Occupied",""),("Jazz Core · occupancy","")]),
    ("",[("09:02","n"),(num("1211"),"n"),("Vacant / Occupied",""),("Jazz Core · discrepancy filed","")])]),
   em="3 · normal", style="flex:1")+
 '</div>'
 '<div class="note">Authority rule for this property: <b>Jazz Core is authoritative for occupancy, JazzTicketing for cleanliness.</b> '
 'A staff member who finds a room that does not match files a discrepancy — occupancy is never overwritten from the floor.</div>'
 '</div></div>'))

# ---- W-AR ----
W.append(("W-AR","All jobs — Arabic, dark",
 "The console mirrored. Table columns, filter row and navigation flip together; job identifiers, room numbers and clock times stay Western so they match the door, the phone call and the printed board.",
 nav("Dispatch",{"Dispatch":"١٨"}).replace('Jazz<i>Ticketing</i>','Jazz<i>Ticketing</i>')
   .replace("OPERATIONS","العمليات").replace("INSIGHT","التحليلات").replace("SETUP","الإعداد")
   .replace(">Dispatch<",">الإرسال<").replace(">Housekeeping<",">التدبير المنزلي<").replace(">Engineering<",">الهندسة<")
   .replace(">Incidents<",">الحوادث<").replace(">Dashboard<",">لوحة المعلومات<").replace(">Reports<",">التقارير<")
   .replace(">Configuration<",">الإعدادات<").replace(">Jazz Core<",">Jazz Core<")
   .replace("Grand Meridian · 240 rooms<br>Shift 07:00–15:00","جراند ميريديان · ٢٤٠ غرفة<br>الوردية ٠٧:٠٠–١٥:٠٠")+
 '<div class="main">'+top("جميع المهام", '<span class="btn sec sm">تصدير</span>', "جراند ميريديان ▾", "ابحث عن غرفة أو مهمة   ⌘K")+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">كل الأقسام</span><span class="chip">التدبير المنزلي ٧</span>'
 '<span class="chip">الهندسة ٨</span><span class="chip">غير معيّنة ٤</span><span class="chip">متجاوزة ٣</span></div>'
 '<div class="seg"><div class="on">مفتوحة</div><div>اليوم</div><div>الكل</div></div></div>'+
 panel("", table([("المهمة","n"),("الطلب",""),("القسم",""),("الغرفة","n"),("المسؤول",""),("المهلة","n")],
   [("hot",[(num("J-2841"),"n"),("تدفئة / تبريد <b>عاجل</b>",""),("الهندسة",""),(num("1518"),"n"),("<span class='pill p-flat'>غير معيّنة</span>",""),(pill("breach","▲","متأخرة "+num("٨ د")),"n")]),
    ("",[(num("J-2856"),"n"),("مناشف إضافية",""),("التدبير المنزلي",""),(num("0914"),"n"),("<span class='pill p-flat'>غير معيّنة</span>",""),(pill("due","●",num("٩ د")+" متبقية"),"n")]),
    ("",[(num("J-2833"),"n"),("مصباح لا يعمل",""),("الهندسة",""),(num("0812"),"n"),("م. أورتيز",""),(pill("due","●",num("٢٢ د")+" متبقية"),"n")]),
    ("",[(num("J-2829"),"n"),("تصريف الدش",""),("الهندسة",""),(num("0940"),"n"),("ك. بيلو",""),(pill("paused","‖","موقوفة"),"n")]),
    ("",[(num("J-2844"),"n"),("إعادة تنظيف",""),("التدبير المنزلي",""),(num("1204"),"n"),("ر. سانتوس",""),(pill("due","●",num("١٩ د")),"n")])]),
   em="١٨ مفتوحة · ٣ متجاوزة")+
 '</div></div>', True, True))

# ================= ADDED AFTER COVERAGE REVIEW =================

# ---- W14 sign in ----
W.append(("W14","Sign in — SSO first, password as the fallback",
 "Corporate and management users go through the tenant's identity provider; a property user without SSO gets a password. No PIN here — PIN belongs to shared handsets, and offering both on one screen teaches nobody which is theirs. The property picker appears only for someone with more than one.",
 '<div class="login"><div class="art">'
 '<div><h2>Jazz<i>Ticketing</i></h2><p>Requests, rooms, work orders and recovery — one operational record per property.</p></div>'
 '<div class="st">Signed in through Jazzware identity · session 12 h · EU region</div></div>'
 '<div class="form2"><h3>Sign in</h3>'
 '<div class="f"><label>Work email</label><div class="in">a.rivera@grandmeridian.com</div></div>'
 '<span class="btn" style="height:40px">Continue with Jazzware SSO</span>'
 '<div class="hint" style="text-align:center">Your organisation uses single sign-on.</div>'
 '<div style="display:flex;align-items:center;gap:10px;color:var(--ink-disabled);font-size:11.5px">'
 '<span style="flex:1;height:1px;background:var(--hairline)"></span>OR<span style="flex:1;height:1px;background:var(--hairline)"></span></div>'
 '<div class="f"><label>Password</label><div class="in mut">For property accounts without SSO</div></div>'
 '<span class="btn sec" style="height:40px">Sign in with password</span>'
 '<div class="f" style="margin-top:6px"><label>Property</label><div class="in">Grand Meridian ▾ <span class="hint">3 properties</span></div></div>'
 '<div class="hint">Trouble signing in? Your property administrator can reset access. '
 'JazzTicketing never asks for a PMS or payment credential.</div>'
 '</div></div>', False, False, "app.jazzticketing.com/signin"))

# ---- W15 floor plan ----
def rp(n,s,g,c): return f'<div class="rmp {c}"><b class="num">{n}</b><i>{g} {s}</i></div>'
def svc(lab): return f'<div class="rmp svc"><b>&nbsp;</b><i>{lab}</i></div>'
W.append(("W15","Floor plan — the schematic, not the architecture",
 "Rooms in their real positions: two corridor sides, the service core where it actually is, so a supervisor walking the floor sees the walk rather than a sorted list. It is a schematic built from a per-floor layout (wing, side, sequence), not a CAD drawing — see the note in the panel for what that costs to set up.",
 nav("Housekeeping",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Housekeeping · Floor plan", '<div class="seg"><div>Grid</div><div class="on">Plan</div></div>')+
 '<div class="content">'
 '<div class="row"><div class="seg"><div>10</div><div>11</div><div class="on">12</div><div>13</div><div>14</div></div>'
 '<div class="chips"><span class="chip on">Status</span><span class="chip">Attendant</span><span class="chip">Arrivals</span></div>'
 '<span class="hint" style="margin-inline-start:auto">8 dirty · 2 stuck · 14 arrivals by 15:00</span></div>'+
 panel("Floor 12 · plan", '<div class="pad">'
   '<div class="zone">North side <em>· odd numbers · service core mid-corridor</em></div>'
   '<div class="plan"><div class="side">'+
   rp(1201,"Ready","✓","ok")+rp(1203,"Dirty","●","due")+rp(1205,"In prog","▶","fl")+rp(1207,"Ready","✓","ok")+
   rp(1209,"Insp","◷","fl")+rp(1211,"DND","‖","pa")+svc("Linen")+rp(1213,"Ready","✓","ok")+rp(1215,"Refused","‖","pa")+
   rp(1217,"Clean","✓","ok")+rp(1219,"Dirty","●","due")+
   '</div><div class="corr"><span>← West wing · R. Santos</span><span>Lifts · service stair · ice</span><span>East wing · A. Rivera →</span></div>'
   '<div class="side">'+
   rp(1202,"Clean","✓","ok")+rp(1204,"Redo","▲","br")+rp(1206,"Dirty","●","due")+rp(1208,"In prog","▶","fl")+
   rp(1210,"Dirty","●","due")+rp(1212,"OOO","▲","br")+svc("Store")+rp(1214,"Ready","✓","ok")+rp(1216,"Dirty","●","due")+
   rp(1218,"Ready","✓","ok")+rp(1220,"Stay","●","due")+
   '</div></div>'
   '<div class="zone" style="margin-top:8px">South side <em>· even numbers</em></div>'
   '<div class="note" style="margin-top:12px"><b>This is a schematic, not a floor plan file.</b> It is generated from a per-floor '
   'layout — wing, corridor side, sequence, and where the service rooms and lift core sit — which is Location configuration '
   'somebody has to enter once per floor. That is real onboarding cost (PRD FR-80, OR-3), which is why the grid stays the '
   'default view and the plan is the opt-in one.</div>'
   '</div>', em="20 rooms · 2 service · plan view")+
 '</div></div>'))

# ---- W16 assign picker (console) ----
W.append(("W16","Assign — who to send, and why them",
 "The console answer to an unassigned ticket. Ranked on the two things that decide it on a floor — current load and how far away someone is — with skill match stated rather than assumed. A department queue stays an option, because a queue everyone can see beats a person who is already drowning.",
 nav("Dispatch",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("All jobs")+
 '<div class="content"><div class="chips"><span class="chip on">Unassigned 4</span><span class="chip">Engineering 8</span></div>'+
 panel("", table([("Job","n"),("Fault",""),("Location","n"),("Assigned",""),("SLA","n")],
   [("hot sel",[(num("J-2841"),"n"),("Hot / cold <b>Priority</b>",""),(num("1518"),"n"),("<span class='pill p-flat'>Unassigned</span>",""),(pill("breach","▲","Overdue 8m"),"n")]),
    ("",[(num("J-2856"),"n"),("Extra towels",""),(num("0914"),"n"),("<span class='pill p-flat'>Unassigned</span>",""),(pill("due","●","9m"),"n")])]))+
 '</div></div>'
 '<div class="modal"><div class="sheet">'
 '<div class="mh"><h2>Assign '+num("J-2841")+' · Hot / cold</h2>'+pill("breach","▲","Overdue 8 min")+'<span class="x">✕</span></div>'
 '<div class="mb">'
 '<div class="chips"><span class="chip on">Engineering</span><span class="chip">Any department</span>'
 '<span class="chip">On shift only</span><span class="chip">Skill: HVAC</span></div>'+
 table([("Staff member",""),("Open","n"),("Nearest","n"),("Skill",""),("Last closed","n"),("",""),],
   [("sel",[('<span class="av">MO</span><b>M. Ortiz</b> · Engineering',""),("2","n"),("Floor 15","n"),
        ('<span class="tag">HVAC certified</span>',""),("11:04","n"),('<span class="btn sm">Assign</span>',"")]),
    ("",[('<span class="av">KB</span><b>K. Bello</b> · Engineering',""),("4","n"),("Plant room","n"),
        ('<span class="tag">HVAC certified</span>',""),("10:58","n"),('<span class="btn sec sm">Assign</span>',"")]),
    ("",[('<span class="av">JD</span><b>J. Duarte</b> · Engineering',""),("1","n"),("Off shift 15:00","n"),
        ('<span class="tag">Electrical</span><span class="tag">No HVAC</span>',""),("—","n"),('<span class="btn sec sm">Assign</span>',"")]),
    ("",[('<span class="av">◇</span><b>Engineering queue</b>',""),("4 waiting","n"),("—","n"),
        ('<span class="tag">Anyone eligible</span>',""),("—","n"),('<span class="btn sec sm">Send to queue</span>',"")])])+
 '<div class="note">The SLA clock keeps running — assigning does not reset it. M. Ortiz is notified now; '
 'if he does not accept within 5 minutes it escalates to the Chief Engineer.</div>'
 '</div>'
 '<div class="mf"><span class="btn sec">Cancel</span><span class="btn">Assign to M. Ortiz</span></div>'
 '</div></div>'))

# ---- W17 new catalog entry ----
W.append(("W17","New catalog entry — the form that shapes every future job",
 "A Catalog Entry is where a Request gets its department, its clock and its required evidence, so this form is the highest-leverage screen in Configuration. Defaults are inherited from the tenant and shown as inherited, so an administrator changes what the property actually needs and leaves the rest alone.",
 nav("Configuration",{"Dispatch":"18"})+
 '<div class="main">'+top("Configuration · Request catalog")+
 '<div class="content"><div class="seg"><div class="on">Catalog</div><div>SLA and pauses</div><div>Escalation</div><div>Credits</div><div>Checklists</div><div>Notifications</div></div>'+
 panel("", table([("Entry",""),("Department",""),("Complete","n"),("Scope","")],
   [("",[("<b>Hot / cold</b>",""),("Engineering",""),("30 min","n"),(pill("flat","○","Property"),"")]),
    ("",[("<b>Extra towels</b>",""),("Housekeeping",""),("15 min","n"),(pill("flat","○","Tenant"),"")])]))+
 '</div></div>'
 '<div class="modal"><div class="sheet"><div class="mh"><h2>New catalog entry</h2>'
 '<span class="pill p-flat">Property · Grand Meridian</span><span class="x">✕</span></div>'
 '<div class="mb">'
 '<div class="form">'
 '<div class="f"><label>Name — what staff will see</label><div class="in">Air conditioning not cooling</div></div>'
 '<div class="f"><label>Also matches (search aliases)</label><div class="in">aircon, AC, hot, cold, warm room</div></div>'
 '<div class="f"><label>Department</label><div class="in">Engineering ▾</div></div>'
 '<div class="f"><label>Skill required</label><div class="in">HVAC ▾ <span class="hint">restricts the assign list</span></div></div>'
 '<div class="f"><label>Accept within</label><div class="in">5 minutes <span class="hint">tenant default 10</span></div></div>'
 '<div class="f"><label>Complete within</label><div class="in">30 minutes <span class="hint">tenant default 60</span></div></div>'
 '<div class="f"><label>Default duration shown to guest</label><div class="in">20 minutes · median will replace this after 30 jobs</div></div>'
 '<div class="f"><label>Guest-impacting fast path</label><div class="in">Yes — priority SLA and chain ▾</div></div>'
 '</div>'
 '<div class="row" style="gap:16px">'
 '<div style="flex:1"><label class="hint" style="font-weight:700">Pause conditions offered</label>'
 '<div class="chips" style="margin-top:6px"><span class="chip on">Guest DND</span><span class="chip on">Awaiting parts</span>'
 '<span class="chip on">Guest not in room</span><span class="chip">Awaiting guest availability</span></div></div>'
 '<div style="flex:1"><label class="hint" style="font-weight:700">Required to close</label>'
 '<div class="chips" style="margin-top:6px"><span class="chip on">Root cause</span><span class="chip on">Photo</span>'
 '<span class="chip">Parts used</span><span class="chip">Guest follow-up</span></div></div>'
 '</div>'
 '<div class="note">Applies to jobs created after saving. Existing open jobs keep the targets they were created with — '
 'a running clock is never rewritten (PRD FR-5, FR-12).</div>'
 '</div>'
 '<div class="mf"><span class="btn sec">Cancel</span><span class="btn sec">Save as draft</span><span class="btn">Create entry</span></div>'
 '</div></div>'))

# ---- W18 SLA and pauses ----
W.append(("W18","Configuration · SLA and pauses",
 "Two clocks per entry, not one: acceptance and completion fail differently and escalate differently. The pause ceiling is the row that matters — a job parked on DND forever is how SLA compliance gets gamed, so a pause re-escalates rather than running out the clock.",
 nav("Configuration",{"Dispatch":"18"})+
 '<div class="main">'+top("Configuration · SLA and pauses", '<span class="btn sec sm">Revert to tenant defaults</span>')+
 '<div class="content"><div class="seg"><div>Catalog</div><div class="on">SLA and pauses</div><div>Escalation</div><div>Credits</div><div>Checklists</div><div>Notifications</div></div>'+
 panel("SLA targets by department", table(
   [("Department",""),("Accept","n"),("Complete","n"),("Priority accept","n"),("Priority complete","n"),("Scope","")],
   [("",[("Housekeeping",""),("5 min","n"),("15 min","n"),("2 min","n"),("10 min","n"),(pill("flat","○","Property"),"")]),
    ("",[("Engineering",""),("10 min","n"),("60 min","n"),("5 min","n"),("30 min","n"),(pill("flat","○","Property"),"")]),
    ("",[("F&amp;B",""),("15 min","n"),("90 min","n"),("10 min","n"),("45 min","n"),(pill("flat","○","Tenant"),"")]),
    ("",[("Front office",""),("5 min","n"),("20 min","n"),("2 min","n"),("10 min","n"),(pill("flat","○","Tenant"),"")]),
    ("",[("Security",""),("2 min","n"),("15 min","n"),("1 min","n"),("5 min","n"),(pill("flat","○","Property"),"")])]),
   em="entry-level overrides win over these")+
 '<div class="row">'+
 panel("Pause conditions", table([("Condition",""),("Offered to",""),("Max pause","n"),("On expiry","")],
   [("",[("Guest DND",""),("All departments",""),("120 min","n"),("Re-escalate to supervisor","")]),
    ("",[("Guest not in room",""),("All departments",""),("60 min","n"),("Re-escalate to supervisor","")]),
    ("hot",[("Awaiting parts",""),("Engineering",""),("8 h","n"),("<b>Re-escalate to Chief Engineer</b>","")]),
    ("",[("Awaiting guest availability",""),("Housekeeping · F&amp;B",""),("240 min","n"),("Re-escalate to duty manager","")])]),
   em="4 conditions", style="flex:1.2")+
 panel("How the clock behaves", '<div class="pad">'
   '<div class="kv"><span class="mut">Measured</span><b>Server-side, UTC</b></div>'
   '<div class="kv"><span class="mut">Shown</span><b>Property local time</b></div>'
   '<div class="kv"><span class="mut">Paused time</span><b>Excluded from SLA, retained in history</b></div>'
   '<div class="kv"><span class="mut">Reassignment</span><b>Clock continues — never reset</b></div>'
   '<div class="kv"><span class="mut">Offline action</span><b>Timestamped when taken, not when synced</b></div>'
   '<div class="note" style="margin-top:10px">These are platform behaviours, not settings. They are shown here because '
   'every argument about a breach starts with someone assuming one of them works differently.</div></div>', style="flex:1")+
 '</div></div></div>'))

# ---- W19 escalation ----
W.append(("W19","Configuration · Escalation chains",
 "A chain that reaches its end holds at the final role and keeps reminding rather than stopping silently — the failure mode where a breached job quietly stops asking for help. Quiet hours are overridden by guest-impacting work, and every override is logged.",
 nav("Configuration",{"Dispatch":"18"})+
 '<div class="main">'+top("Configuration · Escalation", '<span class="btn sm">New chain</span>')+
 '<div class="content"><div class="seg"><div>Catalog</div><div>SLA and pauses</div><div class="on">Escalation</div><div>Credits</div><div>Checklists</div><div>Notifications</div></div>'
 '<div class="row">'+
 panel("Chains", table([("Chain",""),("Applies to",""),("Steps","n"),("Interval","n"),("",""),],
   [("sel",[("<b>Engineering · standard</b>",""),("All engineering jobs",""),("3","n"),("10 min","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("<b>Engineering · priority</b>",""),("Guest-impacting fast path",""),("4","n"),("5 min","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("<b>Housekeeping</b>",""),("All housekeeping jobs",""),("2","n"),("10 min","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("<b>Recovery approval</b>",""),("Above-threshold recoveries",""),("2","n"),("120 min","n"),('<span class="btn sec sm">Edit</span>',"")])]),
   em="4 chains", style="flex:1")+
 panel("Engineering · standard", '<div class="pad">'
   '<div class="tl">'
   '<div class="done"><b>Step 1 — Shift engineer on duty</b><span>At non-acceptance (10 min) or breach</span></div>'
   '<div class="done"><b>Step 2 — Chief Engineer</b><span>+10 min if still unaccepted or open</span></div>'
   '<div class="now"><b>Step 3 — Duty Manager</b><span>+10 min · final step</span></div>'
   '<div><b>Holds here and keeps reminding</b><span>Every 15 min until accepted or closed — it never goes quiet</span></div>'
   '</div>'
   '<div class="form" style="margin-top:14px">'
   '<div class="f"><label>Non-acceptance interval</label><div class="in">10 minutes</div></div>'
   '<div class="f"><label>Breach interval</label><div class="in">10 minutes</div></div>'
   '<div class="f"><label>Channels</label><div class="in">Push · in-app · email from step 2</div></div>'
   '<div class="f"><label>Quiet hours</label><div class="in">Respected · priority jobs override</div></div></div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn">Save chain</span><span class="btn sec">Add step</span></div>'
   '</div>', style="flex:1")+
 '</div></div></div>'))

# ---- W20 checklists ----
W.append(("W20","Configuration · Inspection checklists",
 "The checklist is what makes an inspection a measurement rather than an opinion. Scored items feed the rejection rate that counterbalances closure speed, and a failed critical item forces a reject so a supervisor cannot pass a room with a critical fail on it.",
 nav("Configuration",{"Dispatch":"18"})+
 '<div class="main">'+top("Configuration · Checklists", '<span class="btn sm">New checklist</span>')+
 '<div class="content"><div class="seg"><div>Catalog</div><div>SLA and pauses</div><div>Escalation</div><div>Credits</div><div class="on">Checklists</div><div>Notifications</div></div>'
 '<div class="row">'+
 panel("Checklists", table([("Checklist",""),("Used for",""),("Items","n"),("",""),],
   [("sel",[("<b>Departure clean</b>",""),("Departure inspections",""),("12","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("<b>Stayover clean</b>",""),("Stayover inspections",""),("7","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("<b>Turndown</b>",""),("Turndown pass",""),("5","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("<b>Deep clean</b>",""),("Quarterly programme",""),("22","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("<b>Room release after OOO</b>",""),("Engineering handback",""),("9","n"),('<span class="btn sec sm">Edit</span>',"")])]),
   em="5 checklists", style="flex:1")+
 panel("Departure clean · 12 items", table([("Item",""),("Weight","n"),("Critical",""),("Photo on fail","")],
   [("hot",[("Bathroom — WC and basin",""),("3","n"),('<span class="pill p-breach"><span class="gl">▲</span>Yes</span>',""),("Required","")]),
    ("hot",[("Linen — clean and unmarked",""),("3","n"),('<span class="pill p-breach"><span class="gl">▲</span>Yes</span>',""),("Required","")]),
    ("",[("Surfaces dusted",""),("2","n"),("—",""),("Required","")]),
    ("",[("Floors and edges",""),("2","n"),("—",""),("Optional","")]),
    ("",[("Amenities stocked",""),("1","n"),("—",""),("Optional","")]),
    ("",[("Minibar checked",""),("1","n"),("—",""),("Optional","")])]),
   em="6 of 12 shown", style="flex:1.1")+
 '</div>'
 '<div class="note"><b>A critical fail forces a reject.</b> The supervisor cannot pass a room with a critical item failed — '
 'and the rejection carries the failed item, the note and the photo back to the attendant\'s board ahead of unstarted rooms.</div>'
 '</div></div>'))

# ---- W21 notifications ----
W.append(("W21","Configuration · Notifications and quiet hours",
 "Volume is the way you lose this workforce, so the counter-metric sits on the same screen as the settings that drive it. Suppression and coalescing are defaults rather than options — except for breach notifications to management, which are never suppressed.",
 nav("Configuration",{"Dispatch":"18"})+
 '<div class="main">'+top("Configuration · Notifications")+
 '<div class="content"><div class="seg"><div>Catalog</div><div>SLA and pauses</div><div>Escalation</div><div>Credits</div><div>Checklists</div><div class="on">Notifications</div></div>'
 '<div class="row">'+
 panel("Routing by event", table([("Event",""),("Roles notified",""),("Push",""),("In-app",""),("Email",""),("SMS","")],
   [("",[("Job dispatched",""),("Assignee",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Not accepted",""),("Supervisor",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("hot",[("SLA breach",""),("Chain roles",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>Off</span>","")]),
    ("",[("Reassigned",""),("Both staff",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Inspection rejected",""),("Attendant",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Recovery approval",""),("GM",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Discrepancy filed",""),("Front office · supervisor",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")])]),
   em="SMS off by default — per-property cost", style="flex:1.4")+
 panel("Volume and quiet hours", '<div class="pad">'
   '<div class="kv"><span class="mut">Notifications per staff / shift</span><b>11 · target under 15</b></div>'
   '<div class="kv"><span class="mut">Suppressed as not actionable</span><b>38 today</b></div>'
   '<div class="kv"><span class="mut">Coalesced bursts</span><b>12 today</b></div>'
   '<div class="note" style="margin-top:10px">SM-C3 watches this number. <b>A rising count is a defect, not engagement</b> — '
   'escalation that pages everyone works until staff stop looking.</div>'
   '<div class="form" style="margin-top:14px"><div class="f"><label>Quiet hours</label><div class="in">22:00 – 06:00</div></div>'
   '<div class="f"><label>Coalesce window</label><div class="in">3 minutes</div></div></div>'
   '<div class="note" style="margin-top:12px">Guest-impacting priority jobs override quiet hours, and every override is logged. '
   'Breach notifications to management roles are never suppressed.</div></div>', style="flex:1")+
 '</div></div></div>'))

# ================= ADMINISTRATION =================

W.append(("W22","Admin · Users",
 "Who can see and do what, across a tenant that may span regions. Role is per property, not global, so one person can be an attendant at one hotel and a supervisor at another — the list shows that plainly instead of flattening it to one label.",
 nav("Users",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Users", '<span class="btn sec sm">Import from roster</span><span class="btn sm">Invite user</span>')+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">Active 148</span><span class="chip">Invited 6</span>'
 '<span class="chip">Suspended 3</span><span class="chip">All properties</span><span class="chip">Line staff 118</span>'
 '<span class="chip">Managers 24</span></div><div class="search" style="width:220px">Search name or email</div></div>'+
 panel("", table(
   [("User",""),("Access",""),("Roles by property",""),("Language",""),("Last active","n"),("",""),],
   [("",[('<span class="av">AR</span><b>Ana Rivera</b><div class="hint">a.rivera@grandmeridian.com</div>',""),
        (pill("ok","✓","SSO"),""),('<span class="tag">Grand Meridian · Supervisor</span>',""),("English",""),("2 min ago","n"),
        ('<span class="btn sec sm">Manage</span>',"")]),
    ("",[('<span class="av">RS</span><b>Rosa Santos</b><div class="hint">PIN only · no email</div>',""),
        (pill("flat","○","PIN"),""),('<span class="tag">Grand Meridian · Room Attendant</span>',""),("Tagalog",""),("14 min ago","n"),
        ('<span class="btn sec sm">Manage</span>',"")]),
    ("",[('<span class="av">MO</span><b>Miguel Ortiz</b><div class="hint">m.ortiz@grandmeridian.com</div>',""),
        (pill("ok","✓","SSO"),""),('<span class="tag">Grand Meridian · Engineer</span><span class="tag">Harbour Point · Engineer</span>',""),
        ("Español",""),("6 min ago","n"),('<span class="btn sec sm">Manage</span>',"")]),
    ("",[('<span class="av">NK</span><b>Nadia Karam</b><div class="hint">n.karam@meridiangroup.com</div>',""),
        (pill("ok","✓","SSO"),""),('<span class="tag">Group · Corporate viewer</span><span class="tag">Grand Meridian · GM</span>',""),
        ("العربية",""),("1 h ago","n"),('<span class="btn sec sm">Manage</span>',"")]),
    ("hot",[('<span class="av">JD</span><b>Jorge Duarte</b><div class="hint">j.duarte@grandmeridian.com</div>',""),
        (pill("breach","▲","Suspended"),""),('<span class="tag">Grand Meridian · Engineer</span>',""),("Português",""),("6 days ago","n"),
        ('<span class="btn sec sm">Manage</span>',"")]),
    ("",[('<span class="av">TK</span><b>Tanim Kabir</b><div class="hint">tanim.kabir@jazzware.com</div>',""),
        (pill("ok","✓","SSO"),""),('<span class="tag">Tenant · Administrator</span>',""),("English",""),("now","n"),
        ('<span class="btn sec sm">Manage</span>',"")])]), em="157 users · 3 properties")+
 '</div></div>'))

W.append(("W23","Admin · User detail and access",
 "Access is granted per property and per role, and revoking it is one control rather than a hunt. The panel states what a role can actually do instead of making an administrator guess from its name — and offboarding is a single action that ends sessions everywhere.",
 nav("Users",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Miguel Ortiz", '<span class="btn warn sm">Offboard</span>')+
 '<div class="content"><div class="row">'+
 panel("Identity", '<div class="pad">'
   '<div class="kv"><span class="mut">Name</span><b>Miguel Ortiz</b></div>'
   '<div class="kv"><span class="mut">Email</span><b>m.ortiz@grandmeridian.com</b></div>'
   '<div class="kv"><span class="mut">Authentication</span><b>Jazzware SSO</b></div>'
   '<div class="kv"><span class="mut">PIN for shared devices</span><b>Set · reset available</b></div>'
   '<div class="kv"><span class="mut">Language</span><b>Español (es-MX)</b></div>'
   '<div class="kv"><span class="mut">Skills</span><b>HVAC certified · Electrical</b></div>'
   '<div class="kv"><span class="mut">Employee ref</span><b>GM-4471</b></div>'
   '<div class="note" style="margin-top:10px">Skills restrict the assign list (W16) and the fast-path routing for '
   'guest-impacting jobs. They are access-relevant, not decoration.</div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn sec sm">Reset PIN</span>'
   '<span class="btn sec sm">Sign out everywhere</span></div></div>', style="flex:1")+
 panel("Access", '<div class="pad">'+
   table([("Property",""),("Role",""),("Since","n"),("",""),],
   [("",[('<b>Grand Meridian</b><div class="hint">EU · 240 rooms</div>',""),("Engineer ▾",""),("04 Aug","n"),('<span class="btn sec sm">Revoke</span>',"")]),
    ("",[('<b>Harbour Point</b><div class="hint">EU · 96 rooms</div>',""),("Engineer ▾",""),("21 Aug","n"),('<span class="btn sec sm">Revoke</span>',"")])])+
   '<div style="margin-top:12px"><span class="btn sm">Grant access to another property</span></div>'
   '<div class="zone" style="margin-top:16px">What Engineer can do</div>'
   '<div class="chips"><span class="chip on">Accept and work jobs</span><span class="chip on">Raise faults</span>'
   '<span class="chip on">Set rooms out of order</span><span class="chip on">Record parts and root cause</span>'
   '<span class="chip">Reassign others</span><span class="chip">Inspect rooms</span><span class="chip">Approve recoveries</span>'
   '<span class="chip">Change configuration</span></div>'
   '<div class="note" style="margin-top:12px">Filled chips are granted, outlined are not. Every permission check is enforced '
   'server-side — hiding a control is never the security boundary (PRD FR-2).</div></div>', style="flex:1.2")+
 '</div></div></div>'))

W.append(("W24","Admin · Roles and permissions",
 "The shipped role set as a matrix, because the question an administrator actually has is comparative — who can approve a recovery, who can override an inspection. Roles are editable per tenant but the matrix names the blast radius of a change before it is made.",
 nav("Roles",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Roles", '<span class="btn sec sm">Duplicate role</span><span class="btn sm">New role</span>')+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">Property roles</span><span class="chip">Tenant roles</span></div>'
 '<span class="hint">7 shipped roles · 148 users assigned</span></div>'+
 panel("Permissions matrix", '<div style="overflow:hidden">'+table(
   [("Permission",""),("Line staff",""),("Supervisor",""),("Dept manager",""),("Front office",""),("Duty mgr",""),("Property admin",""),("Corp viewer","")],
   [("",[("Accept and work jobs",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Log a Request",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Assign and reassign",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Inspect rooms",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Set out of order",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("hot",[("Approve recovery above threshold",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>to 150</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Change configuration",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("Manage users and access",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>","")]),
    ("",[("See other properties",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx y'>read</span>","")]),
    ("",[("See guest identity",""),("<span class='mx y'>in job</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>never</span>","")])],
   ).replace('<table>','<table class="mx">')+'</div>',
   em="10 of 34 permissions shown")+
 '<div class="note"><b>Two rows carry the governance decisions.</b> Corporate viewers never see guest identity, so a '
 'cross-property view cannot become a guest database (PRD FR-76, DG-1). Line staff see guest name only inside a job they '
 'are assigned — never in a list.</div>'
 '</div></div>'))

W.append(("W25","Admin · Properties and tenancy",
 "Where a property lives is a data-residency decision, so the region sits in the same table as the room count rather than buried in a settings page. A tenant may span regions; a property may not, and the table says so.",
 nav("Properties",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Meridian Group", '<span class="btn sm">Add property</span>')+
 '<div class="content">'
 '<div class="kpis" style="grid-template-columns:repeat(5,1fr)">'+
 kpi("Properties","3","2 regions")+kpi("Rooms","576","across the group")+kpi("Users","157","118 line staff")+
 kpi("Jazz Core","3 of 3","all connected")+kpi("Region","EU · ME","tenant spans both")+'</div>'+
 panel("Properties", table(
   [("Property",""),("Region",""),("Rooms","n"),("Departments","n"),("Jazz Core",""),("Config",""),("",""),],
   [("",[('<b>Grand Meridian</b><div class="hint">Dubai · flagship</div>',""),("ME · me-central-1",""),("240","n"),("5","n"),
        (pill("ok","✓","Connected"),""),("<span class='tag'>Property overrides 14</span>",""),('<span class="btn sec sm">Open</span>',"")]),
    ("",[('<b>Harbour Point</b><div class="hint">Lisbon</div>',""),("EU · eu-west-1",""),("96","n"),("4","n"),
        (pill("ok","✓","Connected"),""),("<span class='tag'>Tenant defaults</span>",""),('<span class="btn sec sm">Open</span>',"")]),
    ("hot",[('<b>Cedar House</b><div class="hint">Amsterdam · onboarding</div>',""),("EU · eu-west-1",""),("240","n"),("3","n"),
        (pill("due","●","Verifying capabilities"),""),("<span class='tag'>Setup 40%</span>",""),('<span class="btn sm">Continue setup</span>',"")])]),
   em="3 properties")+
 '<div class="row">'+
 panel("Tenant defaults", '<div class="pad"><div class="kv"><span class="mut">Catalog entries</span><b>42</b></div>'
   '<div class="kv"><span class="mut">SLA sets</span><b>5 departments</b></div>'
   '<div class="kv"><span class="mut">Escalation chains</span><b>4</b></div>'
   '<div class="kv"><span class="mut">Cross-property guest history</span><b>Off</b></div>'
   '<div class="note" style="margin-top:10px">A property inherits these until it overrides them. Cross-property guest '
   'history is off by default and its state is recorded in the audit trail (PRD FR-45).</div></div>', style="flex:1")+
 panel("Data residency", '<div class="pad"><div class="kv"><span class="mut">Grand Meridian</span><b>me-central-1</b></div>'
   '<div class="kv"><span class="mut">Harbour Point · Cedar House</span><b>eu-west-1</b></div>'
   '<div class="kv"><span class="mut">Guest-linked retention</span><b>13 months, then de-identified</b></div>'
   '<div class="kv"><span class="mut">Erasure requests</span><b>2 completed this year</b></div>'
   '<div class="note" style="margin-top:10px"><b>A property cannot span regions.</b> Corporate views work across them '
   'without relocating guest-identifying data (PRD DG-4, FR-76).</div></div>', style="flex:1")+
 '</div></div></div>'))

W.append(("W26","Admin · Audit log",
 "Every state change with actor, timestamp and previous value — immutable, exportable, and the reason a brand audit or a disputed comp is a lookup rather than an argument. Configuration changes sit in the same stream as operational ones, because the question is usually why a target changed.",
 nav("Audit log",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Audit log", '<span class="btn sec sm">Export range</span>')+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">Today</span><span class="chip">Configuration</span>'
 '<span class="chip">Access</span><span class="chip">Recoveries</span><span class="chip">Overrides</span>'
 '<span class="chip">Room status</span></div><div class="search" style="width:230px">Actor, record or room</div></div>'+
 panel("", table(
   [("Time","n"),("Actor",""),("Action",""),("Record","n"),("Before → after",""),("Source","")],
   [("",[("11:52:41","n"),('<span class="av">DO</span>D. Okafor',""),("Recovery submitted for approval",""),(num("GL-0412"),"n"),
        ("— → USD 320 pending",""),("Console","")]),
    ("hot",[("11:31:08","n"),('<span class="av">AR</span>A. Rivera',""),("<b>Inspection override — passed without re-check</b>",""),
        (num("1206"),"n"),("Rejected → Inspected",""),("Console","")]),
    ("",[("11:14:02","n"),('<span class="av">AR</span>A. Rivera',""),("Room status set",""),(num("1206"),"n"),
        ("Clean → Rejected",""),("Console","")]),
    ("",[("10:41:55","n"),('<span class="av">RS</span>R. Santos',""),("Discrepancy filed — occupied, shown vacant",""),
        (num("1211"),"n"),("No change to occupancy",""),("Mobile · queued 10:38","")]),
    ("",[("09:14:20","n"),('<span class="av">TK</span>T. Kabir',""),("Catalog entry changed",""),("Lamp not working",""),
        ("Complete 45 → 60 min",""),("Console","")]),
    ("",[("08:52:11","n"),('<span class="av">TK</span>T. Kabir',""),("Access granted",""),("M. Ortiz",""),
        ("— → Harbour Point · Engineer",""),("Console","")]),
    ("",[("08:10:04","n"),('<span class="av">⇄</span>Jazz Core',""),("Occupancy conflict resolved",""),(num("0812"),"n"),
        ("Vacant → Occupied",""),("Jazz Core authoritative","")])]),
   em="1,284 entries today")+
 '<div class="note">Entries are immutable and retained per the tenant\'s retention setting. Overrides are highlighted because '
 'they are the entries an auditor asks about first — an inspection passed without a re-check is legitimate and also worth explaining.</div>'
 '</div></div>'))

# ================= CREATE / EDIT FLOWS =================

W.append(("W27","Admin · Invite a user — or create one who has no email",
 "Two intake paths on one screen, because most of this workforce has no work email. An invite goes to a manager by email; a room attendant gets a PIN account created directly, with a printable slip instead of a mailbox. Access is granted per property here, so nobody lands in the tenant with nothing to do.",
 nav("Users",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Users")+
 '<div class="content">'+panel("", table([("User",""),("Access",""),("Roles by property",""),("Last active","n")],
   [("",[('<span class="av">AR</span><b>Ana Rivera</b>',""),(pill("ok","✓","SSO"),""),('<span class="tag">Grand Meridian · Supervisor</span>',""),("2 min ago","n")]),
    ("",[('<span class="av">RS</span><b>Rosa Santos</b>',""),(pill("flat","○","PIN"),""),('<span class="tag">Grand Meridian · Room Attendant</span>',""),("14 min ago","n")])]))+
 '</div></div>'
 '<div class="modal"><div class="sheet"><div class="mh"><h2>Add a person</h2><span class="x">✕</span></div>'
 '<div class="mb">'
 '<div class="seg"><div class="on">Invite by email</div><div>Create a PIN account</div></div>'
 '<div class="form">'
 '<div class="f"><label>Full name</label><div class="in">Priya Raman</div></div>'
 '<div class="f"><label>Work email</label><div class="in">p.raman@grandmeridian.com</div></div>'
 '<div class="f"><label>Language</label><div class="in">English ▾</div></div>'
 '<div class="f"><label>Employee ref (optional)</label><div class="in mut">GM-4482</div></div>'
 '</div>'
 '<div><label class="hint" style="font-weight:700">Access — at least one property and role</label>'
 + table([("Property",""),("Role",""),("Skills",""),("",""),],
   [("",[("<b>Grand Meridian</b>",""),("Supervisor ▾",""),('<span class="tag">Inspection</span>',""),('<span class="btn sec sm">Remove</span>',"")]),
    ("",[('<span class="hint">Add another property…</span>',""),("",""),("",""),('<span class="btn sec sm">Add</span>',"")])])+
 '</div>'
 '<div class="note">This person will authenticate through <b>Jazzware SSO</b> — JazzTicketing never sets or stores their password. '
 'They appear as <b>Invited</b> until first sign-in, and an unaccepted invite expires in 14 days.</div>'
 '<div class="note" style="border-inline-start:3px solid var(--due)"><b>Creating a PIN account instead?</b> Switch the tab above. '
 'PIN accounts have no email, no console access and no password — they exist only on shared handsets, and you print a slip with '
 'the PIN rather than sending anything.</div>'
 '</div>'
 '<div class="mf"><span class="btn sec">Cancel</span><span class="btn">Send invite</span></div></div></div>'))

W.append(("W28","Admin · Roster import — the mapping step",
 "The step that decides whether an import is useful or a mess. Columns are mapped explicitly rather than guessed, every row is validated before anything is written, and the errors are shown as rows to fix rather than a count. Nothing is created until the preview is accepted.",
 nav("Users",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Import roster")+
 '<div class="content">'
 '<div class="steps" style="background:var(--surface-raised);border:1px solid var(--hairline);border-radius:var(--r-md);padding:4px 14px">'
 '<div><span class="ic2 done">✓</span><div><b>File uploaded</b><span>roster-september.csv · 154 rows · comma-delimited</span></div></div>'
 '<div><span class="ic2 now">2</span><div><b>Map the columns</b><span>Six mapped, two skipped, one unmatched</span></div></div>'
 '<div><span class="ic2">3</span><div><b>Review and confirm</b><span>Nothing is created until you accept the preview</span></div></div>'
 '</div>'
 '<div class="row">'+
 panel("Column mapping", '<div class="pad" style="display:flex;flex-direction:column;gap:9px">'
   '<div class="map"><div class="src2">Employee Name</div><div class="arw">→</div><div class="dst">Full name</div></div>'
   '<div class="map"><div class="src2">Email</div><div class="arw">→</div><div class="dst">Work email</div></div>'
   '<div class="map"><div class="src2">Dept</div><div class="arw">→</div><div class="dst">Department</div></div>'
   '<div class="map"><div class="src2">Position</div><div class="arw">→</div><div class="dst">Role ▾</div></div>'
   '<div class="map"><div class="src2">Hotel</div><div class="arw">→</div><div class="dst">Property</div></div>'
   '<div class="map"><div class="src2">Pref Lang</div><div class="arw">→</div><div class="dst">Language</div></div>'
   '<div class="map"><div class="src2">Payroll ID</div><div class="arw">→</div><div class="dst skip">Skip — not imported</div></div>'
   '<div class="map"><div class="src2">DOB</div><div class="arw">→</div><div class="dst skip">Skip — not imported</div></div>'
   '<div class="note" style="margin-top:4px">Payroll and date-of-birth columns are refused, not optional: JazzTicketing holds '
   'no payroll or personal-identity data (DG-1). Unmapped columns are dropped, never stored “just in case”.</div>'
   '</div>', em="8 columns in file", style="flex:1")+
 panel("Validation", '<div class="pad">'
   '<div class="kv"><span class="mut">Rows ready to create</span><b>146</b></div>'
   '<div class="kv"><span class="mut">Already exist — will update access</span><b>5</b></div>'
   '<div class="kv"><span class="mut">Rows with problems</span><b style="color:var(--breach)">3</b></div>'
   '<div class="kv"><span class="mut">PIN accounts (no email)</span><b>118</b></div>'
   + table([("Row","n"),("Problem",""),("Fix","")],
   [("hot",[("41","n"),("Role “Floor Sup.” not recognised",""),("Map to Supervisor ▾","")]),
    ("hot",[("88","n"),("Duplicate email — a.rivera@…",""),("Update existing ▾","")]),
    ("hot",[("132","n"),("Property “Cedar Hse” not found",""),("Cedar House ▾","")])])+
   '<div class="note" style="margin-top:10px">Fix the three rows here or import the other 151 and handle these by hand. '
   'A partial import is a normal outcome, not a failure.</div></div>', em="3 to resolve", style="flex:1")+
 '</div>'
 '<div class="row" style="align-items:center"><span class="btn">Continue to preview</span><span class="btn sec">Import 151, skip 3</span>'
 '<span class="btn sec">Start over</span><span class="hint" style="margin-inline-start:auto">Import is recorded in the audit log with the file name and row count.</span></div>'
 '</div></div>'))

W.append(("W29","Admin · New role — with the guard that matters",
 "Tenant admins can now define roles, which means they can also lock themselves out or hand out more than they hold. Two guards are built in rather than trusted to care: a permission cannot be granted if it depends on one that is off, and no administrator can grant a role a permission they do not themselves have. The blast radius is stated before saving.",
 nav("Roles",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Roles")+
 '<div class="content">'+panel("", table([("Role",""),("Users","n"),("Type","")],
   [("",[("<b>Supervisor</b>",""),("14","n"),(pill("flat","○","Shipped"),"")]),
    ("",[("<b>Duty manager</b>",""),("4","n"),(pill("flat","○","Shipped"),"")])]))+
 '</div></div>'
 '<div class="modal"><div class="sheet" style="width:780px"><div class="mh"><h2>New role</h2>'
 '<span class="pill p-flat">Tenant · Meridian Group</span><span class="x">✕</span></div>'
 '<div class="mb">'
 '<div class="form"><div class="f"><label>Role name</label><div class="in">Night Duty Supervisor</div></div>'
 '<div class="f"><label>Start from</label><div class="in">Supervisor ▾ <span class="hint">copies its permissions as a starting point</span></div></div></div>'
 '<div class="row" style="gap:11px">'
 '<div class="perm" style="flex:1"><div class="ph">Jobs</div>'
 '<div class="pr"><span class="lbl">Accept and work jobs</span><span class="sw2 on"><i></i></span></div>'
 '<div class="pr"><span class="lbl">Assign and reassign</span><span class="sw2 on"><i></i></span></div>'
 '<div class="pr"><span class="lbl">Cancel a job<em>Requires: assign and reassign</em></span><span class="sw2 on"><i></i></span></div>'
 '<div class="pr"><span class="lbl">Change a job\'s department</span><span class="sw2"><i></i></span></div>'
 '<div class="ph">Rooms</div>'
 '<div class="pr"><span class="lbl">Inspect rooms</span><span class="sw2 on"><i></i></span></div>'
 '<div class="pr"><span class="lbl">Override an inspection<em>Requires: inspect rooms · logged in the audit trail</em></span><span class="sw2 on"><i></i></span></div>'
 '<div class="pr"><span class="lbl">Set out of order</span><span class="sw2 on"><i></i></span></div>'
 '</div>'
 '<div class="perm" style="flex:1"><div class="ph">Recovery</div>'
 '<div class="pr"><span class="lbl">Log a glitch</span><span class="sw2 on"><i></i></span></div>'
 '<div class="pr"><span class="lbl">Approve recovery<em>Threshold</em></span><div class="in" style="padding:4px 8px;font-size:12.5px">USD 150 ▾</div></div>'
 '<div class="ph">Administration</div>'
 '<div class="pr"><span class="lbl">Change configuration</span><span class="sw2"><i></i></span></div>'
 '<div class="pr"><span class="lbl">Manage users and access<em style="color:var(--breach)">You do not hold this permission — you cannot grant it</em></span>'
 '<span class="sw2 lk"><i></i></span></div>'
 '<div class="ph">Guest data</div>'
 '<div class="pr"><span class="lbl">See guest identity in lists</span><span class="sw2 on"><i></i></span></div>'
 '<div class="pr"><span class="lbl">See other properties<em>Corporate scope only</em></span><span class="sw2 lk"><i></i></span></div>'
 '</div></div>'
 '<div class="note"><b>Blast radius.</b> Nobody is affected until this role is assigned; each holder then gains 11 permissions '
 'and a USD 150 approval limit, enforced server-side.</div>'
 '</div>'
 '<div class="mf"><span class="btn sec">Cancel</span><span class="btn">Create role</span></div></div></div>'))

W.append(("W30","Admin · Duplicate a role — as a diff",
 "Duplicating is how a shipped role gets adapted without touching the original. The screen shows the difference rather than the whole list, because what an administrator needs to check is what changed — and it states plainly that the copy will not inherit later changes to its source.",
 nav("Roles",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Roles")+
 '<div class="content">'+panel("", table([("Role",""),("Users","n"),("Type","")],
   [("sel",[("<b>Supervisor</b>",""),("14","n"),(pill("flat","○","Shipped"),"")]),
    ("",[("<b>Engineer</b>",""),("9","n"),(pill("flat","○","Shipped"),"")])]))+
 '</div></div>'
 '<div class="modal"><div class="sheet"><div class="mh"><h2>Duplicate “Supervisor”</h2><span class="x">✕</span></div>'
 '<div class="mb">'
 '<div class="form"><div class="f"><label>New role name</label><div class="in">Supervisor — Night</div></div>'
 '<div class="f"><label>Scope</label><div class="in">Tenant ▾ <span class="hint">available at every property</span></div></div></div>'
 '<div><label class="hint" style="font-weight:700">Changes from Supervisor</label>'
 + table([("Permission",""),("Supervisor",""),("This role",""),("",""),],
   [("",[("Approve recovery",""),("<span class='mx n'>—</span>",""),('<span class="mx y">USD 150</span>',""),(pill("ok","✓","Added"),"")]),
    ("",[("Set out of order",""),("<span class='mx y'>✓</span>",""),("<span class='mx y'>✓</span>",""),("<span class='hint'>Unchanged</span>","")]),
    ("hot",[("Inspect rooms",""),("<span class='mx y'>✓</span>",""),("<span class='mx n'>—</span>",""),(pill("breach","▲","Removed"),"")]),
    ("",[("Change configuration",""),("<span class='mx n'>—</span>",""),("<span class='mx n'>—</span>",""),("<span class='hint'>Unchanged</span>","")])])+
 '<div class="hint" style="margin-top:6px">2 changes · 32 permissions identical</div></div>'
 '<div class="note"><b>The copy is independent from the moment it is created.</b> Later changes to Supervisor do not flow into it. '
 'If what you want is one setting different everywhere, change Supervisor instead of duplicating it — two roles that drift apart '
 'is the most common mess in a permissions model.</div>'
 '</div>'
 '<div class="mf"><span class="btn sec">Cancel</span><span class="btn">Create duplicate</span></div></div></div>'))

W.append(("W31","Admin · Add a property",
 "Three of these fields are effectively permanent, so the form says which. Region decides data residency and cannot be changed afterwards without a migration; the Jazz Core link decides whether the property can operate at all. Everything else inherits from tenant defaults and can be overridden later.",
 nav("Properties",{"Dispatch":"18"})+
 '<div class="main">'+top("Administration · Meridian Group")+
 '<div class="content">'+panel("", table([("Property",""),("Region",""),("Rooms","n"),("Jazz Core","")],
   [("",[("<b>Grand Meridian</b>",""),("ME · me-central-1",""),("240","n"),(pill("ok","✓","Connected"),"")]),
    ("",[("<b>Harbour Point</b>",""),("EU · eu-west-1",""),("96","n"),(pill("ok","✓","Connected"),"")])]))+
 '</div></div>'
 '<div class="modal"><div class="sheet"><div class="mh"><h2>Add a property</h2>'
 '<span class="pill p-flat">Meridian Group</span><span class="x">✕</span></div>'
 '<div class="mb">'
 '<div class="form">'
 '<div class="f"><label>Property name</label><div class="in">Cedar House</div></div>'
 '<div class="f"><label>Short code</label><div class="in">CDH <span class="hint">used in exports and job references</span></div></div>'
 '<div class="f"><label>Region — permanent</label><div class="in">EU · eu-west-1 ▾</div></div>'
 '<div class="f"><label>Timezone</label><div class="in">Europe/Amsterdam ▾</div></div>'
 '<div class="f"><label>Rooms</label><div class="in">240</div></div>'
 '<div class="f"><label>Jazz Core property ID — permanent</label><div class="in">JC-NL-0114</div></div>'
 '</div>'
 '<div><label class="hint" style="font-weight:700">Departments</label>'
 '<div class="chips" style="margin-top:6px"><span class="chip on">Housekeeping</span><span class="chip on">Engineering</span>'
 '<span class="chip on">Front office</span><span class="chip">F&amp;B</span><span class="chip">Security</span><span class="chip">Spa</span></div></div>'
 '<div><label class="hint" style="font-weight:700">Inherit from tenant defaults</label>'
 '<div class="chips" style="margin-top:6px"><span class="chip on">42 catalog entries</span><span class="chip on">SLA sets</span>'
 '<span class="chip on">4 escalation chains</span><span class="chip on">Credit rules</span><span class="chip on">Checklists</span></div></div>'
 '<div class="note" style="border-inline-start:3px solid var(--due)"><b>Region and Jazz Core ID cannot be changed later.</b> '
 'Region is a data-residency commitment (DG-4) and moving it means migrating guest-linked records between regions. '
 'The Jazz Core ID is how every room and stay is matched — a wrong one is not a typo, it is a different hotel.</div>'
 '</div>'
 '<div class="mf"><span class="btn sec">Cancel</span><span class="btn">Create and start setup</span></div></div></div>'))

W.append(("W32","Admin · Continue setup",
 "Onboarding as a checklist with an honest distinction: what blocks going live, what merely improves the launch, and what is optional. Time-to-first-job is the metric this product is sold on, so the screen shows what is actually in the way rather than a percentage.",
 nav("Properties",{"Dispatch":"18"})+
 '<div class="main">'+top("Cedar House · Setup", '<span class="btn sec sm">Invite the property admin</span>')+
 '<div class="content">'
 '<div class="row" style="align-items:center">'
 '<div style="flex:1"><div class="bar2"><i style="width:40%"></i></div>'
 '<div class="hint" style="margin-top:6px">4 of 10 steps · <b>2 blocking items remain</b> · created 28 Aug</div></div>'
 '<span class="pill p-due"><span class="gl">●</span>Not live</span></div>'
 '<div class="row">'+
 panel("Blocking — the property cannot go live", '<div class="pad"><div class="steps">'
   '<div><span class="ic2 blk">▲</span><div><b>Verify Jazz Core capabilities</b>'
   '<span>Room status and stay events confirmed. Call events not yet reported — dispatch pre-resolution will be absent.</span></div>'
   '<span class="act"><span class="btn sm">Verify now</span></span></div>'
   '<div><span class="ic2 blk">▲</span><div><b>Load rooms and locations</b>'
   '<span>0 of 240 rooms. Comes from Jazz Core master data — or CSV if this property is not authoritative there.</span></div>'
   '<span class="act"><span class="btn sm">Import</span></span></div>'
   '</div></div>', em="2 items", style="flex:1")+
 panel("Recommended before go-live", '<div class="pad"><div class="steps">'
   '<div><span class="ic2 done">✓</span><div><b>Departments and roles</b><span>3 departments · inherited role set</span></div></div>'
   '<div><span class="ic2 done">✓</span><div><b>Catalog and SLA</b><span>42 entries inherited · no overrides yet</span></div></div>'
   '<div><span class="ic2 now">3</span><div><b>Load the staff roster</b><span>0 of ~60 expected · PIN accounts for line staff</span></div>'
   '<span class="act"><span class="btn sec sm">Import</span></span></div>'
   '<div><span class="ic2">4</span><div><b>Capture the pre-launch baseline</b>'
   '<span>Without it, improvement cannot be claimed (RO-2). Ask for historical response data or accept the first 30 days as the reference.</span></div>'
   '<span class="act"><span class="btn sec sm">Set up</span></span></div>'
   '<div><span class="ic2">5</span><div><b>Escalation contacts</b><span>Chains inherited; the people in them are not</span></div>'
   '<span class="act"><span class="btn sec sm">Assign</span></span></div>'
   '</div></div>', em="5 items", style="flex:1.15")+
 '</div>'
 '<div class="row">'+
 panel("Optional", '<div class="pad"><div class="steps">'
   '<div><span class="ic2">—</span><div><b>Per-floor layouts for the plan view</b>'
   '<span>FR-80 · 12 floors to enter. The grid works without this; only the plan view needs it.</span></div>'
   '<span class="act"><span class="btn sec sm">Later</span></span></div>'
   '<div><span class="ic2">—</span><div><b>Property overrides</b><span>Tenant defaults are fine to launch on</span></div></div>'
   '<div><span class="ic2">—</span><div><b>SMS channel</b><span>Off by default · per-property cost</span></div></div>'
   '</div></div>', em="3 items", style="flex:1")+
 panel("What happens at go-live", '<div class="pad">'
   '<div class="kv"><span class="mut">Rooms become sellable in JazzTicketing</span><b>From Jazz Core</b></div>'
   '<div class="kv"><span class="mut">Staff can sign in</span><b>PIN and SSO</b></div>'
   '<div class="kv"><span class="mut">SLA clocks start</span><b>On the first job</b></div>'
   '<div class="kv"><span class="mut">Reporting baseline</span><b>Locked at go-live</b></div>'
   '<div class="note" style="margin-top:10px">Go-live is a deliberate action, not a side effect of finishing the list — '
   'a property that looks configured is not necessarily a property whose staff have been trained.</div>'
   '<div style="margin-top:12px"><span class="btn" style="opacity:.5">Take live · 2 blockers</span></div></div>', style="flex:1")+
 '</div></div></div>'))

W.append(("W33","Admin · Property detail",
 "The hub a property administrator actually lives in: what this property has overridden, who can see it, whether its dependency is healthy, and the governance settings that are per-property rather than per-tenant. Everything here is a link to the surface that owns it — this screen holds no settings of its own.",
 nav("Properties",{"Dispatch":"18"})+
 '<div class="main">'+top("Grand Meridian", '<span class="btn sec sm">Open operations</span><span class="btn sec sm">Deactivate</span>')+
 '<div class="content">'
 '<div class="kpis" style="grid-template-columns:repeat(6,1fr)">'+
 kpi("Rooms","240","5 departments")+kpi("Users","96","74 line staff")+kpi("Live since","04 Aug","29 days")+
 kpi("Config overrides","14","of 42 entries")+kpi("Jazz Core",'Healthy',"p95 4.1s")+kpi("Region","me-central-1","ME · permanent")+'</div>'
 '<div class="row">'+
 panel("Configuration — what this property has changed", table(
   [("Area",""),("State",""),("Last changed","n"),("",""),],
   [("",[("Request catalog",""),("<b>14 overrides</b> · 28 inherited",""),("28 Aug · T. Kabir","n"),('<span class="btn sec sm">Open</span>',"")]),
    ("",[("SLA and pauses",""),("Property set for 3 departments",""),("21 Aug · T. Kabir","n"),('<span class="btn sec sm">Open</span>',"")]),
    ("",[("Escalation chains",""),("Inherited · contacts assigned",""),("12 Aug","n"),('<span class="btn sec sm">Open</span>',"")]),
    ("",[("Credit rules",""),("Property values",""),("04 Aug","n"),('<span class="btn sec sm">Open</span>',"")]),
    ("",[("Inspection checklists",""),("5 checklists · 2 property-specific",""),("18 Aug","n"),('<span class="btn sec sm">Open</span>',"")]),
    ("",[("Floor layouts",""),("<span class='hint'>12 of 15 floors entered</span>",""),("26 Aug","n"),('<span class="btn sec sm">Open</span>',"")])]),
   style="flex:1.3")+
 panel("Access and governance", '<div class="pad">'
   '<div class="kv"><span class="mut">Property administrators</span><b>2 · A. Rivera, T. Kabir</b></div>'
   '<div class="kv"><span class="mut">Corporate viewers</span><b>3 · no guest identity</b></div>'
   '<div class="kv"><span class="mut">Cross-property guest history</span><b>Off</b></div>'
   '<div class="kv"><span class="mut">Guest-linked retention</span><b>13 months</b></div>'
   '<div class="kv"><span class="mut">Erasure requests</span><b>1 completed</b></div>'
   '<div class="kv"><span class="mut">Aggregate-only reporting</span><b>Off</b></div>'
   '<div class="note" style="margin-top:10px">Aggregate-only hides individual staff performance where a works council or '
   'local law requires it. It costs nothing to leave available and is expensive to retrofit (DG-5).</div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn sec sm">Manage access</span>'
   '<span class="btn sec sm">Audit log</span></div></div>', style="flex:1")+
 '</div></div></div>'))

# ================= TENANT LAYER =================

W.append(("W34","Admin · Tenant settings",
 "Everything a property inherits until it overrides it, plus the governance decisions that belong to the group rather than to any one hotel: identity, retention, erasure, and whether guest history crosses properties. Each row states how many properties currently inherit it, because that is the blast radius of changing it.",
 nav("Properties",{"Dispatch":"18"}).replace('>Properties<','>Tenant &amp; properties<')+
 '<div class="main">'+top("Meridian Group · Tenant settings", '<span class="btn sec sm">View audit log</span>')+
 '<div class="content">'
 '<div class="row"><div class="seg"><div class="on">Tenant</div><div>Properties 3</div><div>Defaults</div><div>Identity</div>'
 '<div>Governance</div><div>Billing</div></div>'
 '<span class="hint" style="margin-inline-start:auto">Changes here reach every property that has not overridden them.</span></div>'
 '<div class="row">'+
 panel("Identity of the tenant", '<div class="pad"><div class="form">'
   '<div class="f"><label>Tenant name</label><div class="in">Meridian Group</div></div>'
   '<div class="f"><label>Short code</label><div class="in">MRD <span class="hint">prefixes exports and job references</span></div></div>'
   '<div class="f"><label>Type</label><div class="in">Management company ▾</div></div>'
   '<div class="f"><label>Primary contact</label><div class="in">n.karam@meridiangroup.com</div></div>'
   '<div class="f"><label>Regions in use</label><div class="in mut">eu-west-1 · me-central-1 <span class="hint">set per property</span></div></div>'
   '<div class="f"><label>Default language</label><div class="in">English ▾</div></div>'
   '</div>'
   '<div class="note" style="margin-top:12px">A tenant may span regions; a property may not. Regions appear here as a summary — '
   'they are chosen when a property is created and are permanent from that point (DG-4).</div></div>', style="flex:1")+
 panel("Single sign-on", '<div class="pad">'
   '<div class="health" style="margin-bottom:12px"><span class="dot ok"></span><div><b>Connected · OIDC</b>'
   '<div class="hint">Jazzware identity · 61 users authenticate this way</div></div></div>'
   '<div class="kv"><span class="mut">Protocol</span><b>OIDC · SAML 2.0 also supported</b></div>'
   '<div class="kv"><span class="mut">Domains claimed</span><b>meridiangroup.com · grandmeridian.com</b></div>'
   '<div class="kv"><span class="mut">Just-in-time provisioning</span><b>Off — access is granted explicitly</b></div>'
   '<div class="kv"><span class="mut">Deprovisioning</span><b>Access ends at next token validation</b></div>'
   '<div class="note" style="margin-top:10px">JIT provisioning stays off by default. A person who can authenticate is not '
   'automatically a person who should see a property — access is a separate, deliberate grant (FR-2, FR-3).</div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn sec sm">Test connection</span>'
   '<span class="btn sec sm">Rotate secret</span></div></div>', style="flex:1")+
 '</div>'
 '<div class="row">'+
 panel("Defaults every property inherits", table(
   [("Default",""),("Value",""),("Inherited by","n"),("",""),],
   [("",[("Request catalog",""),("42 entries",""),("2 of 3 properties","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("SLA sets",""),("5 departments",""),("1 of 3","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("Escalation chains",""),("4 chains",""),("3 of 3","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("Credit rules",""),("Departure 1.5 · stayover 1.0",""),("2 of 3","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("Inspection checklists",""),("5 checklists",""),("2 of 3","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("Roles",""),("7 shipped · 1 custom",""),("3 of 3","n"),('<span class="btn sec sm">Edit</span>',"")]),
    ("",[("Approval thresholds",""),("Duty manager USD 150",""),("3 of 3","n"),('<span class="btn sec sm">Edit</span>',"")])]),
   em="a property that overrides stops inheriting", style="flex:1.25")+
 panel("Governance", '<div class="pad">'
   '<div class="kv"><span class="mut">Guest-linked retention</span><b>13 months</b></div>'
   '<div class="kv"><span class="mut">Then</span><b>Identifiers removed, record kept</b></div>'
   '<div class="kv"><span class="mut">Audit retention</span><b>7 years</b></div>'
   '<div class="kv"><span class="mut">Cross-property guest history</span><b>Off</b></div>'
   '<div class="kv"><span class="mut">Aggregate-only reporting</span><b>Per property</b></div>'
   '<div class="kv"><span class="mut">Erasure requests</span><b>2 completed · 0 open</b></div>'
   '<div class="warnstrip" style="margin-top:12px"><span>▲</span><div><b>Cross-property guest history is off.</b> '
   'Turning it on lets one hotel see a guest\'s glitches at another. It is a lawful-basis decision, not a feature toggle — '
   'and switching it is recorded in the audit trail with your name on it.</div></div>'
   '<div style="margin-top:12px"><span class="btn sec sm">Erasure request</span></div></div>', style="flex:1")+
 '</div></div></div>'))

W.append(("W35","Jazzware operations · Provision a tenant",
 "A different audience and deliberately a different-looking surface. Tenants are commercial customers, so creating one is a Jazzware function — not something a hotel administrator can reach. This is the screen FR-1 actually describes, and it does not live in the product a hotel logs into.",
 nav("Housekeeping",{}).replace('class="nav"','class="nav op"')
   .replace('Jazz<i>Ticketing</i>','Jazz<i>ware</i> Ops<span class="opbadge">internal</span>')
   .replace(">Dispatch<",">Tenants<").replace(">Housekeeping<",">Provisioning<").replace(">Engineering<",">Jazz Core orgs<")
   .replace(">Incidents<",">Support access<").replace(">Dashboard<",">Fleet health<").replace(">Reports<",">Usage<")
   .replace(">Configuration<",">Platform config<").replace(">Jazz Core<",">Regions<")
   .replace("OPERATIONS","CUSTOMERS").replace("INSIGHT","FLEET").replace("SETUP","PLATFORM")
   .replace("ADMINISTRATION","INTERNAL").replace(">Users<",">Staff<").replace(">Roles<",">Internal roles<")
   .replace(">Tenant &amp; properties<",">Audit<").replace(">Audit log<",">Change log<")
   .replace("Grand Meridian · 240 rooms<br>Shift 07:00–15:00","Jazzware · 41 tenants<br>197 properties live")+
 '<div class="main">'+top("Provisioning · New tenant", '', "Jazzware internal ▾", "Search tenants, properties, orgs")+
 '<div class="content">'
 '<div class="warnstrip"><span>▲</span><div><b>This surface is not part of the hotel product.</b> Creating a tenant creates a '
 'commercial customer and its first administrator. No hotel-side role can reach this screen — PRD FR-1 says '
 '“an administrator”, which conflates two different actors, and this is the one it means.</div></div>'
 '<div class="row">'+
 panel("New tenant", '<div class="pad"><div class="form">'
   '<div class="f"><label>Legal name</label><div class="in">Cedar Hospitality B.V.</div></div>'
   '<div class="f"><label>Display name</label><div class="in">Cedar Hospitality</div></div>'
   '<div class="f"><label>Short code — permanent</label><div class="in">CDH</div></div>'
   '<div class="f"><label>Type</label><div class="in">Independent group ▾</div></div>'
   '<div class="f"><label>Home region</label><div class="in">eu-west-1 ▾ <span class="hint">properties may differ</span></div></div>'
   '<div class="f"><label>Jazz Core organisation</label><div class="in">JC-ORG-0442 ▾</div></div>'
   '</div>'
   '<div style="margin-top:14px"><label class="hint" style="font-weight:700">Commercial</label>'
   '<div class="form" style="margin-top:6px">'
   '<div class="f"><label>Model</label><div class="in">Bundled into Jazzware contract ▾</div></div>'
   '<div class="f"><label>Contract reference</label><div class="in">JZW-2027-0118</div></div></div>'
   '<div class="note" style="margin-top:10px">JazzTicketing is bundled rather than separately priced, so there is no per-room '
   'metering to configure here — the contract reference is what reporting attaches to.</div></div>'
   '<div style="margin-top:14px"><label class="hint" style="font-weight:700">First administrator</label>'
   '<div class="form" style="margin-top:6px">'
   '<div class="f"><label>Name</label><div class="in">Sanne de Vries</div></div>'
   '<div class="f"><label>Email</label><div class="in">s.devries@cedarhospitality.nl</div></div></div>'
   '<div class="note" style="margin-top:10px">They receive a tenant-administrator invite and take it from there: properties, '
   'defaults, identity and access are all theirs to configure. Jazzware does not enter a customer\'s properties for them.</div></div>'
   '</div>', style="flex:1.15")+
 panel("What gets created", '<div class="pad"><div class="steps">'
   '<div><span class="ic2 done">✓</span><div><b>Tenant record</b><span>Cedar Hospitality · CDH · eu-west-1</span></div></div>'
   '<div><span class="ic2 done">✓</span><div><b>Shipped role set</b><span>7 roles, unmodified</span></div></div>'
   '<div><span class="ic2 done">✓</span><div><b>Platform defaults</b><span>42 catalog entries · 5 SLA sets · 4 chains · credit rules · 5 checklists</span></div></div>'
   '<div><span class="ic2 done">✓</span><div><b>Tenant administrator invite</b><span>Sent to s.devries@cedarhospitality.nl</span></div></div>'
   '<div><span class="ic2">—</span><div><b>Properties</b><span>None — the customer creates their own</span></div></div>'
   '<div><span class="ic2">—</span><div><b>Identity provider</b><span>Not connected — the customer connects theirs</span></div></div>'
   '</div>'
   '<div class="warnstrip" style="margin-top:14px"><span>▲</span><div><b>Support access is separate and time-boxed.</b> '
   'Provisioning a tenant grants Jazzware no standing access to their data. A support engineer who needs to look requests '
   'access, it expires, and every entry is in the customer\'s own audit log.</div></div>'
   '<div style="margin-top:14px;display:flex;gap:9px"><span class="btn">Create tenant</span><span class="btn sec">Save draft</span></div>'
   '</div>', style="flex:1")+
 '</div></div>', False, False, "ops.jazzware.internal/provisioning/new"))

# ================= GAPS FOUND BY THE PRD COVERAGE AUDIT =================

W.append(("W36","Front office · Guest follow-up",
 "FR-15 had no surface. A closed job is not a finished one until somebody asked the guest, and this is the queue that makes that a task rather than a good intention. A dissatisfied answer becomes a Glitch here, which is how the recovery record starts with a cause attached.",
 nav("Dispatch",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Dispatch · Follow-up")+
 strip("Guest details are not available right now — last exchange with Jazz Core 09:14. Follow-up is still recordable.","⇄")+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">Awaiting follow-up 6</span>'
 '<span class="chip">Repeat requests 2</span><span class="chip">VIP 1</span><span class="chip">Done today 24</span></div>'
 '<span class="hint">Prompted per catalog entry · window 30 min after closure</span></div>'+
 panel("", table(
   [("Room","n"),("What was asked",""),("Closed","n"),("By",""),("Flags",""),("Follow-up","")],
   [("hot",[(num("1518"),"n"),("Hot / cold <b>3rd time this stay</b>",""),("11:31","n"),("M. Ortiz",""),
        (pill("breach","▲","Repeat · VIP"),""),('<span class="btn sm">Call guest</span>',"")]),
    ("",[(num("0812"),"n"),("Lamp not working",""),("11:24","n"),("M. Ortiz",""),("—",""),('<span class="btn sm">Call guest</span>',"")]),
    ("",[(num("0914"),"n"),("Extra towels",""),("11:12","n"),("F. Noor",""),("—",""),('<span class="btn sm">Call guest</span>',"")]),
    ("",[(num("0705"),"n"),("Iron and board",""),("11:04","n"),("F. Noor",""),
        ('<span class="pill p-ok"><span class="gl">✓</span>Satisfied</span>',""),('<span class="hint">A. Kadir 11:09</span>',"")]),
    ("hot",[(num("1109"),"n"),("Minibar restock",""),("10:52","n"),("Queue",""),
        (pill("due","●","Repeat"),""),('<span class="btn sm">Call guest</span>',"")]),
    ("",[(num("0940"),"n"),("Shower draining",""),("10:41","n"),("K. Bello",""),
        ('<span class="pill p-breach"><span class="gl">▲</span>Not satisfied → glitch</span>',""),('<span class="hint">Glitch GL-0411</span>',"")])]),
   em="6 awaiting · 24 done today")+
 '<div class="row">'+
 panel("Recording the follow-up for 1518", '<div class="pad">'
   '<div class="form"><div class="f"><label>Outcome</label><div class="in">Not satisfied ▾</div></div>'
   '<div class="f"><label>Channel</label><div class="in">Call to room ▾</div></div></div>'
   '<div class="f" style="margin-top:12px"><label>What the guest said</label>'
   '<div class="in">Still warm. Third night. Asked to be moved.</div></div>'
   '<div class="note" style="margin-top:12px"><b>Not satisfied opens a Glitch</b> with this Request and its Work Order already '
   'linked as causes — the recovery record starts with the cause attached rather than someone reconstructing it later.</div>'
   '<div style="margin-top:12px;display:flex;gap:9px"><span class="btn">Save and open glitch</span>'
   '<span class="btn sec">Save only</span></div></div>', style="flex:1")+
 panel("Why this queue exists", '<div class="pad">'
   '<div class="kv"><span class="mut">Follow-ups recorded today</span><b>24 of 30 closed</b></div>'
   '<div class="kv"><span class="mut">Dissatisfied</span><b>2 · both became glitches</b></div>'
   '<div class="kv"><span class="mut">Repeat requests caught here</span><b>2</b></div>'
   '<div class="note" style="margin-top:10px">JazzTicketing prompts and records the follow-up; it does not contact the guest. '
   'The channel is whatever the hotel already runs — usually a call to the room (§5, no guest surface in v1).</div></div>', style="flex:1")+
 '</div></div></div>'))

W.append(("W37","Front office · Wake-up calls",
 "FR-55 was specified as visibility and exception handling, and had no screen. Scheduling stays in Jazz Core and the PBX — this is where the front desk sees what is due and, more importantly, what failed. A missed wake-up becomes a priority Job because a guest who missed a flight is a service failure, not a log line.",
 nav("Dispatch",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Dispatch · Wake-up calls", '<div class="seg"><div class="on">Tonight</div><div>Tomorrow</div><div>History</div></div>')+
 '<div class="content">'
 '<div class="kpis" style="grid-template-columns:repeat(4,1fr)">'+
 kpi("Scheduled tonight","31","03:40 – 09:00")+kpi("Delivered","18","all confirmed")+
 kpi("Failed","1","job raised",True)+kpi("VIP","3","flagged on the list")+'</div>'
 '<div class="warnstrip"><span>▲</span><div><b>Jazz Core reports wake-up delivery as degraded at this property.</b> '
 'Scheduled items still arrive; delivery confirmations may lag. Until it clears, treat an unconfirmed 05:00 as unknown '
 'rather than delivered — the list marks them rather than guessing.</div></div>'+
 panel("", table(
   [("Time","n"),("Room","n"),("Guest",""),("Source",""),("State",""),("Then","")],
   [("hot",[("04:15","n"),(num("1204"),"n"),("Mr. J. Alvarez",""),("Front desk",""),
        (pill("breach","▲","Failed — no answer ×3"),""),('<span class="pill p-breach">Job J-2871 raised</span>',"")]),
    ("",[("04:30","n"),(num("0812"),"n"),("Mr. H. Okonkwo · VIP",""),("Guest phone",""),
        (pill("ok","✓","Delivered 04:31"),""),("—","")]),
    ("",[("05:00","n"),(num("1518"),"n"),("Ms. L. Haddad · VIP",""),("Guest phone",""),
        (pill("paused","‖","Unconfirmed"),""),('<span class="hint">Awaiting Jazz Core</span>',"")]),
    ("",[("06:00","n"),(num("0940"),"n"),("Ms. R. Iyer",""),("Front desk",""),
        (pill("flat","○","Scheduled"),""),("—","")]),
    ("",[("06:30","n"),(num("1109"),"n"),("Mr. T. Berg",""),("Guest phone",""),
        (pill("flat","○","Scheduled"),""),("—","")]),
    ("",[("07:00","n"),(num("0705"),"n"),("Ms. A. Costa · VIP",""),("Front desk",""),
        (pill("flat","○","Scheduled"),""),('<span class="hint">Second attempt configured</span>',"")])]),
   em="31 tonight · 6 shown")+
 '<div class="note"><b>JazzTicketing does not schedule wake-ups and cannot place the call.</b> That is a Jazz Core and PBX '
 'function. What lives here is the operational consequence: who is due, what failed, and the priority Job a failure raises '
 'so somebody physically knocks on the door.</div>'
 '</div></div>'))

W.append(("W38","Reports · Glitches and recovery",
 "FR-73 had no surface, which meant the most expensive question a GM asks — what did service failure cost us, and whose — had no answer. Volume by category, attribution by department, root cause, and recovery value, with the linkage back to the jobs that caused it.",
 nav("Reports",{"Dispatch":"18","Incidents":"!3"})+
 '<div class="main">'+top("Reports · Glitches and recovery", '<span class="btn sec sm">Export CSV</span><span class="btn sec sm">PDF</span>')+
 '<div class="content">'
 '<div class="row"><div class="chips" style="flex:1"><span class="chip on">Aug 2026</span><span class="chip">All departments</span>'
 '<span class="chip">All severities</span><span class="chip">Reviewed only</span></div>'
 '<span class="hint">Recovery totals are per currency — no conversion in v1.</span></div>'
 '<div class="kpis" style="grid-template-columns:repeat(5,1fr)">'+
 kpi("Glitches","38","per 100 occ. nights: 1.4")+kpi("Recovery value","USD 4,180","28 recoveries")+
 kpi("Awaiting review","5","older than 7 days",True)+kpi("Repeat-cause glitches","9","same asset or room",True)+
 kpi("Median to recovery","46 min","from glitch logged")+'</div>'
 '<div class="row">'+
 panel("By category", '<div class="pad">'+bars([("Engineering fault",14),("Room not ready",9),("Request unfulfilled",7),
   ("Noise / disturbance",4),("Billing dispute",3),("Other",1)])+
   '<div class="hint" style="margin-top:12px">Engineering faults are 37% of glitches and 52% of recovery value — '
   'the same four assets appear in nine of them.</div></div>', style="flex:1")+
 panel("By department and root cause", table(
   [("Department",""),("Glitches","n"),("Recovery","n"),("Top root cause",""),("Reviewed","n")],
   [("hot",[("Engineering",""),("14","n"),("USD 2,180","n"),("Recurring equipment fault",""),("11 of 14","n")]),
    ("",[("Housekeeping",""),("11","n"),("USD 890","n"),("Room not ready for arrival",""),("11 of 11","n")]),
    ("",[("Front office",""),("7","n"),("USD 740","n"),("Request not passed on",""),("6 of 7","n")]),
    ("",[("F&amp;B",""),("4","n"),("USD 250","n"),("Order not delivered",""),("2 of 4","n")]),
    ("",[("Unattributed",""),("2","n"),("USD 120","n"),("<span class='hint'>Not yet reviewed</span>",""),("0 of 2","n")]),
    ("",[("<b>Property</b>",""),("<b>38</b>","n"),("<b>USD 4,180</b>","n"),("",""),("<b>30 of 38</b>","n")])]),
   style="flex:1.25")+
 '</div>'
 '<div class="row">'+
 panel("Most expensive causes — linked back to their jobs", table(
   [("Cause",""),("Glitches","n"),("Recovery","n"),("Linked jobs","n"),("",""),],
   [("hot",[("Asset FCU-1518 · recurring",""),("3","n"),("USD 640","n"),("5","n"),('<span class="btn sec sm">Open asset</span>',"")]),
    ("hot",[("Lift 2 · repeat fault",""),("2","n"),("USD 420","n"),("4","n"),('<span class="btn sec sm">Open asset</span>',"")]),
    ("",[("Room 1204 · re-clean loop",""),("2","n"),("USD 310","n"),("6","n"),('<span class="btn sec sm">Open room</span>',"")]),
    ("",[("Hot/cold SLA breaches",""),("4","n"),("USD 880","n"),("14","n"),('<span class="btn sec sm">Open jobs</span>',"")])]),
   em="attribution, not blame", style="flex:1")+
 panel("Counter-metric", '<div class="pad">'
   '<div class="kv"><span class="mut">Glitch capture rate</span><b>1.4 per 100 · was 0.4</b></div>'
   '<div class="note" style="margin-top:10px"><b>A rising capture rate is success, not decline.</b> SM-6 expects this number to '
   'go up on introduction because failures are being recorded rather than absorbed. Judge the trend in recovery value per '
   'glitch and in repeat causes — not in the count.</div>'
   '<div class="kv" style="margin-top:12px"><span class="mut">Recovery per glitch</span><b>USD 149 · was 210</b></div>'
   '<div class="kv"><span class="mut">Repeat-cause share</span><b>24% · was 41%</b></div></div>', style="flex:1")+
 '</div></div></div>'))

# ================= ASSEMBLE =================
EV=[("W1","FR-54 guest-call-to-Request · FR-7 create in 15s · FR-8 stay context · FR-16 repeat-request flag · FR-18 open views · UJ-2"),
 ("W2","FR-18 filtered open views · FR-9 routing and supervisor override · FR-36 priority fast path"),
 ("W3","FR-6 audit trail · FR-10 lifecycle · FR-11/FR-14 acceptance window and escalation · FR-13 pauses"),
 ("W4","FR-19 Room Status · FR-27 floor view · FR-28 departure priority · FR-34 OOO · FR-50 status sync via Jazz Core · FR-52 OOO write-back · console half of the Floor split"),
 ("W5","FR-20 Room Assignment and Credits · FR-23 reassignment · FR-25 turndown · FR-5 configuration"),
 ("W6","FR-30 reactive work orders · FR-32 PM Schedules · FR-38 engineering queue · FR-33 recurring flags · FR-39 public-area and back-of-house work"),
 ("W7","FR-31 asset registry and history · FR-33 recurring-fault detection · FR-35 parts · FR-72 asset reporting"),
 ("W8","FR-40 log a Glitch · FR-41 link causes · FR-42 record Recovery · FR-43 approval thresholds · FR-44 root cause"),
 ("W9","FR-45 guest history · FR-16 repeat-request detection · FR-53 stay context and room moves · DG-1 guest data minimisation · UJ-5"),
 ("W10","FR-70 property dashboard · FR-71 against baseline · FR-74 adoption and data-completeness · dataviz: one series + labelled baseline"),
 ("W11","FR-71 SLA reporting with medians and percentiles · FR-75 export · SM-C1..C4 counter-metrics"),
 ("W12","FR-5 property configuration · FR-12 running clocks not rewritten · FR-66 escalation chains · FR-6 audit trail"),
 ("W13","FR-49 connection health · FR-50 propagation latency · FR-56 phone-posted status and minibar events · FR-57 degraded mode · FR-77 contract tolerance · FR-78 capability negotiation · FR-51 conflict authority · FR-79 discrepancies"),
 ("W14","FR-3 corporate SSO · FR-2 role-based access · FR-4 PIN is mobile-only · DG-4 region shown at sign-in"),
 ("W15","NEW FR-80 floor layout and plan view · FR-27 floor view · FR-5 Location configuration · OR-3 onboarding cost"),
 ("W16","FR-9 routing and supervisor override · FR-11 non-acceptance escalation · FR-12 clock survives assignment"),
 ("W17","FR-5 property configuration · FR-7 catalog-driven creation · FR-13 pause conditions · FR-37 closure requirements"),
 ("W18","FR-12 SLA clock · FR-13 pause conditions and ceilings · FR-36 priority fast path · NFR-9 time correctness"),
 ("W19","FR-66 escalation chain configuration · FR-14 breach escalation · FR-68 quiet hours and duty routing"),
 ("W20","FR-24 inspection checklists · FR-5 property configuration · SM-C2 rejected-inspection counter-metric"),
 ("W21","FR-65 notification routing · FR-67 suppression and coalescing · FR-68 quiet hours · SM-C3 volume counter-metric"),
 ("W22","FR-1 tenancy hierarchy · FR-2 roles per property · FR-3 SSO · FR-4 shared-device PIN"),
 ("W23","FR-2 role assignment and server-side enforcement · FR-64 remote sign-out · FR-9 skill-restricted assignment"),
 ("W24","FR-2 role set and permissions · FR-45 cross-property guest history · FR-76 corporate views · DG-1 minimisation"),
 ("W25","FR-1 Tenant and Property hierarchy · DG-2 retention · DG-3 erasure · DG-4 residency · FR-49 connection state"),
 ("W26","FR-6 audit trail · FR-5 attributed configuration changes · FR-51 conflict resolution · FR-79 discrepancies"),
 ("W27","FR-2 role assignment per property · FR-3 SSO invite · FR-4 PIN accounts for line staff · DG-1 minimisation"),
 ("W28","NEW FR-82 roster import with explicit mapping · DG-1 refused columns · FR-6 import recorded in audit"),
 ("W29","NEW FR-81 custom role definition · FR-2 server-side enforcement · privilege-escalation and dependency guards"),
 ("W30","FR-81 role duplication · FR-2 permission model · states that a copy does not inherit later changes"),
 ("W31","FR-1 Tenant and Property hierarchy · DG-4 region is permanent · FR-78 Jazz Core property identity"),
 ("W32","OR-3 onboarding runbook as a surface · SM-1 time to first job · RO-2 baseline capture · FR-80 layouts optional"),
 ("W33","FR-5 property configuration state · FR-45 cross-property history setting · DG-2/DG-3/DG-5 governance per property"),
 ("W34","FR-1 Tenant hierarchy (tenant-admin half) · NEW FR-83 tenant settings and inheritance · FR-3 SSO · FR-45 cross-property history · DG-2/DG-3 retention and erasure"),
 ("W35","FR-1 Tenant creation (vendor half — the actor FR-1 conflates) · FR-5 platform defaults seeded at creation · DG-4 home region"),
 ("W36","FR-15 guest follow-up and conversion to a Glitch · FR-16 repeat flag · FR-57 stale Jazz Core context · FR-40 glitch creation"),
 ("W37","FR-55 wake-up visibility and exception handling · FR-36 priority Job on failure · FR-78 capability degraded"),
 ("W38","FR-73 Glitch and Recovery reporting · FR-44 root cause · FR-41 linked causes · FR-72 asset attribution · SM-6 capture-rate counter-metric"),
 ("W-AR","EXPERIENCE-WEB i18n · numeral-form rule on a dense table · DESIGN.md dark palette")]
rows="".join(f'<tr><td>{i}</td><td>{v}</td></tr>' for i,v in EV)
slots=""
for s in W:
    sid,title,cap,inner = s[0],s[1],s[2],s[3]
    dark = s[4] if len(s)>4 else False
    rtl  = s[5] if len(s)>5 else False
    url  = s[6] if len(s)>6 else "app.jazzticketing.com/dispatch"
    slots+=(f'<section id="{sid}"><div class="cap"><b>{sid} · {title}</b><span>{cap}</span></div>'
            + win(inner,dark,rtl,url) + '</section>')
html=f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JazzTicketing Web Console</title>
<style>{CSS}
body{{margin:0;background:#173238;color:#fff;font:400 14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}}
.page{{max-width:1340px;margin:0 auto;padding:40px 26px 80px}}
.mast{{max-width:860px;margin-bottom:34px}}
.mast h1{{font-size:32px;font-weight:700;letter-spacing:-.02em;margin:0 0 10px}}
.mast p{{color:#A9C2C6;font-size:15.5px;margin:0 0 8px}}
.mast code{{background:rgba(255,255,255,.12);padding:1px 6px;border-radius:5px;font-size:13.5px}}
section{{margin:0 0 44px}}
.cap{{margin:0 0 13px;max-width:900px}}
.cap b{{display:block;font-size:17px;font-weight:650;margin-bottom:4px}}
.cap span{{display:block;font-size:14px;color:#A9C2C6;line-height:1.5}}
.legend{{margin-top:56px;max-width:1100px}}
.legend h3{{font-size:18px;margin:0 0 10px}}
.legend table{{border-collapse:collapse;width:100%;font-size:13.5px;background:rgba(255,255,255,.06);border-radius:10px;overflow:hidden}}
.legend td,.legend th{{padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.12);text-align:start;color:#E7EBF1;vertical-align:top}}
.legend th{{font-weight:650;color:#fff;background:rgba(255,255,255,.07)}}
.legend td:first-child{{font-weight:700;white-space:nowrap}}
</style></head>
<body><div class="page">
<div class="mast"><h1>JazzTicketing — web console</h1>
<p>Thirteen console surfaces plus an Arabic dark variant, sharing <code>DESIGN.md</code> tokens with the mobile app and specified in <code>EXPERIENCE-WEB.md</code>. Generated from <code>.working/gen_web.py</code>.</p>
<p>Same system, different density: mobile is one action per screen in a thumb zone, the console is dense, multi-pane and keyboard-first. State still never rests on colour alone.</p></div>
{slots}
<div class="legend"><h3>What each screen is evidence for</h3><table><tr><th>Screen</th><th>Requirements and spine sections</th></tr>{rows}</table></div>
</div></body></html>"""
open("../mockups/web-key-screens.html","w").write(html)
print("web screens:",len(W),"| bytes:",len(html))
