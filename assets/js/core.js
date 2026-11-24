/* MINIBENJA — núcleo compartido: utilidades, navegación, tema, tarjetas y router por hash. */
(function () {
  "use strict";
  var MB = (window.MB = {});

  /* ───────── utilidades DOM ───────── */
  MB.$ = function (s, r) { return (r || document).querySelector(s); };
  MB.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  MB.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  MB.icons = function () { if (window.lucide) window.lucide.createIcons(); };
  MB.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
  MB.pad = function (n) { return String(n).padStart(2, "0"); };

  /* ───────── almacenamiento local (solo en tu navegador) ───────── */
  MB.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ───────── aleatoriedad criptográfica ───────── */
  MB.rand = {
    int: function (max) { // entero uniforme en [0,max) sin sesgo
      if (max <= 0) return 0;
      var buf = new Uint32Array(1), limit = Math.floor(0x100000000 / max) * max;
      do crypto.getRandomValues(buf); while (buf[0] >= limit);
      return buf[0] % max;
    },
    pick: function (a) { return a[MB.rand.int(a.length)]; },
    float: function () { var b = new Uint32Array(2); crypto.getRandomValues(b); return (b[0] * 2097152 + (b[1] >>> 11)) / 9007199254740992; },
    shuffle: function (arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = MB.rand.int(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  };

  /* ───────── portapapeles, descargas y avisos ───────── */
  MB.toast = function (msg) {
    var t = MB.$(".toast") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast", role: "status" }));
    t.textContent = msg; t.classList.add("show");
    clearTimeout(MB._tt); MB._tt = setTimeout(function () { t.classList.remove("show"); }, 1600);
  };
  MB.copy = function (text) {
    if (!text) return;
    var done = function () { MB.toast("Copiado al portapapeles"); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) { MB.toast("No se pudo copiar"); } t.remove();
    }
  };
  MB.download = function (name, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || "text/plain" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
  /** Conecta botones con data-copy="#idElemento" (o data-copy-fn). */
  MB.bindCopy = function (root, getter) {
    MB.$$("[data-copy]", root).forEach(function (b) {
      b.addEventListener("click", function () { MB.copy(getter ? getter(b.getAttribute("data-copy")) : (MB.$(b.getAttribute("data-copy"), root) || {}).value || (MB.$(b.getAttribute("data-copy"), root) || {}).textContent); });
    });
  };
  MB.copyBtn = function (target, label) {
    return '<button type="button" class="btn btn-ghost" data-copy="' + target + '"><i data-lucide="copy"></i> ' + (label === undefined ? "Copiar" : label) + "</button>";
  };

  /* ───────── aplicaciones del portal ───────── */
  // Los enlaces usan RUTAS (/generador/, /tools/): funcionan en minibenja.com sin configurar subdominios.
  // Si estás en un subdominio (generador.minibenja.com), los enlaces apuntan al dominio principal.
  var onSub = /^(generador|tools)\.minibenja\.com$/.test(location.hostname);
  var prod = onSub;
  var base = onSub ? "https://minibenja.com/" : location.pathname.replace(/\/(generador|tools)(\/(index\.html)?)?$/, "/").replace(/index\.html$/, "");
  MB.APPS = [
    { id: "generador", name: "Generadores", icon: "wand-sparkles", status: "ok", tags: "qr contraseña password uuid hash url lorem color",
      desc: "Contraseñas, códigos QR, UUID, hashes, colores, Lorem Ipsum, slugs, enlaces de WhatsApp y UTM.",
      url: base + "generador/" },
    { id: "tools", name: "Herramientas", icon: "wrench", status: "ok", tags: "json base64 markdown calculadora reloj conversor cronometro",
      desc: "Calculadora, conversores, JSON, Base64, URL, cronómetro, temporizador, reloj mundial y Markdown.",
      url: base + "tools/" },
    { id: "talky", name: "Talky Talky", icon: "messages-square", status: "ext", external: true, tags: "chat mensajes",
      desc: "Aplicación de mensajes publicada en talky-talky.vercel.app.", url: "https://talky-talky.vercel.app" }
  ];
  MB.HOME = base;

  /* ───────── tema claro / oscuro ───────── */
  function isDark() { return document.documentElement.classList.contains("dark"); }
  function setThemeIcon(btn) {
    btn.innerHTML = '<i data-lucide="' + (isDark() ? "sun" : "moon") + '"></i>';
    btn.setAttribute("aria-label", isDark() ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
    MB.icons();
  }

  /* ───────── barra superior y pie ───────── */
  MB.layout = function (current) {
    var links = MB.APPS.map(function (a) {
      return '<a href="' + a.url + '"' + (a.external ? ' target="_blank" rel="noopener noreferrer"' : "") + (a.id === current ? ' class="active"' : "") + ">" + a.name + "</a>";
    }).join("");
    var nav = MB.$("#nav");
    nav.className = "nav";
    nav.innerHTML =
      '<div class="container"><div class="nav-in">' +
      '<a class="logo" href="' + MB.HOME + '" aria-label="MINIBENJA"><span class="logo-mark"><i data-lucide="sparkles"></i></span><span>MINI<span class="gradient-text">BENJA</span></span></a>' +
      '<nav class="nav-links" aria-label="Aplicaciones">' + links + "</nav>" +
      '<div class="nav-actions"><button class="btn btn-ghost btn-icon" id="themeBtn" title="Cambiar tema"></button>' +
      '<button class="btn btn-ghost btn-icon menu-btn" id="menuBtn" aria-label="Menú" aria-expanded="false"><i data-lucide="menu"></i></button></div>' +
      '</div><nav class="mobile-menu hidden" id="mobileMenu" aria-label="Aplicaciones (móvil)">' + links + "</nav></div>";
    var tb = MB.$("#themeBtn"); setThemeIcon(tb);
    tb.addEventListener("click", function () {
      document.documentElement.classList.toggle("dark");
      MB.store.set("mb-theme", isDark() ? "dark" : "light"); setThemeIcon(tb);
    });
    var mb = MB.$("#menuBtn"), mm = MB.$("#mobileMenu");
    mb.addEventListener("click", function () {
      var open = mm.classList.toggle("hidden") === false;
      mb.setAttribute("aria-expanded", open); mb.innerHTML = '<i data-lucide="' + (open ? "x" : "menu") + '"></i>'; MB.icons();
    });
    var f = MB.$("#foot");
    f.className = "footer";
    f.innerHTML = '<div class="container footer-in"><a class="logo" href="' + MB.HOME + '"><span class="logo-mark"><i data-lucide="sparkles"></i></span><span>MINI<span class="gradient-text">BENJA</span></span></a>' +
      "<p>© " + new Date().getFullYear() + " MINIBENJA · Herramientas online gratuitas</p></div>";
    MB.icons();
  };

  /* ───────── cuadrícula de tarjetas con buscador ───────── */
  MB.grid = function (root, items, placeholder) {
    root.innerHTML =
      '<div class="search"><i data-lucide="search"></i><input class="input" type="search" placeholder="' + MB.esc(placeholder) + '" aria-label="' + MB.esc(placeholder) + '" autocomplete="off"></div>' +
      '<ul class="tiles"></ul><p class="empty hidden">No hay resultados.</p>';
    var ul = MB.$(".tiles", root), empty = MB.$(".empty", root), input = MB.$("input", root);
    function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    function draw() {
      var q = norm(input.value.trim());
      var list = items.filter(function (i) { return !q || norm(i.name + " " + i.desc + " " + (i.tags || "")).indexOf(q) !== -1; });
      ul.innerHTML = list.map(function (i, n) {
        var badge = i.status === "ext" ? '<span class="badge ext">Externo</span>' : '<span class="badge ok">Disponible</span>';
        return '<li><a class="tile" style="animation-delay:' + Math.min(n, 12) * 40 + 'ms" href="' + i.href + '"' + (i.external ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" +
          '<div class="tile-top"><span class="ico"><i data-lucide="' + i.icon + '"></i></span>' + badge + "</div>" +
          "<h3>" + MB.esc(i.name) + "</h3><p>" + MB.esc(i.desc) + '</p><span class="go">' + (i.cta || "Entrar") + ' <i data-lucide="arrow-up-right"></i></span></a></li>';
      }).join("");
      empty.classList.toggle("hidden", list.length > 0);
      empty.textContent = 'No hay resultados para "' + input.value + '".';
      MB.icons();
    }
    input.addEventListener("input", draw); draw();
  };

  MB.hero = function (eyebrow, titleHtml, subtitle) {
    return '<section class="hero"><span class="eyebrow">' + eyebrow + "</span><h1>" + titleHtml + "</h1><p>" + subtitle + "</p></section>";
  };
  MB.field = function (label, inner, hint) {
    return '<label class="field"><span class="label">' + label + "</span>" + inner + (hint ? '<span class="hint">' + hint + "</span>" : "") + "</label>";
  };

  /* ───────── sitio con varias herramientas (router por #/slug) ─────────
     cfg: { current, eyebrow, title, subtitle, placeholder, tools:[{slug,name,desc,icon,tags,render(root)->cleanup?}] } */
  MB.mountSite = function (cfg) {
    MB.layout(cfg.current);
    var main = MB.$("#app"), cleanup = null;
    function route() {
      if (typeof cleanup === "function") { try { cleanup(); } catch (e) {} }
      cleanup = null;
      var slug = decodeURIComponent((location.hash.match(/^#\/([\w-]+)/) || [])[1] || "");
      var tool = cfg.tools.filter(function (t) { return t.slug === slug; })[0];
      window.scrollTo(0, 0);
      if (!tool) {
        document.title = cfg.title + " · MINIBENJA";
        main.innerHTML = MB.hero(cfg.eyebrow, cfg.title, cfg.subtitle) + '<div id="grid"></div>';
        MB.grid(MB.$("#grid"), cfg.tools.map(function (t) { return { name: t.name, desc: t.desc, icon: t.icon, tags: t.tags, href: "#/" + t.slug, cta: "Abrir" }; }), cfg.placeholder);
        return;
      }
      document.title = tool.name + " · MINIBENJA";
      main.innerHTML =
        '<a class="back" href="#/"><i data-lucide="arrow-left"></i> Volver</a>' +
        '<div class="tool-head"><span class="ico"><i data-lucide="' + tool.icon + '"></i></span><div><h1>' + MB.esc(tool.name) + '</h1><p class="muted">' + MB.esc(tool.desc) + "</p></div></div>" +
        '<div class="card tool-body" id="tool"></div>';
      var root = MB.$("#tool");
      try { cleanup = tool.render(root); } catch (e) { root.innerHTML = '<div class="notice error">Error al cargar la herramienta: ' + MB.esc(e.message) + "</div>"; }
      MB.icons();
    }
    window.addEventListener("hashchange", route);
    route();
  };
})();
