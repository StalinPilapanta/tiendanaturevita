# Tienda NatureVita EC (Drenaje Linfático + MegaRed)

Tienda de pago contra entrega: el cliente elige su promo, retiro en agencia
Servientrega o entrega a domicilio, y confirma por WhatsApp. Sin carrito,
tarjetas ni Shopify.

## Cómo funciona

1. **Página de producto** con las mismas promos del bot de ventas
   (`catalogo.py`, claves `drenaje:2`, `drenaje:4`, `megared:1..4`).
2. **Checkout** con provincia → ciudad → agencia (solo agencias con
   *Entrega en oficina = SI* del directorio de Servientrega), buscador por
   sector y botón "Más cercana" (usa la ubicación del celular, solo en el
   navegador). O dirección + referencia para domicilio.
3. **Pedido guardado** en SQLite (`/data/pedidos.db`) con número `NV-1001`,
   total calculado en el servidor y la dirección ya en formato Dropi
   (`AGENCIA---SECTOR---DIRECCION`).
4. **Aviso a Telegram** y botón **Confirmar por WhatsApp** con el resumen del
   pedido ya escrito.
5. **El bot de ventas** lee los pedidos nuevos por la API interna y los crea
   en Dropi con su lógica de siempre (combinaciones, respaldo por stock,
   anti-duplicados).

## API interna (para el bot)

Cabecera `X-Tienda-Key: <TIENDA_API_KEY>`.

- `GET /api/interno/pedidos?estado=nuevo` → lista de pedidos con `promo`,
  `celular`, `provincia`, `ciudad`, `dir_dropi`, `agencia`, `entrega`.
- `POST /api/interno/pedidos/{id}` con `{"estado": "creado", "dropi_id": "8020687"}`
  (estados: `nuevo`, `tomado`, `creado`, `cancelado`, `error`).

## Desarrollo local

```bash
pip install -r requirements.txt
WHATSAPP_NUMERO=5939XXXXXXXX TIENDA_API_KEY=local-dev DATA_DIR=./data uvicorn app:app --port 8710 --reload
```

## Coolify

- Build pack: **Dockerfile** (puerto 8000).
- Volumen persistente en **/data** (ahí vive `pedidos.db`).
- Variables: ver `.env.example`.
- Health check: `/salud`.
