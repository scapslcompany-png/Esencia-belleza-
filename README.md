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

## Cómo cambiar la clave

1. Abrí `src/lib/salon/config.ts`.
2. Cambiá el valor de `CLAVE` (hoy `esencia2024`) por la nueva.
3. Publicá de nuevo. Quien ya entró deberá volver a ingresar con la clave nueva.

La clave está escrita en el código: sirve para uso interno, no como seguridad fuerte.

## Cómo compartir la URL

1. Publicá la app desde el botón **Publicar**.
2. Copiá la dirección de la web publicada y enviála a partners@kodarvia.com (o a quien corresponda), junto con la clave.
3. Cada persona elige su perfil al entrar (Operación, Revisor o Auditor).

Los datos viven en cada navegador: para pasarlos a otro dispositivo, usá **Control** → descargar JSON y luego restaurar.
