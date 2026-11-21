# Esencia belleza

App interna del salón (uñas y cabello, todos los días de 9 a 22): registro de colaboradoras y grilla de cobertura.
Todo se guarda en el navegador de cada dispositivo; no hay cuentas ni base de datos.

## Pantallas

- **Colaboradoras**: listado, filtro por especialidad y servicios con precios de referencia (MXN).
- **Cobertura**: grilla de turnos, para ocupar o cancelar.
- **Historial**: propuestas y cambios.
- **Control**: descargas CSV/JSON y restaurar una copia.

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
