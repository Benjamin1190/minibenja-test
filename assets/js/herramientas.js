/* MINIBENJA — herramientas (todo se ejecuta en el navegador) */
(function () {
  "use strict";
  var $ = MB.$, F = MB.field, pad = MB.pad;
  function on(root, sel, ev, fn) { MB.$$(sel, root).forEach(function (e) { e.addEventListener(ev, fn); }); }
  function val(root, sel) { return $(sel, root).value; }
  function notice(kind, html) { return '<div class="notice ' + kind + '" role="' + (kind === "error" ? "alert" : "status") + '">' + html + "</div>"; }
  function tabs(items, cur) { return items.map(function (i) { return '<button type="button" data-tab="' + i[0] + '" class="' + (i[0] === cur ? "on" : "") + '" role="tab" aria-selected="' + (i[0] === cur) + '">' + i[1] + "</button>"; }).join(""); }

  /* ───────── Calculadora (sin eval: descenso recursivo) ───────── */
  var FN = { sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, log: Math.log10, ln: Math.log, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, exp: Math.exp };
  var CONST = { pi: Math.PI, e: Math.E };
  function evaluate(input) {
    var src = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, ".").replace(/π/g, "pi").replace(/√/g, "sqrt"), i = 0;
    function peek() { while (src[i] === " ") i++; return src[i]; }
    function fail(m) { throw new Error(m); }
    function expr() { var v = term(); for (;;) { var c = peek(); if (c === "+") { i++; v += term(); } else if (c === "-") { i++; v -= term(); } else return v; } }
    function term() {
      var v = unary();
      for (;;) {
        var c = peek();
        if (c === "*") { i++; v *= unary(); }
        else if (c === "/") { i++; var d = unary(); if (d === 0) fail("División por cero"); v /= d; }
        else if (c === "%") { i++; var m = unary(); if (m === 0) fail("División por cero"); v %= m; }
        else return v;
      }
    }
    function unary() { var c = peek(); if (c === "-") { i++; return -unary(); } if (c === "+") { i++; return unary(); } return power(); }
    function power() { var b = postfix(); if (peek() === "^") { i++; return Math.pow(b, unary()); } return b; }
    function postfix() {
      var v = atom();
      while (peek() === "!") { i++; if (v < 0 || v % 1 !== 0 || v > 170) fail("Factorial inválido"); var r = 1; for (var k = 2; k <= v; k++) r *= k; v = r; }
      return v;
    }
    function atom() {
      var c = peek();
      if (c === "(") { i++; var v = expr(); if (peek() !== ")") fail("Falta cerrar paréntesis"); i++; return v; }
      if (c && /[0-9.]/.test(c)) { var m = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\.?/i.exec(src.slice(i)); if (!m) fail("Número inválido"); i += m[0].length; return parseFloat(m[0]); }
      if (c && /[a-z]/i.test(c)) {
        var name = /^[a-z]+/i.exec(src.slice(i))[0].toLowerCase(); i += name.length;
        if (name in CONST) return CONST[name];
        if (name in FN) { if (peek() !== "(") fail('Falta "(" después de ' + name); i++; var a = expr(); if (peek() !== ")") fail("Falta cerrar paréntesis"); i++; return FN[name](a); }
        fail("Desconocido: " + name);
      }
      return fail(c ? "Carácter inesperado “" + c + "”" : "Expresión incompleta");
    }
    if (!src.trim()) fail("Vacío");
    var res = expr();
    if (peek() !== undefined) fail("Carácter inesperado “" + peek() + "”");
    if (!isFinite(res)) fail("Resultado no válido");
    return res;
  }
  MB.evaluate = evaluate;
  function calculator(root) {
    var KEYS = ["C", "(", ")", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "⌫", "="], hist = [];
    root.innerHTML = '<div class="calc-wrap"><div class="stack-sm"><input class="input mono" id="ex" style="text-align:right;font-size:1.3rem;padding:12px" placeholder="0" aria-label="Expresión" autocomplete="off">' +
      '<p class="mono muted" id="res" style="text-align:right;min-height:1.5em" aria-live="polite"></p><div id="err"></div><div class="keypad">' +
      KEYS.map(function (k) { return '<button type="button" data-k="' + k + '" class="' + (k === "=" ? "eq" : /[÷×−+]/.test(k) ? "op" : "") + '">' + k + "</button>"; }).join("") +
      '</div><p class="small muted">También podés escribir: <code>sqrt(16)</code>, <code>sin(pi/2)</code>, <code>2^10</code>, <code>5!</code>, <code>log(100)</code>, <code>ln(e)</code>.</p></div>' +
      '<div><span class="label">Historial</span><ul class="list-plain mono" id="hist"><li class="muted">Todavía no hay cálculos.</li></ul></div></div>';
    var ex = $("#ex", root);
    function fmt(n) { return Number.isInteger(n) ? String(n) : String(parseFloat(n.toPrecision(12))); }
    function run() {
      try {
        var r = fmt(evaluate(ex.value)); $("#res", root).textContent = "= " + r; $("#err", root).innerHTML = "";
        hist.unshift(ex.value + " = " + r); hist = hist.slice(0, 10); ex.value = r;
        $("#hist", root).innerHTML = hist.map(function (h, i) { return '<li><button class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start" data-i="' + i + '">' + MB.esc(h) + "</button></li>"; }).join("");
        on(root, "[data-i]", "click", function (e) { ex.value = hist[+e.currentTarget.dataset.i].split(" = ")[1]; });
      } catch (e) { $("#err", root).innerHTML = notice("error", MB.esc(e.message)); }
    }
    on(root, "[data-k]", "click", function (e) {
      var k = e.currentTarget.dataset.k; $("#err", root).innerHTML = "";
      if (k === "C") { ex.value = ""; $("#res", root).textContent = ""; } else if (k === "⌫") ex.value = ex.value.slice(0, -1); else if (k === "=") run(); else ex.value += k;
    });
    ex.addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
    ex.addEventListener("input", function () { $("#err", root).innerHTML = ""; });
  }

  /* ───────── Conversor de unidades ───────── */
  var CATS = {
    length: ["Longitud", { m: ["Metro", 1], km: ["Kilómetro", 1000], cm: ["Centímetro", .01], mm: ["Milímetro", .001], mi: ["Milla", 1609.344], yd: ["Yarda", .9144], ft: ["Pie", .3048], "in": ["Pulgada", .0254] }],
    mass: ["Masa", { kg: ["Kilogramo", 1], g: ["Gramo", .001], mg: ["Miligramo", 1e-6], t: ["Tonelada", 1000], lb: ["Libra", .45359237], oz: ["Onza", .028349523125] }],
    volume: ["Volumen", { l: ["Litro", 1], ml: ["Mililitro", .001], m3: ["Metro cúbico", 1000], gal: ["Galón (US)", 3.785411784], cup: ["Taza (US)", .2365882365], floz: ["Onza fluida (US)", .0295735295625] }],
    area: ["Área", { m2: ["Metro²", 1], km2: ["Kilómetro²", 1e6], ha: ["Hectárea", 1e4], ft2: ["Pie²", .09290304], ac: ["Acre", 4046.8564224] }],
    speed: ["Velocidad", { ms: ["m/s", 1], kmh: ["km/h", 1 / 3.6], mph: ["mph", .44704], kn: ["Nudo", .514444] }],
    time: ["Tiempo", { s: ["Segundo", 1], min: ["Minuto", 60], h: ["Hora", 3600], d: ["Día", 86400], w: ["Semana", 604800] }],
    data: ["Datos", { B: ["Byte", 1], KB: ["Kilobyte (1000)", 1e3], MB: ["Megabyte", 1e6], GB: ["Gigabyte", 1e9], TB: ["Terabyte", 1e12], KiB: ["Kibibyte (1024)", 1024], MiB: ["Mebibyte", 1048576], GiB: ["Gibibyte", 1073741824] }],
    temp: ["Temperatura", { C: ["Celsius", 0], F: ["Fahrenheit", 0], K: ["Kelvin", 0] }]
  };
  function convertUnit(cat, v, from, to) {
    if (cat === "temp") { var c = from === "C" ? v : from === "F" ? (v - 32) * 5 / 9 : v - 273.15; return to === "C" ? c : to === "F" ? c * 9 / 5 + 32 : c + 273.15; }
    var u = CATS[cat][1]; return v * u[from][1] / u[to][1];
  }
  function units(root) {
    var cat = "length";
    root.innerHTML = '<div class="stack"><div class="row" id="cats">' + Object.keys(CATS).map(function (k) { return '<button class="pill" data-c="' + k + '">' + CATS[k][0] + "</button>"; }).join("") + "</div>" +
      '<div class="cols cols-2"><div class="stack-sm">' + F("Valor", '<input class="input" id="v" inputmode="decimal" value="1">') + '<select class="input" id="from" aria-label="Desde"></select></div>' +
      '<div class="stack-sm">' + F("Resultado", '<output class="output mono" id="out" style="display:block">—</output>') + '<select class="input" id="to" aria-label="Hacia"></select></div></div>' +
      '<div class="row"><button class="btn btn-ghost" id="swap"><i data-lucide="arrow-left-right"></i> Intercambiar</button>' + MB.copyBtn("#out", "Copiar resultado") + "</div></div>";
    function fill() {
      var u = CATS[cat][1], ks = Object.keys(u), o = ks.map(function (k) { return '<option value="' + k + '">' + u[k][0] + " (" + k + ")</option>"; }).join("");
      $("#from", root).innerHTML = o; $("#to", root).innerHTML = o; $("#from", root).value = ks[0]; $("#to", root).value = ks[1] || ks[0];
      MB.$$("[data-c]", root).forEach(function (b) { b.classList.toggle("on", b.dataset.c === cat); }); calc();
    }
    function calc() {
      var n = parseFloat(val(root, "#v").replace(",", ".")), r = isFinite(n) ? convertUnit(cat, n, val(root, "#from"), val(root, "#to")) : NaN;
      $("#out", root).textContent = isFinite(r) ? String(parseFloat(r.toPrecision(10))) : "—";
    }
    on(root, "[data-c]", "click", function (e) { cat = e.currentTarget.dataset.c; fill(); });
    on(root, "#v", "input", calc); on(root, "#from", "change", calc); on(root, "#to", "change", calc);
    on(root, "#swap", "click", function () { var a = val(root, "#from"); $("#from", root).value = val(root, "#to"); $("#to", root).value = a; calc(); });
    MB.bindCopy(root, function () { return $("#out", root).textContent.replace("—", ""); }); fill();
  }

  /* ───────── Conversor de texto ───────── */
  function words(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^A-Za-z0-9]+/).filter(Boolean); }
  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
  var TOPS = {
    upper: ["MAYÚSCULAS", function (s) { return s.toUpperCase(); }], lower: ["minúsculas", function (s) { return s.toLowerCase(); }],
    title: ["Título", function (s) { return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, function (_, a, b) { return a + b.toUpperCase(); }); }],
    sentence: ["Oración", function (s) { return s.toLowerCase().replace(/(^\s*|[.!?¿¡]\s+)(\p{L})/gu, function (_, a, b) { return a + b.toUpperCase(); }); }],
    camel: ["camelCase", function (s) { return words(s).map(function (w, i) { return i ? cap(w) : w.toLowerCase(); }).join(""); }],
    pascal: ["PascalCase", function (s) { return words(s).map(cap).join(""); }],
    snake: ["snake_case", function (s) { return words(s).map(function (w) { return w.toLowerCase(); }).join("_"); }],
    kebab: ["kebab-case", function (s) { return words(s).map(function (w) { return w.toLowerCase(); }).join("-"); }],
    constant: ["CONSTANT_CASE", function (s) { return words(s).map(function (w) { return w.toUpperCase(); }).join("_"); }],
    reverse: ["Invertir texto", function (s) { return Array.from(s).reverse().join(""); }],
    noaccent: ["Quitar acentos", function (s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }],
    trim: ["Limpiar espacios", function (s) { return s.split("\n").map(function (l) { return l.trim().replace(/\s{2,}/g, " "); }).join("\n").trim(); }],
    dedupe: ["Quitar líneas repetidas", function (s) { return s.split("\n").filter(function (l, i, a) { return a.indexOf(l) === i; }).join("\n"); }],
    sort: ["Ordenar líneas A-Z", function (s) { return s.split("\n").sort(function (a, b) { return a.localeCompare(b, "es"); }).join("\n"); }]
  };
  function textConverter(root) {
    var op = "upper";
    root.innerHTML = '<div class="stack"><div class="row">' + Object.keys(TOPS).map(function (k) { return '<button class="pill" data-op="' + k + '">' + TOPS[k][0] + "</button>"; }).join("") + "</div>" +
      '<div class="cols cols-2">' + F("Entrada", '<textarea class="input" id="in" rows="10" placeholder="Pegá o escribí tu texto…"></textarea>') + F("Resultado", '<textarea class="input" id="out" rows="10" readonly></textarea>') + "</div>" +
      '<div class="row">' + MB.copyBtn("#out") + '<button class="btn btn-ghost" id="use">Usar resultado como entrada</button></div></div>';
    function calc() { $("#out", root).value = TOPS[op][1](val(root, "#in")); MB.$$("[data-op]", root).forEach(function (b) { b.classList.toggle("on", b.dataset.op === op); }); }
    on(root, "[data-op]", "click", function (e) { op = e.currentTarget.dataset.op; calc(); });
    on(root, "#in", "input", calc); on(root, "#use", "click", function () { $("#in", root).value = val(root, "#out"); calc(); }); MB.bindCopy(root); calc();
  }

  /* ───────── Contador ───────── */
  function counter(root) {
    root.innerHTML = '<div class="stack"><div class="cols cols-4" id="st"></div>' + '<textarea class="input" id="t" rows="14" placeholder="Escribí o pegá tu texto…" aria-label="Texto a analizar"></textarea><div><button class="btn btn-ghost" id="clr">Borrar</button></div></div>';
    function calc() {
      var t = val(root, "#t"), tr = t.trim(), w = tr ? tr.split(/\s+/).length : 0;
      var s = [["Palabras", w], ["Caracteres", Array.from(t).length], ["Sin espacios", Array.from(t.replace(/\s/g, "")).length], ["Oraciones", (t.match(/[^.!?¡¿]+[.!?]+/g) || (tr ? [tr] : [])).length],
        ["Párrafos", tr ? tr.split(/\n\s*\n/).length : 0], ["Líneas", t ? t.split("\n").length : 0], ["Lectura", w ? Math.max(1, Math.round(w / 220)) + " min" : "0 min"]];
      $("#st", root).innerHTML = s.map(function (x) { return '<div class="stat"><b>' + x[1] + '</b><span class="small muted">' + x[0] + "</span></div>"; }).join("");
    }
    on(root, "#t", "input", calc); on(root, "#clr", "click", function () { $("#t", root).value = ""; calc(); }); calc();
  }

  /* ───────── JSON ───────── */
  function parseJson(text) {
    try { return { ok: true, value: JSON.parse(text) }; }
    catch (e) {
      var m = /position (\d+)/.exec(e.message), line, col;
      if (m) { var before = text.slice(0, +m[1]).split("\n"); line = before.length; col = before[before.length - 1].length + 1; }
      else { var m2 = /line (\d+) column (\d+)/.exec(e.message); if (m2) { line = +m2[1]; col = +m2[2]; } }
      return { ok: false, message: e.message, line: line, col: col };
    }
  }
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === "object") { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = sortKeys(v[k]); }); return o; }
    return v;
  }
  function jsonFormatter(root) {
    root.innerHTML = '<div class="stack"><div class="row-end">' + F("Formato", '<select class="input" id="mode"><option value="2">2 espacios</option><option value="4">4 espacios</option><option value="tab">Tabulación</option><option value="min">Minificado</option></select>') +
      '<label class="check" style="padding-bottom:10px"><input type="checkbox" id="sort"> Ordenar claves</label></div><div id="err"></div>' +
      '<div class="cols cols-2">' + F("Entrada", '<textarea class="input mono" id="in" rows="18" spellcheck="false" placeholder=\'{"hola":"mundo"}\' style="font-size:.78rem"></textarea>') + F("Resultado", '<textarea class="input mono" id="out" rows="18" readonly style="font-size:.78rem"></textarea>') + "</div>" +
      '<div class="row">' + MB.copyBtn("#out") + '<button class="btn btn-ghost" id="dl"><i data-lucide="download"></i> Descargar</button></div></div>';
    function calc() {
      var src = val(root, "#in"), out = $("#out", root), err = $("#err", root); err.innerHTML = ""; out.value = "";
      if (!src.trim()) return;
      var r = parseJson(src);
      if (!r.ok) { err.innerHTML = notice("error", "JSON inválido" + (r.line ? " (línea " + r.line + ", columna " + r.col + ")" : "") + ": " + MB.esc(r.message)); return; }
      var m = val(root, "#mode"); out.value = JSON.stringify($("#sort", root).checked ? sortKeys(r.value) : r.value, null, m === "min" ? 0 : m === "tab" ? "\t" : +m);
    }
    on(root, "#in", "input", calc); on(root, "#mode", "change", calc); on(root, "#sort", "change", calc);
    on(root, "#dl", "click", function () { var o = val(root, "#out"); if (o) MB.download("datos.json", o, "application/json"); }); MB.bindCopy(root);
  }
  function depthStats(v) {
    if (v && typeof v === "object") {
      var ch = Object.keys(v).map(function (k) { return depthStats(v[k]); });
      return { keys: (Array.isArray(v) ? 0 : ch.length) + ch.reduce(function (a, b) { return a + b.keys; }, 0), depth: 1 + Math.max.apply(null, [0].concat(ch.map(function (x) { return x.depth; }))) };
    }
    return { keys: 0, depth: 0 };
  }
  function jsonEditor(root) {
    root.innerHTML = '<div class="stack-sm"><div class="row"><button class="btn btn-ghost" id="fmt">Formatear</button><button class="btn btn-ghost" id="min">Minificar</button>' +
      '<label class="btn btn-ghost"><i data-lucide="file-up"></i> Abrir archivo<input type="file" id="file" accept=".json,application/json" hidden></label>' + MB.copyBtn("#src") +
      '<button class="btn btn-ghost" id="dl"><i data-lucide="download"></i> Descargar</button></div><div id="status"></div>' +
      '<div class="editor"><div class="gutter" id="gut" aria-hidden="true"></div><textarea id="src" wrap="off" spellcheck="false" aria-label="Editor JSON"></textarea></div></div>';
    var src = $("#src", root); src.value = '{\n  "nombre": "MINIBENJA",\n  "activo": true\n}'; var cur = null;
    function check() {
      var r = parseJson(src.value), n = src.value.split("\n").length; cur = r;
      $("#gut", root).innerHTML = Array.from({ length: n }, function (_, i) { return "<div" + (!r.ok && r.line === i + 1 ? ' class="err"' : "") + ">" + (i + 1) + "</div>"; }).join("");
      var st = r.ok ? depthStats(r.value) : null;
      $("#status", root).innerHTML = r.ok ? notice("ok", "JSON válido · " + n + " líneas · " + st.keys + " claves · profundidad " + st.depth)
        : notice("error", "Error" + (r.line ? " en línea " + r.line + ", columna " + r.col : "") + ": " + MB.esc(r.message));
      $("#fmt", root).disabled = $("#min", root).disabled = !r.ok;
    }
    src.addEventListener("input", check);
    src.addEventListener("scroll", function () { $("#gut", root).scrollTop = src.scrollTop; });
    src.addEventListener("keydown", function (e) { if (e.key !== "Tab") return; e.preventDefault(); var a = src.selectionStart, b = src.selectionEnd; src.value = src.value.slice(0, a) + "  " + src.value.slice(b); src.selectionStart = src.selectionEnd = a + 2; check(); });
    on(root, "#fmt", "click", function () { if (cur && cur.ok) { src.value = JSON.stringify(cur.value, null, 2); check(); } });
    on(root, "#min", "click", function () { if (cur && cur.ok) { src.value = JSON.stringify(cur.value); check(); } });
    on(root, "#file", "change", function (e) { var f = e.target.files[0]; if (!f) return; if (f.size > 5e6) return MB.toast("El archivo supera 5 MB"); f.text().then(function (t) { src.value = t; check(); }); });
    on(root, "#dl", "click", function () { MB.download("editado.json", src.value, "application/json"); }); MB.bindCopy(root); check();
  }

  /* ───────── Base64 y URL ───────── */
  function b64enc(s, urlSafe) {
    var bytes = new TextEncoder().encode(s), bin = ""; bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    var r = btoa(bin); return urlSafe ? r.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : r;
  }
  function b64dec(s) {
    var b = s.trim().replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/"); b += "=".repeat((4 - (b.length % 4)) % 4);
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(atob(b), function (c) { return c.charCodeAt(0); }));
  }
  MB.b64 = { enc: b64enc, dec: b64dec };
  function codec(root, cfg) {
    var mode = "enc";
    root.innerHTML = '<div class="stack"><div class="row" style="gap:16px"><div class="tabs" role="tablist">' + tabs([["enc", "Codificar"], ["dec", "Decodificar"]], mode) + "</div>" +
      '<label class="check"><input type="checkbox" id="opt"> ' + cfg.opt + '</label></div><div id="err"></div><div class="cols cols-2">' +
      F("Entrada", '<textarea class="input mono" id="in" rows="10"></textarea>') + F("Resultado", '<textarea class="input mono" id="out" rows="10" readonly></textarea>') + "</div>" + '<div>' + MB.copyBtn("#out") + "</div></div>";
    function calc() {
      var t = val(root, "#in"), out = $("#out", root), err = $("#err", root); err.innerHTML = ""; out.value = "";
      MB.$$("[data-tab]", root).forEach(function (b) { b.classList.toggle("on", b.dataset.tab === mode); });
      if (!t) return;
      try { out.value = cfg.run(mode, t, $("#opt", root).checked); } catch (e) { err.innerHTML = notice("error", cfg.err); }
    }
    on(root, "[data-tab]", "click", function (e) { mode = e.currentTarget.dataset.tab; calc(); });
    on(root, "#in", "input", calc); on(root, "#opt", "change", calc); MB.bindCopy(root); calc();
  }
  function base64(root) { codec(root, { opt: "Variante URL-safe (al codificar)", err: "Entrada no válida: no es Base64 correcto o no representa texto UTF-8.", run: function (m, t, o) { return m === "enc" ? b64enc(t, o) : b64dec(t); } }); }
  function urlCodec(root) { codec(root, { opt: "URL completa (conserva : / ? # &amp; =)", err: "Secuencia de escape inválida (%) o carácter no codificable.", run: function (m, t, o) { return (m === "enc" ? (o ? encodeURI : encodeURIComponent) : (o ? decodeURI : decodeURIComponent))(t); } }); }

  /* ───────── Cronómetro ───────── */
  function fmtMs(ms) { return pad(Math.floor(ms / 60000)) + ":" + pad(Math.floor(ms / 1000) % 60) + "." + pad(Math.floor((ms % 1000) / 10)); }
  function stopwatch(root) {
    var run = false, base = 0, start = 0, raf = 0, laps = [];
    root.innerHTML = '<div class="stack center"><div class="big-time" id="t" role="timer">00:00.00</div><div class="row" style="justify-content:center">' +
      '<button class="btn btn-primary" id="go"><i data-lucide="play"></i> Iniciar</button><button class="btn btn-ghost" id="lap" disabled><i data-lucide="flag"></i> Vuelta</button><button class="btn btn-ghost" id="rst" disabled><i data-lucide="rotate-ccw"></i> Reiniciar</button></div>' +
      '<ol class="list-plain laps" id="laps" style="max-width:380px;margin:0 auto;width:100%"></ol></div>';
    function tick() { base = performance.now() - start; $("#t", root).textContent = fmtMs(base); raf = requestAnimationFrame(tick); }
    function ui() {
      $("#go", root).innerHTML = run ? '<i data-lucide="pause"></i> Pausar' : '<i data-lucide="play"></i> ' + (base ? "Continuar" : "Iniciar");
      $("#lap", root).disabled = !run; $("#rst", root).disabled = !base && !run; MB.icons();
    }
    on(root, "#go", "click", function () { if (run) { cancelAnimationFrame(raf); run = false; } else { start = performance.now() - base; run = true; tick(); } ui(); });
    on(root, "#lap", "click", function () { laps.unshift(base); drawLaps(); });
    on(root, "#rst", "click", function () { cancelAnimationFrame(raf); run = false; base = 0; laps = []; $("#t", root).textContent = fmtMs(0); drawLaps(); ui(); });
    function drawLaps() { $("#laps", root).innerHTML = laps.map(function (l, i) { return "<li><span class='muted'>Vuelta " + (laps.length - i) + "</span><span>" + fmtMs(l) + "</span><span class='muted'>+" + fmtMs(l - (laps[i + 1] || 0)) + "</span></li>"; }).join(""); }
    return function () { cancelAnimationFrame(raf); };
  }

  /* ───────── Temporizador ───────── */
  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .35, .7].forEach(function (t) {
        var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .3); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + .3);
      });
    } catch (e) {}
  }
  function timer(root) {
    var left = 0, end = 0, id = 0, running = false, oldTitle = document.title;
    function box(k, label, v, max) { return '<label class="center"><input class="input mono" id="' + k + '" type="number" min="0" max="' + max + '" value="' + v + '" style="width:96px;text-align:center;font-size:1.6rem"><span class="small muted">' + label + "</span></label>"; }
    root.innerHTML = '<div class="stack center"><div id="setup" class="row" style="justify-content:center;gap:12px">' + box("h", "horas", 0, 99) + box("m", "minutos", 5, 59) + box("s", "segundos", 0, 59) + "</div>" +
      '<div class="big-time hidden" id="disp" role="timer"></div><div id="done"></div><div class="row" style="justify-content:center"><button class="btn btn-primary" id="go"><i data-lucide="play"></i> Iniciar</button><button class="btn btn-ghost" id="rst" disabled><i data-lucide="rotate-ccw"></i> Reiniciar</button></div>' +
      '<div class="row" style="justify-content:center">' + [1, 5, 10, 15, 25, 60].map(function (x) { return '<button class="btn btn-ghost" data-q="' + x + '">' + x + " min</button>"; }).join("") + "</div></div>";
    function fmt(ms) { var t = Math.ceil(ms / 1000); return pad(Math.floor(t / 3600)) + ":" + pad(Math.floor(t / 60) % 60) + ":" + pad(t % 60); }
    function total() { return (Math.max(0, +val(root, "#h")) * 3600 + Math.max(0, +val(root, "#m")) * 60 + Math.max(0, +val(root, "#s"))) * 1000; }
    function ui() {
      var active = running || left > 0;
      $("#setup", root).classList.toggle("hidden", active); $("#disp", root).classList.toggle("hidden", !active); $("#disp", root).textContent = fmt(left);
      $("#go", root).innerHTML = running ? '<i data-lucide="pause"></i> Pausar' : '<i data-lucide="play"></i> ' + (left > 0 ? "Continuar" : "Iniciar");
      $("#rst", root).disabled = !active && !$("#done", root).innerHTML; MB.$$("[data-q]", root).forEach(function (b) { b.disabled = active; }); MB.icons();
      document.title = running ? fmt(left) + " · Temporizador" : oldTitle;
    }
    function stop() { clearInterval(id); running = false; }
    on(root, "#go", "click", function () {
      if (running) { stop(); ui(); return; }
      $("#done", root).innerHTML = ""; var ms = left > 0 ? left : total(); if (ms <= 0) return;
      left = ms; end = Date.now() + ms; running = true;
      id = setInterval(function () {
        var r = end - Date.now();
        if (r <= 0) { stop(); left = 0; $("#done", root).innerHTML = notice("ok", "⏰ ¡Tiempo terminado!"); beep(); } else left = r;
        ui();
      }, 100); ui();
    });
    on(root, "#rst", "click", function () { stop(); left = 0; $("#done", root).innerHTML = ""; ui(); });
    on(root, "[data-q]", "click", function (e) { var x = +e.currentTarget.dataset.q; $("#h", root).value = Math.floor(x / 60); $("#m", root).value = x % 60; $("#s", root).value = 0; });
    return function () { stop(); document.title = oldTitle; };
  }

  /* ───────── Reloj mundial ───────── */
  function worldClock(root) {
    var DEF = ["America/Argentina/Buenos_Aires", "America/New_York", "Europe/Madrid", "Asia/Tokyo"], KEY = "mb-worldclock";
    var zones = MB.store.get(KEY, DEF); if (!Array.isArray(zones) || !zones.every(function (z) { return typeof z === "string"; })) zones = DEF;
    var all; try { all = Intl.supportedValuesOf("timeZone"); } catch (e) { all = DEF; }
    var local = Intl.DateTimeFormat().resolvedOptions().timeZone, id = 0;
    root.innerHTML = '<div class="stack"><div class="row"><select class="input grow" id="sel" aria-label="Zona horaria"></select><button class="btn btn-primary" id="add"><i data-lucide="plus"></i> Agregar</button></div><ul class="tiles" id="list"></ul></div>';
    function fillSel() {
      $("#sel", root).innerHTML = '<option value="">Agregar zona horaria…</option>' + all.filter(function (z) { return zones.indexOf(z) < 0 && z !== local; }).map(function (z) { return '<option value="' + z + '">' + z.replace(/_/g, " ") + "</option>"; }).join("");
    }
    function draw() {
      var now = new Date(), list = [local].concat(zones.filter(function (z) { return z !== local; }));
      $("#list", root).innerHTML = list.map(function (z) {
        var t, d; try { t = now.toLocaleTimeString("es", { timeZone: z, hour12: false }); d = now.toLocaleDateString("es", { timeZone: z, weekday: "long", day: "numeric", month: "long" }); } catch (e) { t = "--"; d = "Zona no válida"; }
        return '<li><div class="card clock"><p class="small muted">' + z.replace(/_/g, " ") + (z === local ? " · tu zona" : "") + '</p><p class="t">' + t + '</p><p class="small muted">' + d + "</p>" +
          (z !== local ? '<button class="btn btn-ghost btn-sm btn-icon x" data-rm="' + z + '" aria-label="Quitar ' + z + '"><i data-lucide="x"></i></button>' : "") + "</div></li>";
      }).join(""); MB.icons();
      on(root, "[data-rm]", "click", function (e) { zones = zones.filter(function (z) { return z !== e.currentTarget.dataset.rm; }); MB.store.set(KEY, zones); fillSel(); draw(); });
    }
    on(root, "#add", "click", function () { var z = val(root, "#sel"); if (!z) return; zones.push(z); MB.store.set(KEY, zones); fillSel(); draw(); });
    fillSel(); draw(); id = setInterval(draw, 1000);
    return function () { clearInterval(id); };
  }

  /* ───────── Selector de color ───────── */
  function colorPicker(root) {
    root.innerHTML = '<div class="cols cols-2"><div class="stack-sm"><input type="color" id="pick" value="#6366f1" style="height:190px;border-radius:18px" aria-label="Selector de color">' +
      '<div class="row-end grow">' + F("Valor HEX", '<input class="input mono" id="hex" value="#6366f1" maxlength="7">') + '<button class="btn btn-ghost hidden" id="eye"><i data-lucide="pipette"></i> Gotero</button></div></div>' +
      '<div class="stack-sm" id="vals"></div></div>';
    function lum(c) { return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); function f(x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); } }
    function contrast(a, b) { var l = [lum(a), lum(b)].sort(function (x, y) { return y - x; }); return (l[0] + 0.05) / (l[1] + 0.05); }
    function show(hex) {
      var n = parseInt(hex.slice(1), 16), rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255], c = colorInfo(rgb[0], rgb[1], rgb[2]), cw = contrast(rgb, [255, 255, 255]), cb = contrast(rgb, [0, 0, 0]);
      $("#vals", root).innerHTML = [["HEX", c.hex], ["RGB", c.rgb], ["HSL", c.hsl]].map(function (p) { return '<div class="card row" style="padding:10px 12px;justify-content:space-between;flex-wrap:nowrap"><span class="mono small muted">' + p[0] + '</span><span class="mono">' + p[1] + '</span><button class="btn btn-ghost btn-sm btn-icon" data-v="' + p[1] + '" aria-label="Copiar ' + p[0] + '"><i data-lucide="copy"></i></button></div>'; }).join("") +
        '<div class="cols cols-2"><div class="swatch" style="background:' + hex + ';color:#fff;border-radius:12px;height:80px">Blanco ' + cw.toFixed(1) + ":1 " + (cw >= 4.5 ? "✓" : "✗") + '</div><div class="swatch" style="background:' + hex + ';color:#000;border-radius:12px;height:80px">Negro ' + cb.toFixed(1) + ":1 " + (cb >= 4.5 ? "✓" : "✗") + '</div></div><p class="small muted">✓ cumple contraste WCAG AA (4.5:1) para texto normal.</p>';
      MB.icons(); on(root, "[data-v]", "click", function (e) { MB.copy(e.currentTarget.dataset.v); });
    }
    function colorInfo(r, g, b) { // misma conversión que en generadores
      var hex = "#" + [r, g, b].map(function (x) { return x.toString(16).padStart(2, "0"); }).join("").toUpperCase(), rr = r / 255, gg = g / 255, bb = b / 255, mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), d = mx - mn, l = (mx + mn) / 2, h = 0, s = 0;
      if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === rr ? ((gg - bb) / d) % 6 : mx === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4; h = (h * 60 + 360) % 360; }
      return { hex: hex, rgb: "rgb(" + r + ", " + g + ", " + b + ")", hsl: "hsl(" + Math.round(h) + ", " + Math.round(s * 100) + "%, " + Math.round(l * 100) + "%)" };
    }
    on(root, "#pick", "input", function (e) { $("#hex", root).value = e.target.value; show(e.target.value); });
    on(root, "#hex", "input", function (e) {
      var m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(e.target.value.trim()); if (!m) return;
      var h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1]; h = "#" + h.toLowerCase(); $("#pick", root).value = h; show(h);
    });
    if (window.EyeDropper) { var eye = $("#eye", root); eye.classList.remove("hidden"); eye.addEventListener("click", function () { new EyeDropper().open().then(function (r) { $("#pick", root).value = r.sRGBHex; $("#hex", root).value = r.sRGBHex; show(r.sRGBHex); }).catch(function () {}); }); }
    show("#6366f1");
  }

  /* ───────── Markdown (escapa todo el HTML de entrada) ───────── */
  function mdInline(raw) {
    var codes = [], s = MB.esc(raw).replace(/`([^`]+)`/g, function (_, c) { codes.push("<code>" + c + "</code>"); return "\u0000" + (codes.length - 1) + "\u0000"; });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, u) { return /^https?:\/\//i.test(u) ? '<img src="' + u + '" alt="' + alt + '" loading="lazy">' : alt; });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) { return /^(https?:\/\/|mailto:)/i.test(u) ? '<a href="' + u + '" target="_blank" rel="noopener noreferrer nofollow">' + t + "</a>" : t; });
    s = s.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, function (_, a, b) { return "<strong>" + (a || b) + "</strong>"; })
      .replace(/(?<![*\w])\*([^*\s][^*]*)\*(?!\*)|(?<![_\w])_([^_\s][^_]*)_(?![_\w])/g, function (_, a, b) { return "<em>" + (a || b) + "</em>"; })
      .replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return codes[+i]; });
  }
  function mdToHtml(md) {
    var lines = md.replace(/\r\n?/g, "\n").split("\n"), out = [], i = 0;
    while (i < lines.length) {
      var l = lines[i], m;
      if (/^```/.test(l)) { var buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push("<pre><code>" + MB.esc(buf.join("\n")) + "</code></pre>"); continue; }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { out.push("<h" + m[1].length + ">" + mdInline(m[2]) + "</h" + m[1].length + ">"); i++; continue; }
      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(l)) { out.push("<hr>"); i++; continue; }
      if (/^>\s?/.test(l)) { var q = []; while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, "")); out.push("<blockquote>" + mdToHtml(q.join("\n")) + "</blockquote>"); continue; }
      var ul = /^\s*[-*+]\s+/, ol = /^\s*\d+[.)]\s+/;
      if (ul.test(l) || ol.test(l)) { var ordered = ol.test(l), re = ordered ? ol : ul, items = []; while (i < lines.length && re.test(lines[i])) items.push("<li>" + mdInline(lines[i++].replace(re, "")) + "</li>"); var tag = ordered ? "ol" : "ul"; out.push("<" + tag + ">" + items.join("") + "</" + tag + ">"); continue; }
      if (!l.trim()) { i++; continue; }
      var p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(lines[i])) p.push(lines[i++]);
      out.push("<p>" + p.map(mdInline).join("<br>") + "</p>");
    }
    return out.join("\n");
  }
  MB.mdToHtml = mdToHtml;
  function markdown(root) {
    root.innerHTML = '<div class="stack"><div class="cols cols-2"><textarea class="input mono" id="md" style="min-height:420px" spellcheck="false" aria-label="Markdown"></textarea><article class="card md" id="pv"></article></div>' +
      '<div class="row"><button class="btn btn-ghost" id="ch"><i data-lucide="copy"></i> Copiar HTML</button><button class="btn btn-ghost" id="clr">Limpiar</button></div></div>';
    var md = $("#md", root); md.value = "# Título\n\nTexto con **negrita**, *cursiva* y `código`.\n\n- Elemento uno\n- Elemento dos\n\n> Una cita\n\n[Visitar MINIBENJA](https://minibenja.com)\n";
    function draw() { $("#pv", root).innerHTML = mdToHtml(md.value); }
    md.addEventListener("input", draw); on(root, "#ch", "click", function () { MB.copy(mdToHtml(md.value)); }); on(root, "#clr", "click", function () { md.value = ""; draw(); }); draw();
  }

  MB.HERRAMIENTAS = [
    { slug: "calculadora", name: "Calculadora", icon: "calculator", tags: "matematica sqrt", desc: "Operaciones, paréntesis, potencias y funciones científicas.", render: calculator },
    { slug: "conversor-unidades", name: "Conversor de unidades", icon: "ruler", tags: "unidades medidas", desc: "Longitud, masa, volumen, temperatura, datos y más.", render: units },
    { slug: "conversor-texto", name: "Conversor de texto", icon: "case-sensitive", tags: "case mayusculas", desc: "Mayúsculas, camelCase, snake_case, ordenar líneas y más.", render: textConverter },
    { slug: "contador", name: "Contador de palabras", icon: "type", tags: "caracteres texto", desc: "Palabras, caracteres, oraciones y tiempo de lectura.", render: counter },
    { slug: "editor-json", name: "Editor JSON", icon: "file-json", tags: "json editor", desc: "Editor con números de línea, validación y archivos.", render: jsonEditor },
    { slug: "formateador-json", name: "Formateador JSON", icon: "braces", tags: "json format", desc: "Embellece, minifica y ordena claves de un JSON.", render: jsonFormatter },
    { slug: "base64", name: "Base64", icon: "binary", tags: "encode decode", desc: "Codifica y decodifica texto UTF-8 (también URL-safe).", render: base64 },
    { slug: "url", name: "Codificador URL", icon: "link-2", tags: "percent encode", desc: "Codifica y decodifica componentes o URLs completas.", render: urlCodec },
    { slug: "cronometro", name: "Cronómetro", icon: "watch", tags: "tiempo stopwatch", desc: "Con vueltas y precisión de centésimas.", render: stopwatch },
    { slug: "temporizador", name: "Temporizador", icon: "timer", tags: "timer alarma", desc: "Cuenta regresiva con alarma sonora.", render: timer },
    { slug: "reloj-mundial", name: "Reloj mundial", icon: "globe", tags: "hora timezone", desc: "Hora actual en las zonas horarias que elijas.", render: worldClock },
    { slug: "selector-color", name: "Selector de colores", icon: "palette", tags: "color contraste", desc: "HEX, RGB, HSL, gotero y contraste WCAG.", render: colorPicker },
    { slug: "markdown", name: "Visor de Markdown", icon: "scroll-text", tags: "md preview", desc: "Edita y previsualiza Markdown en vivo.", render: markdown }
  ];
})();
