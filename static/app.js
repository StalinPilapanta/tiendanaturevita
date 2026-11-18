/* Tienda: inicio, producto y checkout de pago contra entrega. Sin dependencias. */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const usd = (n) => "$" + Number(n).toFixed(2);
  const titulo = (t) => String(t || "").toLowerCase().replace(/(^|\s|-)\S/g, (m) => m.toUpperCase());
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
  const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };

  let CFG = { marca: "NatureVita EC", whatsapp: "", productos: {} };
  let UBIC = null;
  const agCache = {};

  // ------------------------------------------------------------ datos --
  async function api(url, opts) {
    const r = await fetch(url, opts);
    let j = null;
    try { j = await r.json(); } catch (e) { /* respuesta vacia */ }
    if (!r.ok) throw new Error((j && j.detail && (typeof j.detail === "string" ? j.detail : "Revisa los datos del formulario.")) || "No pudimos conectar. Intenta de nuevo.");
    return j;
  }
  const ubicaciones = async () => (UBIC ||= await api("/api/ubicaciones"));
  const agenciasDe = async (c) => (agCache[c] ||= await api("/api/agencias?ciudad=" + encodeURIComponent(c)));

  function waUrl(texto) {
    if (!CFG.whatsapp) return "#";
    return "https://api.whatsapp.com/send?phone=" + CFG.whatsapp + "&text=" + encodeURIComponent(texto);
  }
  function ponerWhatsApp(producto) {
    const t = producto ? `Hola ${CFG.marca}, tengo una duda sobre ${producto.nombre}.` : `Hola ${CFG.marca}, tengo una duda.`;
    $$(".wa-link").forEach((a) => (a.href = waUrl(t)));
  }

  // ------------------------------------------------------------ rutas --
  function ir(url) {
    history.pushState({}, "", url);
    render();
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-link]");
    if (!a || e.metaKey || e.ctrlKey) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return;
    e.preventDefault();
    if (u.pathname === location.pathname && u.hash) { $(u.hash)?.scrollIntoView({ behavior: "smooth" }); history.replaceState({}, "", u.pathname + u.hash); return; }
    ir(u.pathname + u.hash);
  });
  window.addEventListener("popstate", render);

  function render() {
    const slug = location.pathname.replace(/^\/|\/$/g, "");
    const p = CFG.productos[slug];
    document.body.classList.toggle("pdp-page", !!p);
    if (p) renderProducto(p);
    else if (slug === "terminos") renderTerminos();
    else renderInicio();
    ponerWhatsApp(p);
    if (location.hash) setTimeout(() => $(location.hash)?.scrollIntoView(), 30); else window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ inicio --
  const FAQ_GENERAL = [
    ["¿Cómo pago?", "En efectivo cuando recibes o retiras tu pedido. No necesitas tarjeta ni pagar nada por adelantado."],
    ["¿Cuánto cuesta el envío?", "Es gratis a todo Ecuador hasta la agencia Servientrega que elijas."],
    ["¿Cuánto tarda en llegar?", "De 1 a 3 días hábiles en ciudades principales y de 3 a 5 días en el resto del país."],
    ["¿Qué necesito para retirar en la agencia?", "Solo tu número de guía. Te lo enviamos por WhatsApp apenas despachamos tu pedido."],
    ["¿Cómo sé que mi pedido está confirmado?", "Al terminar te mostramos tu número de pedido y un botón para confirmarlo por WhatsApp. También te escribimos nosotros."],
    ["¿Y si llega con un problema?", "Si llega roto, en mal estado o equivocado, te lo reemplazamos gratis. Escríbenos por WhatsApp con una foto."],
  ];
  const faqHtml = (lista) => `<div class="faq">${lista.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>`;

  function renderInicio() {
    document.title = `${CFG.marca} · Bienestar con pago al recibir`;
    const prods = Object.values(CFG.productos);
    $("#app").innerHTML = `
      <section class="hero">
        <div class="wrap hero-in">
          <div>
            <span class="eyebrow">Bienestar natural · Ecuador</span>
            <h1>Bienestar que llega a tu ciudad. <span class="grad-text">Pagas al recibir.</span></h1>
            <p class="lead">Suplementos originales con envío gratis a todo el país. Retíralos en tu agencia Servientrega más cercana solo con tu número de guía.</p>
            <div class="hero-cta">
              <a href="#productos" data-link class="btn btn-primary">Ver productos</a>
              <a href="#envios" data-link class="btn btn-ghost">Buscar mi agencia</a>
            </div>
            <div class="trust"><span>Envío gratis</span><span>Pago contra entrega</span><span>Productos originales</span></div>
          </div>
          <div class="hero-art">
            ${prods.slice(0, 2).map((p) => `<a href="/${p.slug}" data-link class="card-img"><img src="${p.imagenes[0]}" alt="${esc(p.nombre)}"></a>`).join("")}
            <div class="chip-float">📦<div>Despacho con Servientrega<b>Más de 700 agencias</b></div></div>
          </div>
        </div>
      </section>

      <section class="section bg-blanco" id="productos">
        <div class="wrap">
          <div class="section-head"><h2>Nuestros productos</h2><p>Elige tu promo, te lo enviamos gratis y pagas cuando lo tienes en tus manos.</p></div>
          <div class="prod-grid">
            ${prods.map((p) => {
              const min = Math.min(...p.ofertas.map((o) => o.precio));
              return `<a href="/${p.slug}" data-link class="prod-card">
                <div class="pc-img"><img src="${p.imagenes[0]}" alt="${esc(p.nombre)}" loading="lazy"></div>
                <div class="pc-body">
                  <span class="tag ${p.acento === "azul" ? "tag-azul" : ""}">${esc(p.eyebrow)}</span>
                  <h3>${esc(p.nombre)}</h3>
                  <p class="muted">${esc(p.subtitulo)}</p>
                  <div class="desde">Desde<b>${usd(min)}</b></div>
                  <span class="btn btn-primary btn-sm">Ver promos →</span>
                </div></a>`;
            }).join("")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="wrap">
          <div class="section-head"><h2>Comprar es así de fácil</h2><p>Sin tarjetas ni registros. Solo tu nombre, tu celular y tu agencia.</p></div>
          <div class="pasos">
            <div class="paso"><div class="n">1</div><h3>Elige tu promo</h3><p>Mientras más frascos, mejor precio. Desde 2 frascos llevas regalo sorpresa.</p></div>
            <div class="paso"><div class="n">2</div><h3>Elige tu agencia</h3><p>Escoge la agencia Servientrega donde vas a retirar, cerca de tu casa o trabajo.</p></div>
            <div class="paso"><div class="n">3</div><h3>Pagas al recibir</h3><p>Confirmas por WhatsApp, te enviamos tu número de guía y pagas al recibir.</p></div>
          </div>
        </div>
      </section>

      <section class="section bg-suave" id="envios">
        <div class="wrap envio-grid">
          <div>
            <span class="eyebrow">Envíos con Servientrega</span>
            <h2 style="margin-top:14px">Más de 700 agencias en todo Ecuador.</h2>
            <div class="envio-opts">
              <div class="envio-opt"><span class="ico">🏢</span><div><b>Retiro en agencia</b><span class="muted">Retiras en tu agencia más cercana solo con tu número de guía.</span></div></div>
              <div class="envio-opt"><span class="ico">📍</span><div><b>La más cercana a ti</b><span class="muted">Busca por sector o barrio, o usa tu ubicación para ordenarlas por distancia.</span></div></div>
              <div class="envio-opt"><span class="ico">⏱️</span><div><b>1 a 5 días hábiles</b><span class="muted">Según tu ciudad. Te avisamos por WhatsApp cuando sale.</span></div></div>
            </div>
          </div>
          <div class="finder">
            <h3>Encuentra tu agencia</h3>
            <div id="finder"></div>
          </div>
        </div>
      </section>

      <section class="section" id="preguntas">
        <div class="wrap">
          <div class="section-head"><h2>Preguntas frecuentes</h2><p>¿Otra duda? Escríbenos por WhatsApp y te respondemos al momento.</p></div>
          ${faqHtml(FAQ_GENERAL)}
        </div>
      </section>

      <section class="section-tight">
        <div class="wrap"><div class="cta-final"><h2>Empieza hoy. Envío gratis y pagas al recibir.</h2><a href="#productos" data-link class="btn">Elegir mi producto</a></div></div>
      </section>`;
    selectorAgencia($("#finder"), { seleccionable: false });
  }

  // ----------------------------------------------------------- terminos --
  function renderTerminos() {
    const m = esc(CFG.marca);
    const wa = CFG.whatsapp ? `<a href="${waUrl(`Hola ${CFG.marca}, tengo una consulta.`)}" target="_blank" rel="noopener">WhatsApp ${esc(CFG.whatsapp.replace(/^593/, "0"))}</a>` : "WhatsApp";
    document.title = `Términos y condiciones · ${CFG.marca}`;
    const S = [
      ["1. Quiénes somos", `<p>${m} es una tienda en línea que vende suplementos alimenticios en Ecuador con pago contra entrega. Atendemos por ${wa}. Al hacer un pedido en esta página aceptas estos términos.</p>`],
      ["2. Productos", `<p>Vendemos suplementos alimenticios. <b>No son medicamentos</b> y no sirven para diagnosticar, tratar, curar ni prevenir enfermedades. Las fotos son referenciales: la presentación (etiqueta, caja o color de la tapa) puede variar según el lote. Todos los pedidos están sujetos a disponibilidad de stock; si un producto se agota te avisamos por WhatsApp antes de despacharlo.</p>`],
      ["3. Precios y promociones", `<ul><li>Los precios están en dólares estadounidenses (USD) e incluyen el envío a la agencia Servientrega que elijas.</li><li>Las promociones y el regalo sorpresa aplican solo a las cantidades indicadas en cada producto y mientras haya existencias. El regalo puede variar.</li><li>Podemos cambiar precios y promociones en cualquier momento, pero siempre respetamos el precio que aparecía cuando confirmaste tu pedido.</li></ul>`],
      ["4. Cómo se hace y confirma un pedido", `<ul><li>Eliges tu promo, escribes tu nombre, tu celular y la agencia donde vas a retirar.</li><li>Al terminar recibes un número de pedido y se abre WhatsApp con el detalle para que lo confirmes.</li><li>Podemos cancelar pedidos con datos incompletos o falsos, que no se puedan confirmar por WhatsApp o llamada, o que parezcan duplicados.</li></ul>`],
      ["5. Envío y retiro en agencia", `<ul><li>Despachamos con <b>Servientrega</b> y <b>Gintracom</b> a la agencia que elegiste. Por ahora no hacemos entregas a domicilio.</li><li>Tiempo estimado: 1 a 3 días hábiles en ciudades principales y 3 a 5 días hábiles en el resto del país. Son plazos de la transportadora y pueden variar por feriados, clima o zonas de difícil acceso.</li><li>Cuando despachamos te enviamos por WhatsApp tu <b>número de guía</b>. Para retirar solo necesitas ese número.</li><li>La agencia guarda tu paquete por un tiempo limitado según las políticas de la transportadora. Si no lo retiras a tiempo, regresa a nuestra bodega.</li></ul>`],
      ["6. Pago", `<p>Pagas <b>en efectivo al retirar</b> tu pedido en la agencia. En esta tienda no pedimos tarjetas, transferencias ni pagos por adelantado. Desconfía de cualquier mensaje que te pida pagar antes a nombre de ${m}.</p>`],
      ["7. Cambios y reemplazos", `<ul><li>Revisa tu paquete al retirarlo. Si llega dañado, incompleto o con un producto equivocado, escríbenos por WhatsApp dentro de los <b>10 días</b> siguientes a recibirlo, con fotos del producto y del empaque.</li><li>Si corresponde, te enviamos el reemplazo <b>sin costo</b>.</li><li>No aceptamos cambios de frascos abiertos o usados, salvo que tengan un defecto de fabricación.</li></ul>`],
      ["8. Pedidos no retirados", `<p>Cada envío tiene un costo para nosotros aunque sea gratis para ti. Si haces un pedido y no lo retiras sin avisarnos, podremos pedirte un adelanto o no aceptar nuevos pedidos contra entrega a ese número.</p>`],
      ["9. Uso responsable", `<p>Usa los productos según la etiqueta. Si estás embarazada o en lactancia, tomas medicación (por ejemplo anticoagulantes), tienes una condición de salud o alergia a mariscos, consulta a tu médico antes de usarlos. Los resultados varían de una persona a otra.</p>`],
      ["10. Privacidad de tus datos", `<ul><li>Pedimos solo lo necesario para tu pedido: nombre, apellido, celular, provincia, ciudad y agencia.</li><li>Usamos tus datos para procesar y enviar tu pedido y para contactarte por WhatsApp sobre él. Los compartimos únicamente con la transportadora y la plataforma logística que generan tu guía.</li><li>No vendemos ni alquilamos tus datos. Puedes pedir que los borremos escribiéndonos por WhatsApp.</li><li>Si usas el botón «Más cercana», tu ubicación se usa solo en tu navegador para ordenar las agencias; no se envía a nuestros servidores.</li></ul>`],
      ["11. Cambios a estos términos", `<p>Podemos actualizar estos términos. La versión vigente es la publicada en esta página al momento de tu pedido. Se rigen por las leyes de la República del Ecuador, incluida la Ley Orgánica de Defensa del Consumidor.</p>`],
      ["12. Contacto", `<p>¿Dudas, reclamos o pedidos de cambio? Escríbenos por ${wa}.</p>`],
    ];
    $("#app").innerHTML = `
      <section class="section legal">
        <div class="wrap legal-in">
          <div class="crumbs"><a href="/" data-link>Inicio</a> / Términos y condiciones</div>
          <span class="eyebrow">Legal</span>
          <h1>Términos y condiciones</h1>
          <p class="muted">Última actualización: 18 de noviembre de 2026</p>
          ${S.map(([t, c]) => `<h2>${esc(t)}</h2>${c}`).join("")}
        </div>
      </section>`;
  }

  // ------------------------------------------------------------- redes --
  const ICONOS = {
    instagram: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM21.9 7c-.1-1.6-.4-3-1.6-4.2C19.1 1.6 17.6 1.2 16 1.1 14.4 1 9.6 1 8 1.1c-1.6.1-3 .4-4.2 1.6C2.6 3.9 2.2 5.4 2.1 7 2 8.6 2 13.4 2.1 15c.1 1.6.4 3 1.6 4.2 1.2 1.2 2.7 1.6 4.3 1.7 1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.2-1.7 1.2-1.2 1.6-2.6 1.7-4.2.1-1.6.1-6.4 0-8Zm-2 9.9a3.3 3.3 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.7.4s-4.4.1-5.7-.4a3.3 3.3 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.7s-.1-4.4.4-5.7a3.3 3.3 0 0 1 1.8-1.8c1.3-.5 4.3-.4 5.7-.4s4.4-.1 5.7.4a3.3 3.3 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.7s.1 4.4-.4 5.7Z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z"/></svg>',
  };
  function pintarRedes() {
    const r = CFG.redes || {};
    const html = Object.keys(ICONOS).filter((k) => r[k]).map((k) =>
      `<a href="${esc(r[k])}" target="_blank" rel="noopener" aria-label="${k}">${ICONOS[k]}</a>`).join("");
    $$(".redes").forEach((el) => { el.innerHTML = html; el.hidden = !html; });
  }

  // ---------------------------------------------------------- producto --
  function renderProducto(p) {
    document.title = `${p.nombre} · ${CFG.marca}`;
    const dest = p.ofertas.find((o) => o.destacada) || p.ofertas[0];
    let sel = dest.frascos;
    const faq = [
      ["¿Qué contiene?", p.bajada],
      ["¿Cómo se usa?", p.uso.join(" ")],
      ["¿Es un medicamento?", p.aviso],
      ...FAQ_GENERAL.slice(0, 4),
    ];
    $("#app").innerHTML = `
      <section class="pdp">
        <div class="wrap">
          <div class="crumbs"><a href="/" data-link>Inicio</a> / ${esc(p.nombre)}</div>
          <div class="pdp-in">
            <div class="galeria">
              <div class="principal"><img src="${p.imagenes[0]}" alt="${esc(p.nombre)}"></div>
              <div class="mini">
                <div><span>🚚</span>Envío gratis a todo Ecuador</div>
                <div><span>💵</span>Pagas al recibir</div>
                <div><span>📦</span>Retiro en agencia Servientrega</div>
              </div>
            </div>
            <div class="pdp-info">
              <span class="eyebrow">${esc(p.eyebrow)}</span>
              <h1>${esc(p.nombre)}</h1>
              <p class="sub">${esc(p.subtitulo)}</p>
              <p class="bajada">${esc(p.titular)} ${esc(p.bajada)}</p>
              <span class="ck-label">Elige tu promo</span>
              <div class="ofertas" role="radiogroup">
                ${p.ofertas.map((o) => `
                  <label class="oferta ${o.frascos === sel ? "sel" : ""}" data-f="${o.frascos}">
                    <input type="radio" name="oferta" value="${o.frascos}" ${o.frascos === sel ? "checked" : ""}>
                    <span class="radio"></span>
                    <span class="t">${o.frascos} frasco${o.frascos > 1 ? "s" : ""}${o.regalo ? ' <span class="regalo">+ 🎁 regalo</span>' : ""}
                      <small>${o.frascos > 1 ? usd(o.precio / o.frascos) + " c/u" : "Precio normal"}${o.nota ? " · " + esc(o.nota) : ""}</small></span>
                    <span class="p">${o.antes ? `<s>${usd(o.antes)}</s>` : ""}${usd(o.precio)}</span>
                    ${o.etiqueta && o.frascos > 1 ? `<span class="tag ${o.destacada ? "tag-grad" : ""} badge">${esc(o.etiqueta)}</span>` : ""}
                  </label>`).join("")}
              </div>
              <div class="pdp-cta">
                <button class="btn btn-grad btn-block" id="comprar">Pedir ahora · pago al recibir</button>
                <a class="btn btn-ghost btn-block wa-link" href="#" target="_blank" rel="noopener">Tengo una duda, hablar por WhatsApp</a>
              </div>
              <div class="chips"><span>🔒 Sin tarjeta</span><span>🚚 Envío gratis</span><span>✅ Original</span><span>🎁 Regalo desde 2</span></div>
              <div class="nota-envio">📦<span>Enviamos con <b>Servientrega</b>: retiras en tu agencia más cercana solo con tu número de guía.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section class="section bg-blanco">
        <div class="wrap">
          <div class="section-head"><h2>Por qué lo van a elegir</h2></div>
          <div class="benef">${p.beneficios.map(([t, d], i) => `<div><span class="ico">${i + 1}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>
        </div>
      </section>

      <section class="section">
        <div class="wrap dos-col">
          <div class="caja"><h3>Lo que recibes</h3><ul class="lista-check">${p.recibes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
          <div class="caja"><h3>Cómo se usa</h3><ol class="lista-num">${p.uso.map((t) => `<li>${esc(t)}</li>`).join("")}</ol><p class="aviso">${esc(p.aviso)}</p></div>
        </div>
      </section>

      <section class="section bg-blanco">
        <div class="wrap"><div class="section-head"><h2>Resolvemos tus dudas</h2></div>${faqHtml(faq)}</div>
      </section>

      <section class="section-tight">
        <div class="wrap"><div class="cta-final"><h2>${esc(p.nombre)} con envío gratis y pago al recibir.</h2><button class="btn" id="comprar2">Pedir ahora</button></div></div>
      </section>

      <div class="sticky-cta on"><div class="precio" id="st-precio"></div><button class="btn btn-grad" id="comprar3">Pedir ahora</button></div>`;

    const pintar = () => {
      $$(".oferta").forEach((l) => l.classList.toggle("sel", +l.dataset.f === sel));
      const o = p.ofertas.find((x) => x.frascos === sel);
      $("#st-precio").innerHTML = `${usd(o.precio)}<small>${o.frascos} frasco${o.frascos > 1 ? "s" : ""} · pagas al recibir</small>`;
    };
    $$(".oferta input").forEach((i) => i.addEventListener("change", () => { sel = +i.value; pintar(); }));
    ["#comprar", "#comprar2", "#comprar3"].forEach((id) => $(id).addEventListener("click", () => abrirCheckout(p, sel)));
    pintar();
  }

  // --------------------------------------------- selector de agencias --
  function km(a, b, c, d) {
    const r = (x) => (x * Math.PI) / 180, R = 6371;
    const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* Google Maps en el punto de la agencia (o buscando su direccion si no tiene coordenadas). */
  function mapaUrl(a) {
    const q = a.lat != null && a.lon != null
      ? `${a.lat},${a.lon}`
      : `Servientrega ${a.direccion}, ${titulo(a.ciudad || "")}, Ecuador`;
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }

  /* Pinta provincia + ciudad (+ lista de agencias). onCambio({provincia, ciudad, agencia}) */
  async function selectorAgencia(cont, { seleccionable = true, conAgencias = true, inicial = {}, onCambio = () => {} } = {}) {
    cont.innerHTML = `
      <div class="campos">
        <label class="campo"><span>Provincia</span><select name="provincia" required><option value="">Cargando…</option></select></label>
        <label class="campo"><span>Ciudad</span><select name="ciudad" required disabled><option value="">Elige provincia</option></select></label>
      </div>
      ${conAgencias ? `<div class="ag-wrap" style="margin-top:14px"></div>` : ""}`;
    const sp = $("select[name=provincia]", cont), sc = $("select[name=ciudad]", cont), wrap = $(".ag-wrap", cont);
    const est = { provincia: "", ciudad: "", agencia: null, orden: null };
    let datos;
    try { datos = await ubicaciones(); } catch (e) { sp.innerHTML = `<option value="">No se pudo cargar</option>`; return est; }
    sp.innerHTML = `<option value="">Elige tu provincia</option>` + Object.keys(datos).map((p) => `<option value="${esc(p)}">${esc(titulo(p))}</option>`).join("");

    const cargarCiudades = () => {
      est.provincia = sp.value; est.ciudad = ""; est.agencia = null;
      const cs = datos[sp.value] || [];
      sc.disabled = !cs.length;
      sc.innerHTML = `<option value="">${cs.length ? "Elige tu ciudad" : "Elige provincia"}</option>` + cs.map((c) => `<option value="${esc(c)}">${esc(titulo(c))}</option>`).join("");
      if (wrap) wrap.innerHTML = "";
      onCambio(est);
    };
    const pintarAgencias = async () => {
      est.ciudad = sc.value; est.agencia = null; onCambio(est);
      if (!wrap) return;
      if (!sc.value) { wrap.innerHTML = ""; return; }
      wrap.innerHTML = `<div class="ag-vacio">Buscando agencias…</div>`;
      let lista = [];
      try { lista = await agenciasDe(sc.value); } catch (e) { wrap.innerHTML = `<div class="ag-vacio">No pudimos cargar las agencias. Intenta de nuevo.</div>`; return; }
      if (!lista.length) { wrap.innerHTML = `<div class="ag-vacio">No hay agencias de retiro en esta ciudad. Elige la ciudad más cercana o escríbenos por WhatsApp.</div>`; return; }
      wrap.innerHTML = `
        <span class="ck-label">${lista.length} agencia${lista.length > 1 ? "s" : ""} en ${esc(titulo(sc.value))}</span>
        ${lista.length > 1 ? `<div class="ag-tools"><input class="buscar" type="search" placeholder="Busca tu sector o barrio"><button type="button" class="cerca">📍 Más cercana</button></div>` : ""}
        <div class="ag-lista"></div>`;
      const ul = $(".ag-lista", wrap);
      let filtro = "";
      const dibujar = () => {
        let ls = lista.filter((a) => !filtro || (a.nombre + " " + a.sector + " " + a.direccion).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(filtro));
        if (est.orden) ls = ls.map((a) => ({ ...a, _km: a.lat != null ? km(est.orden[0], est.orden[1], a.lat, a.lon) : 9e9 })).sort((x, y) => x._km - y._km);
        ul.innerHTML = ls.length ? ls.map((a) => `
          <${seleccionable ? "label" : "div"} class="ag ${est.agencia && est.agencia.id === a.id ? "sel" : ""}" data-id="${esc(a.id)}">
            ${seleccionable ? `<input type="radio" name="agencia" value="${esc(a.id)}"><span class="radio"></span>` : `<span>🏢</span>`}
            <span>${a._km != null && a._km < 9e9 ? `<span class="km">${a._km < 1 ? Math.round(a._km * 1000) + " m" : a._km.toFixed(1) + " km"}</span>` : ""}
              <b>${esc(a.nombre)}</b><span class="dir">${esc(a.direccion)}</span>
              <div class="hor">L–V ${esc(a.lun_vie || "-")}${a.fin_semana ? " · Sáb " + (/no labora/i.test(a.fin_semana) ? "cerrado" : esc(a.fin_semana)) : ""}</div>
              <a class="mapa" href="${esc(mapaUrl(a))}" target="_blank" rel="noopener">🗺️ Ver en mapa</a></span>
          </${seleccionable ? "label" : "div"}>`).join("") : `<div class="ag-vacio">Ninguna agencia coincide con “${esc(filtro)}”.</div>`;
        if (seleccionable) $$("input", ul).forEach((i) => i.addEventListener("change", () => {
          est.agencia = lista.find((a) => a.id === i.value) || null;
          $$(".ag", ul).forEach((l) => l.classList.toggle("sel", l.dataset.id === i.value));
          onCambio(est);
        }));
      };
      $(".buscar", wrap)?.addEventListener("input", (e) => { filtro = e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); dibujar(); });
      $(".cerca", wrap)?.addEventListener("click", (e) => {
        const b = e.currentTarget;
        if (!navigator.geolocation) { b.textContent = "Sin ubicación"; return; }
        b.textContent = "Ubicando…";
        navigator.geolocation.getCurrentPosition(
          (pos) => { est.orden = [pos.coords.latitude, pos.coords.longitude]; b.textContent = "📍 Ordenadas"; dibujar(); },
          () => { b.textContent = "Activa tu ubicación"; },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
      });
      if (lista.length === 1 && seleccionable) { est.agencia = lista[0]; }
      dibujar();
      if (est.agencia) { $("input", ul).checked = true; $(".ag", ul).classList.add("sel"); onCambio(est); }
    };
    sp.addEventListener("change", cargarCiudades);
    sc.addEventListener("change", pintarAgencias);
    if (inicial.provincia && datos[inicial.provincia]) {
      sp.value = inicial.provincia; cargarCiudades();
      if (inicial.ciudad && datos[inicial.provincia].includes(inicial.ciudad)) { sc.value = inicial.ciudad; await pintarAgencias(); }
    }
    return est;
  }

  // ---------------------------------------------------------- checkout --
  const sheet = $("#sheet");
  function cerrar() { sheet.classList.remove("on"); sheet.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
  sheet.addEventListener("click", (e) => { if (e.target.closest("[data-cerrar]")) cerrar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrar(); });

  function abrirCheckout(p, frascos) {
    const previo = leer("cliente") || {};
    let o = p.ofertas.find((x) => x.frascos === frascos);
    const entrega = "agencia";
    let ubic = { provincia: "", ciudad: "", agencia: null };

    $("#sheet-body").innerHTML = `
      <div class="ck-head"><h2 id="sheet-title">Pago al recibir</h2><button class="ck-x" data-cerrar aria-label="Cerrar">×</button></div>
      <form class="ck-body" novalidate>
        <div class="ck-resumen">
          <img src="${p.imagenes[0]}" alt="">
          <div class="r-t">${esc(p.nombre)}<small>
            <select name="frascos" style="border:0;background:none;font:inherit;color:inherit;padding:0;cursor:pointer">
              ${p.ofertas.map((x) => `<option value="${x.frascos}" ${x.frascos === frascos ? "selected" : ""}>${x.frascos} frasco${x.frascos > 1 ? "s" : ""}${x.regalo ? " + regalo" : ""} — ${usd(x.precio)}</option>`).join("")}
            </select> ▾</small></div>
          <div class="r-p" id="ck-precio"></div>
        </div>

        <div>
          <span class="ck-label">Tus datos</span>
          <div class="campos">
            <label class="campo"><span>Nombre</span><input name="nombre" autocomplete="given-name" required value="${esc(previo.nombre || "")}"></label>
            <label class="campo"><span>Apellido</span><input name="apellido" autocomplete="family-name" required value="${esc(previo.apellido || "")}"></label>
            <label class="campo full"><span>Celular (WhatsApp)</span><input name="celular" type="tel" inputmode="numeric" autocomplete="tel" placeholder="0991234567" required value="${esc(previo.celular || "")}"><span class="ayuda">Por aquí te confirmamos y te enviamos tu número de guía.</span></label>
          </div>
        </div>

        <div>
          <span class="ck-label">¿En qué agencia Servientrega lo retiras?</span>
          <div id="ck-ubic"></div>
          <p class="ayuda-ag">🏢 Retiras solo con tu número de guía. Te lo enviamos por WhatsApp.</p>
        </div>

        <label class="campo"><span>Notas (opcional)</span><textarea name="notas" rows="2" placeholder="Horario en que te podemos llamar, etc."></textarea></label>
        <div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>

        <div class="ck-totales">
          <div><span>Subtotal</span><span id="ck-sub"></span></div>
          <div><span>Envío</span><span class="gratis">GRATIS</span></div>
          <div class="total"><span>Total a pagar al recibir</span><span id="ck-total"></span></div>
        </div>

        <div class="sello">
          <span class="sello-t">Tu pedido llega con</span>
          <span class="sello-c">SERVIENTREGA · GINTRACOM</span>
          <span class="sello-s">transportadoras de confianza en todo Ecuador</span>
          <div class="sello-items"><span>Pago contra entrega</span><span>Cobertura nacional</span><span>Compra segura</span></div>
        </div>

        <div class="error-box" id="ck-error"></div>
        <button class="btn btn-grad btn-block" type="submit" id="ck-enviar">Confirmar pedido · <span id="ck-btn-total"></span></button>
        <p class="seguro">🔒 No pedimos tarjeta. Pagas en efectivo al recibir.<br>Al confirmar aceptas nuestros <a href="/terminos" target="_blank">términos y condiciones</a>.</p>
      </form>`;

    const f = $("form", sheet);
    const pintarTotal = () => {
      $("#ck-precio").textContent = usd(o.precio);
      $("#ck-sub").innerHTML = (o.antes ? `<s style="color:var(--suave);margin-right:6px">${usd(o.antes)}</s>` : "") + usd(o.precio);
      $("#ck-total").textContent = usd(o.precio);
      $("#ck-btn-total").textContent = usd(o.precio);
    };
    const pintarEntrega = () => {
      selectorAgencia($("#ck-ubic"), {
        seleccionable: true, conAgencias: true,
        inicial: { provincia: ubic.provincia || previo.provincia, ciudad: ubic.ciudad || previo.ciudad },
        onCambio: (e) => { ubic = { provincia: e.provincia, ciudad: e.ciudad, agencia: e.agencia }; },
      });
    };
    $("select[name=frascos]", f).addEventListener("change", (e) => { o = p.ofertas.find((x) => x.frascos === +e.target.value); pintarTotal(); });
    pintarTotal(); pintarEntrega();

    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const err = $("#ck-error");
      const v = Object.fromEntries(new FormData(f).entries());
      const fallo = (msg, campo) => {
        err.textContent = msg; err.classList.add("on");
        $$(".campo", f).forEach((c) => c.classList.remove("err"));
        if (campo) { const el = $(`[name=${campo}]`, f); el?.closest(".campo")?.classList.add("err"); el?.focus(); }
        else err.scrollIntoView({ block: "center", behavior: "smooth" });
      };
      err.classList.remove("on");
      const cel = (v.celular || "").replace(/\D/g, "").replace(/^593/, "").replace(/^0/, "");
      if ((v.nombre || "").trim().length < 2) return fallo("Escribe tu nombre.", "nombre");
      if ((v.apellido || "").trim().length < 2) return fallo("Escribe tu apellido.", "apellido");
      if (!/^9\d{8}$/.test(cel)) return fallo("Revisa tu celular: 10 dígitos, empieza con 09.", "celular");
      if (!ubic.provincia) return fallo("Elige tu provincia.", "provincia");
      if (!ubic.ciudad) return fallo("Elige tu ciudad.", "ciudad");
      if (!ubic.agencia) return fallo("Elige la agencia Servientrega donde vas a retirar.");

      const btn = $("#ck-enviar");
      btn.disabled = true; btn.textContent = "Enviando pedido…";
      // En computador, la pestaña de WhatsApp se abre YA (dentro del clic) para que
      // el navegador no la bloquee; cuando responde la tienda se le pone la URL.
      // En celular se redirige en la misma pestaña (abre la app de WhatsApp).
      const celularDisp = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const ventana = !celularDisp && CFG.whatsapp ? window.open("", "_blank") : null;
      const cuerpo = {
        producto: p.slug, frascos: o.frascos, entrega,
        nombre: v.nombre, apellido: v.apellido, celular: v.celular,
        provincia: ubic.provincia, ciudad: ubic.ciudad, agencia_id: ubic.agencia ? ubic.agencia.id : "",
        notas: v.notas || "", website: v.website || "",
      };
      try {
        const r = await api("/api/pedidos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
        guardar("cliente", { nombre: v.nombre, apellido: v.apellido, celular: v.celular, provincia: ubic.provincia, ciudad: ubic.ciudad });
        mostrarOk(p, r);
        if (r.whatsapp_url) {
          if (ventana && !ventana.closed) ventana.location.href = r.whatsapp_url;
          else if (celularDisp) setTimeout(() => { location.href = r.whatsapp_url; }, 1200);
        } else if (ventana) ventana.close();
      } catch (e) {
        if (ventana) ventana.close();
        btn.disabled = false; btn.innerHTML = `Confirmar pedido · ${usd(o.precio)}`;
        fallo(e.message);
      }
    });

    sheet.classList.add("on"); sheet.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
  }

  function mostrarOk(p, r) {
    const s = r.resumen || {};
    const donde = s.agencia
      ? `<div>🏢 <b>Retiro en agencia Servientrega:</b> ${esc(s.agencia.nombre)}, ${esc(titulo(s.ciudad))}<br><span class="muted">${esc(s.agencia.direccion)}</span></div>`
      : "";
    $("#sheet-body").innerHTML = `
      <div class="ck-head"><h2>¡Listo!</h2><button class="ck-x" data-cerrar aria-label="Cerrar">×</button></div>
      <div class="ok">
        <div class="check">✓</div>
        <h2>Recibimos tu pedido</h2>
        <span class="codigo">PEDIDO ${esc(r.codigo)}</span>
        <div class="det">
          <div>📦 <b>${esc(s.producto || p.nombre)}</b></div>
          <div>💵 <b>Total a pagar al recibir:</b> ${usd(s.total || 0)}</div>
          ${donde}
          <div>👤 ${esc(s.nombre || "")}</div>
        </div>
        ${r.whatsapp_url ? `
        <div class="paso-wa">
          <b>Último paso: envíanos el mensaje por WhatsApp</b>
          <span class="muted">Te abrimos WhatsApp con el detalle de tu pedido. Solo toca <b>Enviar</b> para confirmarlo y te mandamos tu número de guía.</span>
          <a class="btn btn-wa btn-block" href="${esc(r.whatsapp_url)}" target="_blank" rel="noopener">Abrir WhatsApp y confirmar</a>
          <span class="muted" style="font-size:13px">¿No se abrió? Toca el botón verde.</span>
        </div>` : `<p class="muted">Te escribiremos por WhatsApp para confirmar tu pedido.</p>`}
        <p class="seguro">Para retirar en agencia solo necesitas tu número de guía.</p>
      </div>`;
    if (window.fbq) try { window.fbq("track", "Purchase", { value: s.total, currency: "USD" }); } catch (e) { /* pixel opcional */ }
  }

  // ------------------------------------------------------------ inicio --
  (async () => {
    try { CFG = await api("/api/config"); } catch (e) { /* se queda con lo basico */ }
    $$(".marca-txt").forEach((el) => (el.textContent = CFG.marca));
    pintarRedes();
    render();
  })();
})();
