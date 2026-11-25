# Esencia belleza

App interna del salón (uñas y cabello, todos los días de 9 a 22): registro de colaboradoras y grilla de cobertura.
Todo se guarda en el navegador de cada dispositivo; no hay cuentas ni base de datos.

## Pantallas

- **Colaboradoras**: listado, filtro por especialidad y servicios con precios de referencia (MXN).
- **Cobertura**: grilla de turnos, para ocupar o cancelar.
- **Historial**: propuestas y cambios.
- **Control**: descargas CSV/JSON y restaurar una copia.

## Cómo correrlo

1. Instalá lo necesario con `npm install`.
2. Arrancá con `npm run dev` y abrí http://localhost:3100.
3. Entrá con la clave y elegí un perfil (Operación, Revisor o Auditor).
4. Para comprobar las reglas del salón sin abrir la app: `npx tsx scripts/verificar-salon.ts` (debe terminar con «Todo bien»).

## Cómo se preparan los datos de ejemplo

Son inventados y viven en `src/lib/salon/seed.ts`: 9 colaboradoras (una de vacaciones) que se cargan solas la primera vez que se abre la app en un navegador. Para volver a empezar, borrá los datos del sitio en el navegador (o restaurá una copia desde **Control**) y recargá. Para cambiar los ejemplos, editá la lista `colaboradorasEjemplo` de ese archivo.

## Qué está simulado

- **Almacenamiento**: no hay servidor ni base de datos; el «adaptador local» (`src/lib/salon/store.ts`) guarda todo en el `localStorage` del navegador.
- **Acceso**: la clave y los perfiles (Operación, Revisor, Auditor) son una simulación en el cliente; la sesión dura solo mientras la pestaña está abierta.
- **Datos**: las colaboradoras de ejemplo son inventadas.
- **Aprobaciones**: el flujo de propuestas y revisión ocurre en el mismo navegador, sin avisos a otras personas.

## Cómo se reinician los datos de prueba

- Desde **Control** → **Restaurar datos de prueba**: sustituye todo por las 9 colaboradoras de ejemplo.
- Desde **Control** → restaurar copia JSON: vuelve a una copia descargada antes.
- A mano: borrar los datos del sitio en el navegador y recargar; se vuelven a sembrar solos.

## Cómo se estructura la grilla de cobertura

Son 14 casilleros: 2 turnos (Mañana 9-15, Tarde 16-22) por 7 días (lunes a domingo). Se calcula en `src/lib/salon/cobertura.ts`. Una colaboradora cuenta en un casillero si está **Activa**, su turno coincide y no descansa ese día. Cada casillero muestra cuántas hacen Uñas, cuántas Cabello (las de «Ambas» cuentan en las dos), el total y cuántas quedan libres para ocupar. Encima hay totales de colaboradoras Activas, de Vacaciones y de Baja.

## Cómo comprobar un guardado fallido

1. Abrí la app y la consola del navegador (F12).
2. Escribí `window.__esenciaFallaGuardado = true` y pulsá Enter.
3. Hacé un cambio (por ejemplo, editar una colaboradora u ocupar un turno).
4. Debe aparecer un aviso de error y los datos no deben cambiar, ni en pantalla ni tras recargar (el guardado es de todo o nada).
5. Escribí `window.__esenciaFallaGuardado = false` (o recargá) para volver a la normalidad.

## Cómo cambiar la clave

1. Abrí `src/lib/salon/config.ts`.
2. Cambiá el valor de `CLAVE` (hoy `esencia2024`) por la nueva.
3. Publicá de nuevo. Quien ya entró deberá volver a ingresar con la clave nueva.

La clave está escrita en el código: sirve para uso interno, no como seguridad fuerte.

