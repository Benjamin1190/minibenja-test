/* MINIBENJA — generadores (todo se ejecuta en el navegador) */
(function () {
  "use strict";
  var $ = MB.$, R = MB.rand, F = MB.field;
  function on(root, sel, ev, fn) { MB.$$(sel, root).forEach(function (e) { e.addEventListener(ev, fn); }); }
  function val(root, sel) { return $(sel, root).value; }
  function num(root, sel, min, max, dflt) { var n = parseFloat($(sel, root).value); if (!isFinite(n)) n = dflt; return Math.min(max, Math.max(min, n)); }
  function chk(root, sel) { return $(sel, root).checked; }

  /* ───────── Contraseñas ───────── */
  var SETS = { lower: "abcdefghijklmnopqrstuvwxyz", upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", digits: "0123456789", symbols: "!@#$%^&*()-_=+[]{};:,.<>?/~" };
  function password(root) {
    root.innerHTML =
      '<div class="stack"><div class="row"><output class="output grow mono" id="out" style="font-size:1.1rem" aria-live="polite"></output>' +
      '<button class="btn btn-primary" id="gen"><i data-lucide="refresh-cw"></i> Generar</button>' + MB.copyBtn("#out") + "</div>" +
      '<div><div class="meter"><div id="meter"></div></div><p class="small muted" id="strength" style="margin-top:4px"></p></div>' +
      F('Longitud: <span id="lenv">20</span>', '<input type="range" id="len" min="4" max="128" value="20">') +
      '<div class="cols cols-4">' +
      ["lower:Minúsculas", "upper:Mayúsculas", "digits:Números", "symbols:Símbolos"].map(function (s) { var p = s.split(":"); return '<label class="card check" style="padding:10px 12px"><input type="checkbox" data-set="' + p[0] + '" checked> ' + p[1] + "</label>"; }).join("") +
      '</div><label class="check"><input type="checkbox" id="amb"> Evitar caracteres ambiguos (0, O, 1, l, I, |)</label>' +
      '<p class="small muted">Se genera en tu navegador con <code>crypto.getRandomValues</code>. Nada se envía ni se guarda.</p></div>';
    function gen() {
      var len = +val(root, "#len"); $("#lenv", root).textContent = len;
      var sets = MB.$$("[data-set]", root).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.set; });
      var out = $("#out", root);
      if (!sets.length) { out.textContent = "Elegí al menos un tipo de carácter"; return; }
      var amb = chk(root, "#amb");
      var pools = sets.map(function (k) { return amb ? SETS[k].replace(/[0O1lI|]/g, "") : SETS[k]; });
      var all = pools.join(""), chars = pools.map(function (p) { return R.pick(p.split("")); });
      while (chars.length < len) chars.push(all[R.int(all.length)]);
      out.textContent = R.shuffle(chars).slice(0, len).join("");
      var bits = len * Math.log2(Math.max(2, sets.length * 18)), m = $("#meter", root), s = $("#strength", root);
      var lvl = bits < 50 ? ["Débil", 25, "var(--bad)"] : bits < 75 ? ["Media", 50, "var(--warn)"] : bits < 110 ? ["Fuerte", 75, "var(--ok)"] : ["Muy fuerte", 100, "var(--ok)"];
      m.style.width = lvl[1] + "%"; m.style.background = lvl[2]; s.textContent = "Seguridad: " + lvl[0];
    }
    on(root, "#gen", "click", gen); on(root, "input", "input", gen); MB.bindCopy(root); gen();
  }

  /* ───────── QR ───────── */
  var QR_KINDS = [["url", "URL"], ["text", "Texto"], ["wifi", "WiFi"], ["email", "Email"], ["tel", "Teléfono"], ["sms", "SMS"], ["whatsapp", "WhatsApp"], ["vcard", "Contacto (vCard)"]];
  function qr(root) {
    var kind = "url", f = {}, canvasData = null;
    var inp = function (k, label, ph, type) { return F(label, '<input class="input" data-k="' + k + '" type="' + (type || "text") + '" placeholder="' + (ph || "") + '" value="' + MB.esc(f[k] || "") + '">'); };
    var area = function (k, label) { return F(label, '<textarea class="input" rows="3" data-k="' + k + '">' + MB.esc(f[k] || "") + "</textarea>"); };
    function forms() {
      return { url: inp("url", "Dirección web", "ejemplo.com"), text: area("text", "Texto"),
        wifi: inp("ssid", "Nombre de la red (SSID)") + F("Seguridad", '<select class="input" data-k="enc"><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">Sin contraseña</option></select>') + inp("pass", "Contraseña", "", "password"),
        email: inp("to", "Para", "correo@ejemplo.com", "email") + inp("subject", "Asunto") + area("body", "Mensaje"),
        tel: inp("tel", "Teléfono (con código de país)", "+54 9 11 1234 5678", "tel"),
        sms: inp("tel", "Teléfono (con código de país)", "+54 9 11 1234 5678", "tel") + area("body", "Mensaje"),
        whatsapp: inp("tel", "Número (con código de país)", "+54 9 11 1234 5678", "tel") + inp("msg", "Mensaje inicial (opcional)"),
        vcard: inp("name", "Nombre completo") + inp("tel", "Teléfono", "", "tel") + inp("to", "Email", "", "email") + inp("org", "Organización") + inp("url", "Sitio web") };
    }
    root.innerHTML =
      '<div class="qr-wrap"><div class="stack"><div class="row" role="tablist" aria-label="Tipo de QR">' +
      QR_KINDS.map(function (k) { return '<button class="pill" role="tab" data-kind="' + k[0] + '">' + k[1] + "</button>"; }).join("") +
      '</div><div class="stack-sm" id="form"></div>' +
      '<details class="card"><summary>Personalizar</summary><div class="cols cols-2" style="margin-top:16px">' +
      F('Tamaño: <span id="sizev">320</span>px', '<input type="range" id="size" min="128" max="1024" step="32" value="320">') +
      F('Margen: <span id="marv">2</span>', '<input type="range" id="margin" min="0" max="8" value="2">') +
      F("Color del código", '<input type="color" id="fg" value="#000000">') + F("Color de fondo", '<input type="color" id="bg" value="#ffffff">') +
      F("Corrección de errores", '<select class="input" id="ecl"><option value="L">Baja (7%)</option><option value="M" selected>Media (15%)</option><option value="Q">Alta (25%)</option><option value="H">Máxima (30%)</option></select>') +
      '</div><p class="small muted" style="margin-top:12px">Usá buen contraste entre código y fondo, o algunos lectores no podrán escanearlo.</p></details></div>' +
      '<div class="stack-sm"><div class="card qr-box"><canvas id="cv" class="hidden"></canvas><p class="muted center" id="ph">Completá los datos para ver el QR.</p></div>' +
      '<div id="err"></div><div class="row"><button class="btn btn-primary grow" id="dlpng" disabled><i data-lucide="download"></i> PNG</button><button class="btn btn-ghost grow" id="dlsvg" disabled><i data-lucide="download"></i> SVG</button></div></div></div>';

    function digits(s) { return (s || "").replace(/\D/g, ""); }
    function esc(s) { return s.replace(/([\\;,:"])/g, "\\$1"); }
    function content() {
      var g = function (k) { return (f[k] || "").trim(); };
      switch (kind) {
        case "url": var u = g("url"); return u ? (/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : "https://" + u) : "";
        case "text": return f.text || "";
        case "wifi": return g("ssid") ? "WIFI:T:" + (f.enc || "WPA") + ";S:" + esc(g("ssid")) + ";P:" + ((f.enc === "nopass") ? "" : esc(f.pass || "")) + ";;" : "";
        case "email": return g("to") ? "mailto:" + g("to") + "?subject=" + encodeURIComponent(f.subject || "") + "&body=" + encodeURIComponent(f.body || "") : "";
        case "tel": return digits(g("tel")) ? "tel:+" + digits(g("tel")) : "";
        case "sms": return digits(g("tel")) ? "SMSTO:+" + digits(g("tel")) + ":" + (f.body || "") : "";
        case "whatsapp": return digits(g("tel")) ? "https://wa.me/" + digits(g("tel")) + (g("msg") ? "?text=" + encodeURIComponent(f.msg) : "") : "";
        case "vcard": return g("name") ? "BEGIN:VCARD\nVERSION:3.0\nFN:" + g("name") + "\nTEL:" + g("tel") + "\nEMAIL:" + g("to") + "\nORG:" + g("org") + "\nURL:" + g("url") + "\nEND:VCARD" : "";
      }
      return "";
    }
    function build(text) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
      var q = qrcode(0, $("#ecl", root).value); q.addData(text); q.make(); return q;
    }
    function draw() {
      var text = content(), cv = $("#cv", root), ph = $("#ph", root), err = $("#err", root);
      err.innerHTML = ""; canvasData = null;
      $("#dlpng", root).disabled = $("#dlsvg", root).disabled = true;
      if (!text) { cv.classList.add("hidden"); ph.classList.remove("hidden"); return; }
      var q;
      try { q = build(text); } catch (e) { cv.classList.add("hidden"); ph.classList.remove("hidden"); err.innerHTML = '<div class="notice error">El contenido es demasiado largo para un código QR.</div>'; return; }
      var n = q.getModuleCount(), size = +val(root, "#size"), m = +val(root, "#margin"), cell = Math.max(1, Math.floor(size / (n + 2 * m))), total = cell * (n + 2 * m);
      cv.width = cv.height = total; var c = cv.getContext("2d");
      c.fillStyle = val(root, "#bg"); c.fillRect(0, 0, total, total); c.fillStyle = val(root, "#fg");
      for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect((k + m) * cell, (r + m) * cell, cell, cell);
      cv.classList.remove("hidden"); ph.classList.add("hidden"); canvasData = { q: q, n: n, m: m };
      $("#dlpng", root).disabled = $("#dlsvg", root).disabled = false;
    }
    function showForm() {
      $("#form", root).innerHTML = forms()[kind];
      MB.$$("[data-k]", root).forEach(function (e) {
        if (e.tagName === "SELECT" && f[e.dataset.k]) e.value = f[e.dataset.k];
        e.addEventListener("input", function () { f[e.dataset.k] = e.value; draw(); });
      });
      MB.$$("[data-kind]", root).forEach(function (b) { b.classList.toggle("on", b.dataset.kind === kind); b.setAttribute("aria-selected", b.dataset.kind === kind); });
      draw();
    }
    on(root, "[data-kind]", "click", function (e) { kind = e.currentTarget.dataset.kind; showForm(); });
    ["size", "margin", "fg", "bg", "ecl"].forEach(function (id) {
      $("#" + id, root).addEventListener("input", function () { $("#sizev", root).textContent = val(root, "#size"); $("#marv", root).textContent = val(root, "#margin"); draw(); });
    });
    $("#dlpng", root).addEventListener("click", function () { $("#cv", root).toBlob(function (b) { MB.download("qr.png", b); }); });
    $("#dlsvg", root).addEventListener("click", function () {
      if (!canvasData) return; var d = canvasData, tot = d.n + 2 * d.m, p = "";
      for (var r = 0; r < d.n; r++) for (var k = 0; k < d.n; k++) if (d.q.isDark(r, k)) p += "M" + (k + d.m) + " " + (r + d.m) + "h1v1h-1z";
      MB.download("qr.svg", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + tot + " " + tot + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="' + val(root, "#bg") + '"/><path d="' + p + '" fill="' + val(root, "#fg") + '"/></svg>', "image/svg+xml");
    });
    f.enc = "WPA"; showForm();
  }

  /* ───────── Nombres ───────── */
  var NM = ["Santiago", "Mateo", "Benjamín", "Lucas", "Thiago", "Joaquín", "Martín", "Nicolás", "Diego", "Gabriel", "Sebastián", "Emiliano", "Tomás", "Agustín", "Bruno", "Facundo", "Andrés", "Javier", "Ignacio", "Rodrigo"];
  var NF = ["Sofía", "Valentina", "Isabella", "Camila", "Martina", "Lucía", "Julieta", "Emma", "Valeria", "Catalina", "Renata", "Mía", "Paula", "Daniela", "Antonella", "Florencia", "Carolina", "Mariana", "Abril", "Elena"];
  var NL = ["García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Romero", "Díaz", "Torres", "Álvarez", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina", "Herrera", "Castro", "Vargas", "Ortega", "Silva", "Molina", "Suárez"];
  function names(root) {
    root.innerHTML = '<div class="stack"><div class="cols cols-3">' +
      F("Tipo", '<select class="input" id="kind"><option value="any">Cualquiera</option><option value="m">Masculino</option><option value="f">Femenino</option></select>') +
      F("Cantidad (1–100)", '<input class="input" id="n" type="number" min="1" max="100" value="10">') +
      '<div class="row-end"><button class="btn btn-primary" id="gen"><i data-lucide="refresh-cw"></i> Generar</button>' + MB.copyBtn("#all", "Copiar todo") + '</div></div>' +
      '<textarea id="all" class="hidden"></textarea><ul class="list-plain cols cols-2" id="list" style="display:grid"></ul></div>';
    function gen() {
      var k = val(root, "#kind"), n = num(root, "#n", 1, 100, 10), pool = k === "m" ? NM : k === "f" ? NF : NM.concat(NF), out = [];
      for (var i = 0; i < n; i++) out.push(R.pick(pool) + " " + R.pick(NL));
      $("#list", root).innerHTML = out.map(function (x) { return "<li>" + MB.esc(x) + "</li>"; }).join(""); $("#all", root).value = out.join("\n");
    }
    on(root, "#gen", "click", gen); on(root, "#kind", "change", gen); MB.bindCopy(root); gen();
  }

  /* ───────── Números ───────── */
  function numbers(root) {
    root.innerHTML = '<div class="stack"><div class="cols cols-4">' +
      F("Mínimo", '<input class="input" id="min" type="number" value="1">') + F("Máximo", '<input class="input" id="max" type="number" value="100">') +
      F("Cantidad", '<input class="input" id="n" type="number" value="5">') + F("Decimales", '<input class="input" id="dec" type="number" value="0">') +
      '</div><label class="check"><input type="checkbox" id="uniq"> Sin repetidos</label>' +
      '<div class="row"><button class="btn btn-primary" id="gen"><i data-lucide="refresh-cw"></i> Generar</button>' + MB.copyBtn("#res") + '</div><div id="err"></div>' +
      '<output id="res" class="hidden"></output><div class="card row mono" id="chips" style="padding:16px;font-size:1.1rem"></div></div>';
    function gen() {
      var min = parseFloat(val(root, "#min")), max = parseFloat(val(root, "#max")), n = parseInt(val(root, "#n"), 10), dec = parseInt(val(root, "#dec"), 10), uniq = chk(root, "#uniq"), err = $("#err", root);
      function bad(m) { err.innerHTML = '<div class="notice error" role="alert">' + m + "</div>"; }
      err.innerHTML = "";
      if (![min, max, n, dec].every(isFinite)) return bad("Completá todos los campos con números válidos.");
      if (min > max) return bad("El mínimo no puede ser mayor que el máximo.");
      if (n < 1 || n > 1000) return bad("La cantidad debe estar entre 1 y 1000.");
      if (dec < 0 || dec > 10) return bad("Los decimales deben estar entre 0 y 10.");
      if (dec === 0 && Math.floor(max) < Math.ceil(min)) return bad("No hay enteros en ese rango.");
      if (uniq && dec === 0 && Math.floor(max) - Math.ceil(min) + 1 < n) return bad("No hay suficientes valores distintos en ese rango.");
      var res = [], seen = {}, guard = 0;
      while (res.length < n && guard++ < n * 50) {
        var v = dec === 0 ? String(Math.ceil(min) + R.int(Math.floor(max) - Math.ceil(min) + 1)) : (min + R.float() * (max - min)).toFixed(dec);
        if (uniq && seen[v]) continue; seen[v] = 1; res.push(v);
      }
      $("#res", root).textContent = res.join(", ");
      $("#chips", root).innerHTML = res.map(function (x) { return '<span class="badge" style="background:var(--surface2);font-size:1rem;padding:4px 12px">' + x + "</span>"; }).join("");
    }
    on(root, "#gen", "click", gen); MB.bindCopy(root); gen();
  }

  /* ───────── UUID ───────── */
  function uuidv4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, "0"); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  function uuid(root) {
    root.innerHTML = '<div class="stack"><div class="cols cols-3">' + F("Cantidad (1–500)", '<input class="input" id="n" type="number" min="1" max="500" value="5">') +
      '<label class="check row-end"><input type="checkbox" id="up"> Mayúsculas</label><label class="check row-end"><input type="checkbox" id="da" checked> Con guiones</label></div>' +
      '<div class="row"><button class="btn btn-primary" id="gen"><i data-lucide="refresh-cw"></i> Generar UUID v4</button>' + MB.copyBtn("#out", "Copiar todo") + '</div>' +
      '<textarea class="input mono" id="out" rows="8" readonly aria-label="UUIDs generados"></textarea></div>';
    var ids = [];
    function show() { var up = chk(root, "#up"), da = chk(root, "#da"); $("#out", root).value = ids.map(function (s) { s = da ? s : s.replace(/-/g, ""); return up ? s.toUpperCase() : s; }).join("\n"); }
    function gen() { ids = []; for (var i = 0, n = num(root, "#n", 1, 500, 5); i < n; i++) ids.push(uuidv4()); $("#out", root).rows = Math.min(14, ids.length + 1); show(); }
    on(root, "#gen", "click", gen); on(root, "#up", "change", show); on(root, "#da", "change", show); MB.bindCopy(root); gen();
  }

  /* ───────── Texto aleatorio ───────── */
  var SYL = "ba be bi bo bu ca co cu da de di do fa fe fi ga go la le li lo lu ma me mi mo na ne ni no pa pe pi po ra re ri ro sa se si so ta te ti to va ve vi za".split(" ");
  var CS = { alnum: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", letters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", hex: "0123456789abcdef", digits: "0123456789" };
  function randomText(root) {
    root.innerHTML = '<div class="stack"><div class="cols cols-4">' +
      F("Modo", '<select class="input" id="mode"><option value="words">Palabras inventadas</option><option value="chars">Cadena de caracteres</option></select>') +
      F("Caracteres", '<select class="input" id="cs"><option value="alnum">Letras y números</option><option value="letters">Solo letras</option><option value="hex">Hexadecimal</option><option value="digits">Solo números</option></select>') +
      F('<span id="lenl">Palabras por texto</span>', '<input class="input" id="len" type="number" min="1" max="1000" value="24">') +
      F("Cantidad", '<input class="input" id="n" type="number" min="1" max="200" value="5">') + '</div>' +
      '<div class="row"><button class="btn btn-primary" id="gen"><i data-lucide="refresh-cw"></i> Generar</button>' + MB.copyBtn("#out", "Copiar todo") + '</div>' +
      '<textarea class="input mono" id="out" rows="10" readonly aria-label="Texto generado"></textarea></div>';
    function gen() {
      var mode = val(root, "#mode"), l = num(root, "#len", 1, 1000, 24), n = num(root, "#n", 1, 200, 5), out = [];
      $("#cs", root).closest("label").classList.toggle("hidden", mode !== "chars"); $("#lenl", root).textContent = mode === "words" ? "Palabras por texto" : "Longitud";
      for (var i = 0; i < n; i++) {
        if (mode === "chars") { var cs = CS[val(root, "#cs")], s = ""; for (var j = 0; j < l; j++) s += cs[R.int(cs.length)]; out.push(s); }
        else { var w = []; for (var k = 0; k < l; k++) { var p = "", c = 1 + R.int(3); while (c--) p += R.pick(SYL); w.push(p); } out.push(w.join(" ")); }
      }
      $("#out", root).value = out.join("\n");
    }
    on(root, "#gen", "click", gen); on(root, "select", "change", gen); on(root, "input", "input", gen); MB.bindCopy(root); gen();
  }

  /* ───────── Colores ───────── */
  function colorInfo(r, g, b) {
    var hex = "#" + [r, g, b].map(function (x) { return x.toString(16).padStart(2, "0"); }).join("").toUpperCase();
    var rr = r / 255, gg = g / 255, bb = b / 255, mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), d = mx - mn, l = (mx + mn) / 2, h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === rr ? ((gg - bb) / d) % 6 : mx === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4; h = (h * 60 + 360) % 360; }
    return { hex: hex, rgb: "rgb(" + r + ", " + g + ", " + b + ")", hsl: "hsl(" + Math.round(h) + ", " + Math.round(s * 100) + "%, " + Math.round(l * 100) + "%)", dark: 0.299 * r + 0.587 * g + 0.114 * b < 150 };
  }
  function colors(root) {
    root.innerHTML = '<div class="stack"><div><button class="btn btn-primary" id="gen"><i data-lucide="refresh-cw"></i> Nueva paleta</button></div><div class="cols cols-4" id="pal"></div></div>';
    function gen() {
      var h = "";
      for (var i = 0; i < 8; i++) {
        var c = colorInfo(R.int(256), R.int(256), R.int(256));
        h += '<div class="card" style="overflow:hidden"><div class="swatch" style="background:' + c.hex + ";color:" + (c.dark ? "#fff" : "#000") + '">' + c.hex + '</div><div class="stack-sm" style="padding:12px;font-size:.8rem">' +
          [["HEX", c.hex], ["RGB", c.rgb], ["HSL", c.hsl]].map(function (p) { return '<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="mono muted">' + p[0] + '</span><span class="mono" style="overflow:hidden;text-overflow:ellipsis">' + p[1] + '</span><button class="btn btn-ghost btn-sm btn-icon" data-v="' + p[1] + '" aria-label="Copiar ' + p[0] + '"><i data-lucide="copy"></i></button></div>'; }).join("") + "</div></div>";
      }
      $("#pal", root).innerHTML = h; MB.icons();
      on(root, "[data-v]", "click", function (e) { MB.copy(e.currentTarget.dataset.v); });
    }
    on(root, "#gen", "click", gen); gen();
  }

  /* ───────── Hashes ───────── */
  function hash(root) {
    root.innerHTML = '<div class="stack">' + F("Texto", '<textarea class="input mono" id="txt" rows="4" placeholder="Escribí o pegá el texto…"></textarea>') +
      F("…o un archivo (se procesa localmente)", '<input class="input" id="file" type="file">') +
      '<div id="err"></div><div class="stack-sm" id="res"></div>' +
      '<p class="small muted">MD5 no se incluye: Web Crypto no lo ofrece y no es seguro para uso criptográfico.</p></div>';
    var token = 0;
    async function calc() {
      var my = ++token, file = $("#file", root).files[0], text = val(root, "#txt");
      $("#txt", root).disabled = !!file;
      var res = $("#res", root), err = $("#err", root); err.innerHTML = "";
      if (!file && !text) { res.innerHTML = ""; return; }
      try {
        var data = file ? await file.arrayBuffer() : new TextEncoder().encode(text), out = "";
        for (var a of ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]) {
          var h = Array.prototype.map.call(new Uint8Array(await crypto.subtle.digest(a, data)), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
          out += '<div class="card" style="padding:12px"><div class="row" style="justify-content:space-between"><b class="small gradient-text">' + a + '</b><button class="btn btn-ghost btn-sm" data-v="' + h + '"><i data-lucide="copy"></i> Copiar</button></div><p class="mono small" style="word-break:break-all">' + h + "</p></div>";
        }
        if (my !== token) return; res.innerHTML = out; MB.icons(); on(res, "[data-v]", "click", function (e) { MB.copy(e.currentTarget.dataset.v); });
      } catch (e) { err.innerHTML = '<div class="notice error">No se pudo calcular el hash (Web Crypto requiere https o localhost).</div>'; }
    }
    on(root, "#txt", "input", calc); on(root, "#file", "change", calc);
  }

  /* ───────── Lorem Ipsum ───────── */
  var LW = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");
  function lorem(root) {
    root.innerHTML = '<div class="stack"><div class="cols cols-3">' +
      F("Unidad", '<select class="input" id="u"><option value="p">Párrafos</option><option value="s">Oraciones</option><option value="w">Palabras</option></select>') +
      F("Cantidad (1–100)", '<input class="input" id="n" type="number" min="1" max="100" value="3">') +
      '<div class="row-end"><button class="btn btn-primary" id="gen"><i data-lucide="refresh-cw"></i> Generar</button>' + MB.copyBtn("#out") + '</div></div>' +
      '<div class="row" style="gap:20px"><label class="check"><input type="checkbox" id="cl" checked> Empezar con "Lorem ipsum"</label><label class="check"><input type="checkbox" id="ht"> Envolver en &lt;p&gt;</label></div>' +
      '<textarea class="input" id="out" rows="12" readonly aria-label="Lorem Ipsum generado"></textarea></div>';
    function sentence() { var n = 6 + R.int(10), w = []; for (var i = 0; i < n; i++) w.push(R.pick(LW)); if (n > 8) w[3 + R.int(3)] += ","; var s = w.join(" "); return s.charAt(0).toUpperCase() + s.slice(1) + "."; }
    function gen() {
      var u = val(root, "#u"), c = num(root, "#n", 1, 100, 3), items = [], i;
      $("#ht", root).disabled = u !== "p";
      if (u === "w") { var w = []; for (i = 0; i < c; i++) w.push(R.pick(LW)); items = [w.join(" ")]; }
      else if (u === "s") { var s = []; for (i = 0; i < c; i++) s.push(sentence()); items = [s.join(" ")]; }
      else for (i = 0; i < c; i++) { var p = [], k = 3 + R.int(4); while (k--) p.push(sentence()); items.push(p.join(" ")); }
      if (chk(root, "#cl")) items[0] = items[0].replace(/^[^ ]+ [^ ]+/, "Lorem ipsum");
      $("#out", root).value = chk(root, "#ht") && u === "p" ? items.map(function (x) { return "<p>" + x + "</p>"; }).join("\n") : items.join("\n\n");
    }
    on(root, "#gen", "click", gen); on(root, "select", "change", gen); on(root, "input", "input", gen); on(root, "[type=checkbox]", "change", gen); MB.bindCopy(root); gen();
  }

  /* ───────── Slugs ───────── */
  function slug(root) {
    root.innerHTML = '<div class="stack">' + F("Título o frase", '<input class="input" id="t" placeholder="Mi primer artículo: ¡Hola, mundo!">') +
      F("Separador", '<select class="input" id="sep" style="max-width:220px"><option value="-">Guion (-)</option><option value="_">Guion bajo (_)</option></select>') +
      '<div class="row"><output class="output grow mono" id="out">…</output>' + MB.copyBtn("#out") + "</div></div>";
    function gen() {
      var sep = val(root, "#sep"), s = val(root, "#t").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, sep);
      while (s.charAt(0) === sep) s = s.slice(1); while (s.charAt(s.length - 1) === sep) s = s.slice(0, -1);
      $("#out", root).textContent = s || "…";
    }
    on(root, "#t", "input", gen); on(root, "#sep", "change", gen);
    $("[data-copy]", root).addEventListener("click", function () { var t = $("#out", root).textContent; if (t !== "…") MB.copy(t); });
    gen();
  }

  /* ───────── Enlace de WhatsApp ───────── */
  function whatsapp(root) {
    root.innerHTML = '<div class="stack">' + F("Número con código de país", '<input class="input" id="tel" type="tel" placeholder="+54 9 11 1234 5678">', "Ejemplo Argentina: +54 9 11 1234 5678") +
      F("Mensaje inicial (opcional)", '<textarea class="input" id="msg" rows="3"></textarea>') +
      '<div class="row"><output class="output grow mono small" id="out">Ingresá un número válido</output>' + MB.copyBtn("#out") + '<a class="btn btn-primary hidden" id="try" target="_blank" rel="noopener noreferrer">Probar</a></div></div>';
    var link = "";
    function gen() {
      var d = val(root, "#tel").replace(/\D/g, ""), m = val(root, "#msg").trim();
      link = d.length >= 8 ? "https://wa.me/" + d + (m ? "?text=" + encodeURIComponent(m) : "") : "";
      $("#out", root).textContent = link || "Ingresá un número válido"; var t = $("#try", root); t.classList.toggle("hidden", !link); if (link) t.href = link;
    }
    on(root, "input,textarea", "input", gen);
    $("[data-copy]", root).addEventListener("click", function () { MB.copy(link); }); gen();
  }

  /* ───────── UTM ───────── */
  function utm(root) {
    var keys = [["utm_source", "Fuente (source)"], ["utm_medium", "Medio (medium)"], ["utm_campaign", "Campaña (campaign)"], ["utm_term", "Término (term)"], ["utm_content", "Contenido (content)"]];
    root.innerHTML = '<div class="stack">' + F("URL de destino", '<input class="input" id="url" placeholder="https://minibenja.com">') +
      '<div class="cols cols-2">' + keys.map(function (k) { return F(k[1], '<input class="input" data-p="' + k[0] + '">'); }).join("") + '</div><div id="err"></div>' +
      '<div class="row"><output class="output grow mono small" id="out">…</output>' + MB.copyBtn("#out") + "</div></div>";
    var link = "";
    function gen() {
      var raw = val(root, "#url").trim(), err = $("#err", root); err.innerHTML = ""; link = "";
      if (raw) {
        try { var u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw); MB.$$("[data-p]", root).forEach(function (i) { if (i.value.trim()) u.searchParams.set(i.dataset.p, i.value.trim()); }); link = u.toString(); }
        catch (e) { err.innerHTML = '<div class="notice error">La URL no es válida.</div>'; }
      }
      $("#out", root).textContent = link || "…";
    }
    on(root, "input", "input", gen); $("[data-copy]", root).addEventListener("click", function () { MB.copy(link); }); gen();
  }

  MB.GENERADORES = [
    { slug: "contrasenas", name: "Contraseñas", icon: "key-round", tags: "password clave seguridad", desc: "Contraseñas aleatorias seguras con medidor de fortaleza.", render: password },
    { slug: "qr", name: "Códigos QR", icon: "qr-code", tags: "qr wifi vcard whatsapp", desc: "URL, texto, WiFi, email, teléfono, SMS, WhatsApp y contacto. PNG y SVG.", render: qr },
    { slug: "nombres", name: "Nombres", icon: "users", tags: "nombre persona", desc: "Nombres completos aleatorios para pruebas y borradores.", render: names },
    { slug: "numeros", name: "Números aleatorios", icon: "dices", tags: "random azar", desc: "Enteros o decimales en un rango, con o sin repetidos.", render: numbers },
    { slug: "uuid", name: "UUID", icon: "fingerprint", tags: "guid id", desc: "Identificadores UUID v4 en lote.", render: uuid },
    { slug: "texto", name: "Texto aleatorio", icon: "shuffle", tags: "string random", desc: "Cadenas de caracteres o palabras inventadas.", render: randomText },
    { slug: "colores", name: "Colores", icon: "palette", tags: "hex rgb hsl paleta", desc: "Paletas aleatorias en HEX, RGB y HSL.", render: colors },
    { slug: "hash", name: "Hashes", icon: "hash", tags: "sha checksum", desc: "SHA-1, SHA-256, SHA-384 y SHA-512 de texto o archivos.", render: hash },
    { slug: "lorem", name: "Lorem Ipsum", icon: "align-left", tags: "placeholder relleno", desc: "Párrafos, oraciones o palabras de relleno.", render: lorem },
    { slug: "slug", name: "Slugs", icon: "link", tags: "seo url", desc: "Convierte títulos en URLs limpias, sin acentos.", render: slug },
    { slug: "whatsapp", name: "Enlace de WhatsApp", icon: "message-circle", tags: "wa.me chat", desc: "Crea un enlace wa.me con mensaje predefinido.", render: whatsapp },
    { slug: "utm", name: "Constructor UTM", icon: "megaphone", tags: "marketing analytics", desc: "Agrega parámetros UTM a tus enlaces de campaña.", render: utm }
  ];
})();
