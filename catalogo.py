"""
Catalogo de la tienda: productos, ofertas y como se suben a Dropi.

Las ofertas usan la misma clave de promo que el bot de ventas
(ventas-bot/promos.py): "<embudo>:<frascos>", p. ej. "drenaje:4".
Asi el bot arma el pedido en Dropi con sus combinaciones y su respaldo
por stock, sin repetir esa logica aqui.

El total que paga el cliente SIEMPRE se calcula en el servidor con este
archivo; el navegador solo manda producto + oferta.
"""

PRODUCTOS = {
    "drenaje-linfatico": {
        "slug": "drenaje-linfatico",
        "embudo": "drenaje",
        "nombre": "Drenaje Linfático",
        "subtitulo": "Gotas de extractos de plantas · 30 ml",
        "eyebrow": "Bienestar natural",
        "titular": "Siéntete más ligera, gota a gota.",
        "bajada": ("Extracto líquido de plantas en gotero para sumar a tu rutina "
                   "diaria. Unas gotas en agua, té o jugo y listo."),
        "imagenes": ["/static/img/drenaje.jpg"],
        "acento": "verde",
        "ofertas": [
            {"frascos": 2, "precio": 27.99, "antes": 39.98, "etiqueta": "Promo 2x1",
             "nota": "", "regalo": False, "destacada": False},
            {"frascos": 4, "precio": 38.00, "antes": 79.96, "etiqueta": "Más elegido",
             "nota": "Tratamiento completo", "regalo": True, "destacada": True},
        ],
        "beneficios": [
            ("Extractos de plantas", "Fórmula herbal tradicional en presentación líquida."),
            ("Gotero práctico", "Mides tu porción en segundos, sin complicaciones."),
            ("Fácil de tomar", "En agua, té, jugo o directamente debajo de la lengua."),
            ("Para tu rutina", "Un hábito pequeño que acompaña tu alimentación y tu día."),
        ],
        "recibes": [
            "Frascos de Drenaje Linfático de 30 ml con gotero",
            "Instrucciones de uso por WhatsApp",
            "Regalo sorpresa con 4 frascos",
            "Envío gratis hasta tu agencia Servientrega",
        ],
        "uso": [
            "Agita bien el frasco antes de usar.",
            "Toma la porción indicada en la etiqueta, una o dos veces al día.",
            "Agrégala a agua, té o jugo, o colócala debajo de la lengua.",
        ],
        "aviso": ("Suplemento alimenticio, no es un medicamento. Si estás embarazada, "
                  "en lactancia o tomas medicación, consulta a tu médico antes de usarlo."),
    },
    "mega-red": {
        "slug": "mega-red",
        "embudo": "megared",
        "nombre": "MegaRed Omega-3",
        "subtitulo": "Aceite de krill Extra Strength · importado de EE. UU.",
        "eyebrow": "Omega-3 de krill",
        "titular": "Energía y vitalidad que se notan en tu día.",
        "bajada": ("Omega-3 de aceite de krill con EPA, DHA y astaxantina. "
                   "Cápsulas blandas, sin sabor a pescado."),
        "imagenes": ["/static/img/megared.jpg"],
        "acento": "azul",
        "ofertas": [
            {"frascos": 1, "precio": 27.99, "antes": None, "etiqueta": "1 frasco",
             "nota": "", "regalo": False, "destacada": False},
            {"frascos": 2, "precio": 37.99, "antes": 55.98, "etiqueta": "Promo de la semana",
             "nota": "", "regalo": True, "destacada": True},
            {"frascos": 3, "precio": 52.00, "antes": 83.97, "etiqueta": "Tratamiento",
             "nota": "", "regalo": True, "destacada": False},
            {"frascos": 4, "precio": 65.00, "antes": 111.96, "etiqueta": "Mejor precio",
             "nota": "", "regalo": True, "destacada": False},
        ],
        "beneficios": [
            ("Omega-3 de krill", "EPA y DHA en forma de fosfolípidos, de fácil absorción."),
            ("Astaxantina", "Antioxidante natural que le da su color rojo."),
            ("Sin sabor a pescado", "Cápsulas blandas pequeñas, sin repetición."),
            ("Original de EE. UU.", "Producto americano, sellado de fábrica."),
        ],
        "recibes": [
            "Frascos de MegaRed Omega-3 Krill Oil originales",
            "Instrucciones de uso por WhatsApp",
            "Regalo sorpresa desde 2 frascos",
            "Envío gratis hasta tu agencia Servientrega",
        ],
        "uso": [
            "Toma 2 cápsulas al día.",
            "Mejor después del desayuno, con agua.",
            "Úsalo de forma constante varias semanas.",
        ],
        "aviso": ("Suplemento alimenticio, no es un medicamento. Si eres alérgico a "
                  "mariscos, tomas anticoagulantes o tienes una condición médica, "
                  "consulta a tu médico antes de usarlo."),
    },
    "nad-pro-max": {
        "slug": "nad-pro-max",
        "embudo": "nad",
        "nombre": "NAD+ Pro Max",
        "subtitulo": "NAD+ 300 mg con resveratrol y CoQ10 · 60 cápsulas vegetales",
        "eyebrow": "Energía celular",
        "titular": "Energía y vitalidad para tu día a día.",
        "bajada": ("NAD+ con resveratrol y coenzima Q10, ingredientes que participan en la "
                   "producción de energía de tus células y aportan antioxidantes."),
        "imagenes": ["/static/img/nad.jpg"],
        "acento": "azul",
        "ofertas": [
            {"frascos": 1, "precio": 24.99, "antes": None, "etiqueta": "1 frasco",
             "nota": "", "regalo": False, "destacada": False},
            {"frascos": 2, "precio": 34.99, "antes": 49.98, "etiqueta": "Más elegido",
             "nota": "", "regalo": True, "destacada": True},
            {"frascos": 3, "precio": 44.99, "antes": 74.97, "etiqueta": "Mejor precio",
             "nota": "Tratamiento completo", "regalo": True, "destacada": False},
        ],
        "beneficios": [
            ("NAD+ 300 mg", "Participa en la producción de energía dentro de las células."),
            ("Resveratrol", "Antioxidante que ayuda a proteger las células del estrés oxidativo."),
            ("Coenzima Q10", "Apoya la energía celular en órganos muy activos como el corazón."),
            ("Cápsulas vegetales", "60 cápsulas, fáciles de tomar en tu rutina diaria."),
        ],
        "recibes": [
            "Frascos de NAD+ Pro Max de 60 cápsulas",
            "Instrucciones de uso por WhatsApp",
            "Regalo sorpresa desde 2 frascos",
            "Envío gratis hasta tu agencia Servientrega",
        ],
        "uso": [
            "Toma la porción indicada en la etiqueta del frasco.",
            "Acompáñala con agua, de preferencia con una comida.",
            "Úsalo de forma constante varias semanas.",
        ],
        "aviso": ("Suplemento alimenticio, no es un medicamento. Si estás embarazada, en "
                  "lactancia, tomas medicación o tienes una condición médica, consulta a tu "
                  "médico antes de usarlo."),
    },
    "biokids": {
        "slug": "biokids",
        "embudo": "biokids",
        "nombre": "BioKids Moringa",
        "subtitulo": "Gomitas con moringa, zinc, DHA y ARA · 160 g",
        "eyebrow": "Para los más pequeños",
        "titular": "Nutrientes que ellos sí quieren tomar.",
        "bajada": ("Gomitas con aceite de moringa, calcio, hierro, zinc, DHA, ARA y vitaminas "
                   "A, C, D y E para complementar la alimentación de los niños."),
        "imagenes": ["/static/img/biokids.jpg"],
        "acento": "verde",
        "ofertas": [
            {"frascos": 1, "precio": 24.99, "antes": None, "etiqueta": "1 frasco",
             "nota": "", "regalo": False, "destacada": False},
            {"frascos": 2, "precio": 34.99, "antes": 49.98, "etiqueta": "Promoción",
             "nota": "", "regalo": True, "destacada": True},
        ],
        "beneficios": [
            ("Vitaminas A, C, D y E", "Apoyan las defensas, la visión y unos huesos fuertes."),
            ("Hierro y zinc", "Minerales importantes en la etapa de crecimiento."),
            ("DHA y ARA", "Nutrientes relacionados con el desarrollo del cerebro."),
            ("Rico sabor", "Gomitas que los niños disfrutan, sin pelear para tomarlas."),
        ],
        "recibes": [
            "Frascos de BioKids gomitas con moringa de 160 g",
            "Instrucciones de uso por WhatsApp",
            "Regalo sorpresa con 2 frascos",
            "Envío gratis hasta tu agencia Servientrega",
        ],
        "uso": [
            "Dale la porción indicada en la etiqueta según la edad.",
            "Una vez al día, de preferencia con una comida.",
            "Guárdalo fuera del alcance de los niños.",
        ],
        "aviso": ("Suplemento alimenticio, no es un medicamento ni reemplaza una alimentación "
                  "balanceada. Consulta al pediatra si tu hijo tiene alguna condición de salud, "
                  "alergias o toma medicación."),
    },
}


def oferta(slug, frascos):
    """Devuelve (producto, oferta) o (None, None) si no existe."""
    p = PRODUCTOS.get(slug)
    if not p:
        return None, None
    for o in p["ofertas"]:
        if o["frascos"] == frascos:
            return p, o
    return p, None


def clave_promo(producto, frascos):
    """Clave que entiende el bot de ventas: 'drenaje:4', 'megared:2'."""
    return f"{producto['embudo']}:{frascos}"


def publico():
    """Catalogo para el navegador (sin datos internos)."""
    return {s: {k: v for k, v in p.items() if k != "embudo"} for s, p in PRODUCTOS.items()}
