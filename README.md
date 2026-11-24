# MINIBENJA

Portal de herramientas online hecho solo con **HTML, CSS y JavaScript** (sin Node, sin build, sin servidor ni base de datos). Todo se ejecuta en el navegador.

```
index.html                 → minibenja.com            (portal con buscador y tarjetas)
generador/index.html       → generador.minibenja.com  (12 generadores)
tools/index.html           → tools.minibenja.com      (13 herramientas)
assets/css/style.css       → estilos compartidos (tema oscuro/claro)
assets/js/core.js          → navegación, tema, tarjetas, router (#/herramienta)
assets/js/generadores.js   → lógica de los generadores
assets/js/herramientas.js  → lógica de las herramientas
assets/vendor/             → Lucide (iconos) y qrcode-generator, copiados localmente
vercel.json                → hace que cada subdominio muestre su página
```

- **Generadores:** contraseñas, códigos QR (URL, texto, WiFi, email, teléfono, SMS, WhatsApp, contacto; PNG y SVG), nombres, números, UUID, texto aleatorio, colores HEX/RGB/HSL, hashes SHA, Lorem Ipsum, slugs, enlace de WhatsApp y constructor UTM.
- **Herramientas:** calculadora, conversor de unidades, conversor de texto, contador, editor JSON, formateador JSON, Base64, codificador URL, cronómetro, temporizador, reloj mundial, selector de colores, visor Markdown.
- La home también enlaza a https://talky-talky.vercel.app.

## Probar en local
Abrí `index.html` con doble clic, o mejor con un servidor estático (copiar al portapapeles y los hashes requieren `https` o `localhost`):

```bash
python -m http.server 8000     # y abrí http://localhost:8000
```

## Desplegar en Vercel (un solo proyecto)

1. Subí esta carpeta a GitHub e importala en Vercel (*Add New → Project*). **Framework Preset: Other**; sin Build Command ni Output Directory (se sirve la raíz tal cual).
2. Con solo `minibenja.com` ya funciona todo: la home enlaza a `minibenja.com/generador/` y `minibenja.com/tools/`. Los subdominios son **opcionales** (pasos 3 en adelante). Para usarlos, en *Settings → Domains* agregá `generador.minibenja.com` y `tools.minibenja.com` al **mismo proyecto**.
3. (Solo para los subdominios) En tu proveedor de DNS creá un registro por subdominio con el valor que muestre Vercel:

   | Tipo | Nombre | Valor |
   |---|---|---|
   | `CNAME` | `generador` | `cname.vercel-dns.com` (o el valor que indique Vercel) |
   | `CNAME` | `tools` | idem |
   | `A` | `@` | `76.76.21.21` — solo si todavía no está así; no lo cambies si ya funciona |

   Con Cloudflare, usá "Solo DNS" (nube gris). Si tus nameservers son los de Vercel, los registros se crean solos.
4. **HTTPS** es automático (Let's Encrypt) en unos minutos. Si tenés registros `CAA`, debe permitir `letsencrypt.org`.
5. `vercel.json` hace que `generador.minibenja.com/` muestre `generador/index.html` y `tools.minibenja.com/` muestre `tools/index.html`. Además todo funciona por ruta: `minibenja.com/generador/` y `minibenja.com/tools/`.

**Para no romper `minibenja.com`:** si ya está en un proyecto de Vercel, usá ese mismo proyecto (conectalo a este repo) y agregá solo los dos subdominios nuevos. No hace falta tocar el DNS de la raíz.

**Variables de entorno:** ninguna.

## Privacidad
No hay servidor ni base de datos. Lo único que se guarda es en tu navegador (`localStorage`): el tema claro/oscuro y las zonas del reloj mundial.

## Versión anterior
La versión en Next.js/TypeScript quedó respaldada fuera del repo, en `../minibenja-next-backup`.
