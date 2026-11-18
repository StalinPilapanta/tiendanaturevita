"""
Tienda de pago contra entrega (Drenaje Linfatico y MegaRed).

- Sirve la tienda (static/) y una API pequena:
    GET  /api/config                 marca, WhatsApp y catalogo
    GET  /api/ubicaciones            provincias -> ciudades con cobertura
    GET  /api/agencias?ciudad=X      agencias Servientrega donde se puede retirar
    POST /api/pedidos                crea el pedido (total calculado aqui)
- Guarda los pedidos en SQLite (DATA_DIR) y avisa a Telegram.
- El bot de ventas los lee por la API interna para crearlos en Dropi:
    GET  /api/interno/pedidos?estado=nuevo     (cabecera X-Tienda-Key)
    POST /api/interno/pedidos/{id}             {"estado", "dropi_id", "nota"}

Variables de entorno: ver .env.example
"""

import json
import os
import re
import sqlite3
import threading
import time
import unicodedata
from datetime import datetime, timezone
from urllib.parse import quote

import requests
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import catalogo

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE, "data"))
DIRECTORIO_PATH = os.environ.get("DIRECTORIO_PATH", os.path.join(BASE, "data", "directorio_limpio.json"))
MARCA = os.environ.get("MARCA", "NatureVita EC")
WHATSAPP = re.sub(r"\D", "", os.environ.get("WHATSAPP_NUMERO", ""))  # 5939XXXXXXXX
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT = os.environ.get("TELEGRAM_CHAT_ID", "")
API_KEY = os.environ.get("TIENDA_API_KEY", "")
PREFIJO = os.environ.get("PEDIDO_PREFIJO", "NV")
MAX_PEDIDOS_IP = int(os.environ.get("MAX_PEDIDOS_IP", "5"))      # por ventana
VENTANA_IP = int(os.environ.get("VENTANA_IP_SEGUNDOS", "600"))
# Redes sociales del pie de pagina (solo se muestran las que tengan URL).
REDES = {k: os.environ.get(f"{k.upper()}_URL", "").strip()
         for k in ("instagram", "facebook", "tiktok")}

os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "pedidos.db")

app = FastAPI(title=MARCA, docs_url=None, redoc_url=None)
app.mount("/static", StaticFiles(directory=os.path.join(BASE, "static")), name="static")


# ------------------------------------------------------------------ util --

def _norm(t):
    t = unicodedata.normalize("NFKD", str(t or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", t).strip().lower()


def _ahora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def celular_ec(t):
    """'+593 99 123 4567' / '0991234567' / '991234567' -> '0991234567' o ''."""
    d = re.sub(r"\D", "", str(t or ""))
    if d.startswith("593"):
        d = d[3:]
    d = d.lstrip("0")
    return "0" + d if re.fullmatch(r"9\d{8}", d) else ""


# ------------------------------------------------------------- agencias --

_dir = None


def directorio():
    global _dir
    if _dir is None:
        with open(DIRECTORIO_PATH, encoding="utf-8") as f:
            _dir = json.load(f)
    return _dir


def _es_retiro(a):
    return _norm(a.get("Entrega_en_oficina")) != "no"


def _agencia(a):
    nombre = a.get("Nombre_agencia", "")
    corto = nombre.split("_", 1)[1] if "_" in nombre else nombre
    return {
        "id": nombre,
        "nombre": corto.title(),
        "sector": (a.get("Sector") or "").title(),
        "direccion": a.get("Direccion", ""),
        "lun_vie": a.get("Horario_Lunes_Viernes", ""),
        "fin_semana": a.get("Horario_fin_semana", ""),
        "lat": a.get("Latitud") if isinstance(a.get("Latitud"), (int, float)) else None,
        "lon": a.get("Longitud") if isinstance(a.get("Longitud"), (int, float)) else None,
        "provincia": a.get("Provincia", ""),
        "ciudad": a.get("Ciudad", ""),
        "sector_raw": a.get("Sector", ""),
    }


def agencias_de(ciudad):
    c = _norm(ciudad)
    lista = [_agencia(a) for a in directorio()
             if _norm(a.get("Ciudad")) == c and _es_retiro(a)]
    # El directorio trae algunas coordenadas erradas (p. ej. longitud -87): si una
    # agencia queda a mas de 25 km del centro de su ciudad se le quitan, y el mapa
    # la busca por direccion y no ordena mal la "mas cercana".
    con = [a for a in lista if a["lat"] is not None and a["lon"] is not None]
    if con:
        lats = sorted(a["lat"] for a in con)
        lons = sorted(a["lon"] for a in con)
        clat, clon = lats[len(lats) // 2], lons[len(lons) // 2]
        for a in con:
            if _km(clat, clon, a["lat"], a["lon"]) > 25:
                a["lat"] = a["lon"] = None
    return sorted(lista, key=lambda a: (a["sector"], a["nombre"]))


def _km(lat1, lon1, lat2, lon2):
    import math
    r = math.radians
    h = (math.sin(r(lat2 - lat1) / 2) ** 2
         + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lon2 - lon1) / 2) ** 2)
    return 2 * 6371 * math.asin(math.sqrt(h))


def agencia_por_id(aid):
    for a in directorio():
        if a.get("Nombre_agencia") == aid and _es_retiro(a):
            return _agencia(a)
    return None


def direccion_dropi(a):
    """Formato de las guias de Servientrega en Dropi: AGENCIA---SECTOR---DIRECCION."""
    return f"{a['id']}---{a['sector_raw']}---{a['direccion']}"


# ------------------------------------------------------------- pedidos --

_db_lock = threading.Lock()


def _db():
    nueva = not os.path.exists(DB_PATH)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    if nueva:
        _crear_tabla(con)
    return con


def _crear_tabla(con):
    con.execute("""
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            creado TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'nuevo',
            datos TEXT NOT NULL,
            celular TEXT NOT NULL,
            promo TEXT NOT NULL,
            total REAL NOT NULL,
            dropi_id TEXT,
            nota TEXT,
            actualizado TEXT
        )""")
    con.execute("CREATE INDEX IF NOT EXISTS ix_estado ON pedidos(estado)")
    con.commit()


with _db() as _c:
    _crear_tabla(_c)


def codigo(pid):
    return f"{PREFIJO}-{1000 + pid}"


def _fila(r):
    d = json.loads(r["datos"])
    d.update({"id": r["id"], "codigo": codigo(r["id"]), "creado": r["creado"],
              "estado": r["estado"], "dropi_id": r["dropi_id"], "nota": r["nota"]})
    return d


class Pedido(BaseModel):
    producto: str = Field(max_length=40)
    frascos: int = Field(ge=1, le=12)
    # Solo retiro en agencia Servientrega (la entrega a domicilio se quito).
    entrega: str = Field(default="agencia", pattern="^agencia$")
    nombre: str = Field(min_length=2, max_length=60)
    apellido: str = Field(min_length=2, max_length=60)
    celular: str = Field(max_length=20)
    provincia: str = Field(max_length=40)
    ciudad: str = Field(max_length=60)
    agencia_id: str = Field(default="", max_length=120)
    direccion: str = Field(default="", max_length=200)
    referencia: str = Field(default="", max_length=200)
    notas: str = Field(default="", max_length=300)
    website: str = Field(default="", max_length=100)   # honeypot: los humanos lo dejan vacio


_por_ip = {}


def _limite_ip(ip):
    ahora = time.time()
    hist = [t for t in _por_ip.get(ip, []) if ahora - t < VENTANA_IP]
    if len(hist) >= MAX_PEDIDOS_IP:
        return False
    hist.append(ahora)
    _por_ip[ip] = hist
    return True


def _linea_producto(d):
    regalo = " + regalo sorpresa" if d.get("regalo") else ""
    return f"{d['frascos']} frasco{'s' if d['frascos'] > 1 else ''} de {d['producto_nombre']}{regalo}"


def mensaje_whatsapp(d):
    """
    Mensaje que el cliente nos envia por WhatsApp al terminar la compra.
    SIN emojis: el enlace de WhatsApp (wa.me / api.whatsapp.com) los cambia
    por "�" en muchos telefonos. Las tildes y la ñ si llegan bien.
    """
    ciudad = f"{d['ciudad'].title()}, {d['provincia'].title()}"
    if d["entrega"] == "agencia":
        a = d["agencia"]
        envio = [f"*Retiro en agencia Servientrega:* {a['nombre']} ({ciudad})",
                 f"Dirección de la agencia: {a['direccion'].capitalize()}"]
    else:
        envio = [f"*Entrega a domicilio:* {d['direccion']} ({ciudad})"]
        if d.get("referencia"):
            envio.append(f"Referencia: {d['referencia']}")
    return "\n".join([
        f"Hola {MARCA}, acabo de hacer mi pedido en la tienda web:",
        "",
        f"*Pedido {d['codigo']}*",
        f"- Producto: {_linea_producto(d)}",
        f"- *Total a pagar al recibir: ${d['total']:.2f}* (envío gratis)",
        *[f"- {x}" for x in envio],
        f"- A nombre de: {d['nombre']} {d['apellido']}",
        f"- Celular: {d['celular']}",
        "",
        "*Sí, confirmo mi pedido.*",
    ])


def _avisar_telegram(d):
    if not (TELEGRAM_TOKEN and TELEGRAM_CHAT):
        return
    if d["entrega"] == "agencia":
        a = d["agencia"]
        envio = (f"🏢 Retiro en agencia: {a['id']}\n"
                 f"    {a['direccion']}")
    else:
        envio = (f"🏠 Domicilio: {d['direccion']}\n"
                 f"    Ref: {d['referencia'] or '-'}")
    texto = (f"🛒 Pedido web {d['codigo']}\n"
             f"{_linea_producto(d)}\n"
             f"💵 ${d['total']:.2f} contra entrega  ·  promo {d['promo']}\n"
             f"👤 {d['nombre']} {d['apellido']}  ·  📱 {d['celular']}\n"
             f"📍 {d['ciudad']} ({d['provincia']})\n{envio}"
             + (f"\n📝 {d['notas']}" if d.get("notas") else ""))
    try:
        requests.post(f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                      json={"chat_id": TELEGRAM_CHAT, "text": texto}, timeout=10)
    except requests.RequestException:
        pass


# ------------------------------------------------------------------ API --

@app.get("/api/config")
def config():
    return {"marca": MARCA, "whatsapp": WHATSAPP, "productos": catalogo.publico(),
            "redes": {k: v for k, v in REDES.items() if v.startswith("https://")}}


@app.get("/api/ubicaciones")
def ubicaciones():
    prov = {}
    for a in directorio():
        if not _es_retiro(a):
            continue
        p, c = (a.get("Provincia") or "").strip(), (a.get("Ciudad") or "").strip()
        if p and c:
            prov.setdefault(p, set()).add(c)
    return {p: sorted(c) for p, c in sorted(prov.items())}


@app.get("/api/agencias")
def agencias(ciudad: str):
    lista = agencias_de(ciudad)
    return [{k: v for k, v in a.items() if k != "sector_raw"} for a in lista]


@app.post("/api/pedidos")
def crear_pedido(p: Pedido, request: Request):
    if p.website:  # bot de spam: respondemos "ok" sin guardar nada
        return {"ok": True, "codigo": f"{PREFIJO}-0000", "whatsapp_url": ""}

    producto, oferta = catalogo.oferta(p.producto, p.frascos)
    if not oferta:
        raise HTTPException(400, "Esa oferta no existe.")
    cel = celular_ec(p.celular)
    if not cel:
        raise HTTPException(400, "Revisa tu número de celular (ej. 0991234567).")

    agencia = None
    if p.entrega == "agencia":
        agencia = agencia_por_id(p.agencia_id)
        if not agencia or _norm(agencia["ciudad"]) != _norm(p.ciudad):
            raise HTTPException(400, "Elige una agencia de Servientrega de tu ciudad.")
        dir_dropi = direccion_dropi(agencia)
    else:
        if len(p.direccion.strip()) < 6:
            raise HTTPException(400, "Escribe tu dirección completa (calle principal y secundaria).")
        dir_dropi = f"{p.direccion.strip()}" + (f" - REF: {p.referencia.strip()}" if p.referencia.strip() else "")

    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "?").split(",")[0].strip()

    datos = {
        "producto": producto["slug"],
        "producto_nombre": producto["nombre"],
        "frascos": oferta["frascos"],
        "regalo": oferta["regalo"],
        "total": oferta["precio"],
        "promo": catalogo.clave_promo(producto, oferta["frascos"]),
        "entrega": p.entrega,
        "nombre": p.nombre.strip().title(),
        "apellido": p.apellido.strip().title(),
        "celular": cel,
        "provincia": p.provincia.strip().upper(),
        "ciudad": p.ciudad.strip().upper(),
        "agencia": {k: v for k, v in agencia.items() if k not in ("lat", "lon")} if agencia else None,
        "direccion": p.direccion.strip(),
        "referencia": p.referencia.strip(),
        "dir_dropi": dir_dropi,
        "notas": p.notas.strip(),
        "ip": ip,
    }

    with _db_lock, _db() as con:
        # Doble clic o reenvio: mismo celular y misma promo en los ultimos 30 min.
        r = con.execute(
            "SELECT * FROM pedidos WHERE celular=? AND promo=? AND estado!='cancelado' "
            "AND creado >= datetime('now','-30 minutes') ORDER BY id DESC LIMIT 1",
            (cel, datos["promo"])).fetchone()
        if r:
            d = _fila(r)
            return {"ok": True, "codigo": d["codigo"], "repetido": True,
                    "whatsapp_url": _wa_url(d), "resumen": _resumen(d)}
        if not _limite_ip(ip):
            raise HTTPException(429, "Recibimos varios pedidos seguidos. Escríbenos por WhatsApp y te ayudamos.")
        cur = con.execute(
            "INSERT INTO pedidos (creado, datos, celular, promo, total) "
            "VALUES (datetime('now'), ?, ?, ?, ?)",
            (json.dumps(datos, ensure_ascii=False), cel, datos["promo"], datos["total"]))
        pid = cur.lastrowid

    datos["codigo"] = codigo(pid)
    threading.Thread(target=_avisar_telegram, args=(datos,), daemon=True).start()
    return {"ok": True, "codigo": datos["codigo"], "whatsapp_url": _wa_url(datos),
            "resumen": _resumen(datos)}


def _wa_url(d):
    if not WHATSAPP:
        return ""
    # Directo a api.whatsapp.com: la redireccion de wa.me rompe los emojis (salen como "�").
    return f"https://api.whatsapp.com/send?phone={WHATSAPP}&text={quote(mensaje_whatsapp(d))}"


def _resumen(d):
    return {"producto": _linea_producto(d), "total": d["total"], "entrega": d["entrega"],
            "agencia": d.get("agencia"), "direccion": d.get("direccion"),
            "ciudad": d["ciudad"], "nombre": f"{d['nombre']} {d['apellido']}"}


# ------------------------------------------------- API interna (bot) --

def _auth(clave):
    if not API_KEY:
        raise HTTPException(503, "TIENDA_API_KEY no configurada.")
    if clave != API_KEY:
        raise HTTPException(401, "Clave inválida.")


@app.get("/api/interno/pedidos")
def pedidos_internos(estado: str = "nuevo", limite: int = 50,
                     x_tienda_key: str = Header(default="")):
    _auth(x_tienda_key)
    with _db() as con:
        filas = con.execute("SELECT * FROM pedidos WHERE estado=? ORDER BY id LIMIT ?",
                            (estado, max(1, min(limite, 200)))).fetchall()
    return [_fila(r) for r in filas]


class Cambio(BaseModel):
    estado: str = Field(pattern="^(nuevo|tomado|creado|cancelado|error)$")
    dropi_id: str = Field(default="", max_length=30)
    nota: str = Field(default="", max_length=300)


@app.post("/api/interno/pedidos/{pid}")
def actualizar_pedido(pid: int, c: Cambio, x_tienda_key: str = Header(default="")):
    _auth(x_tienda_key)
    with _db_lock, _db() as con:
        n = con.execute(
            "UPDATE pedidos SET estado=?, dropi_id=COALESCE(NULLIF(?,''), dropi_id), "
            "nota=?, actualizado=datetime('now') WHERE id=?",
            (c.estado, c.dropi_id, c.nota, pid)).rowcount
    if not n:
        raise HTTPException(404, "No existe ese pedido.")
    return {"ok": True}


# -------------------------------------------------------------- paginas --

INDEX = os.path.join(BASE, "static", "index.html")


@app.get("/salud")
def salud():
    return {"ok": True}


@app.get("/{ruta:path}")
def pagina(ruta: str):
    # Todas las paginas son la misma app; el JS muestra inicio o producto.
    if ruta.startswith("api/"):
        return JSONResponse({"detail": "No encontrado"}, status_code=404)
    return FileResponse(INDEX, headers={"Cache-Control": "no-cache"})
