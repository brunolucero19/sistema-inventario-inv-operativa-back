# Sistema de Inventario - Backend

Este proyecto utiliza **Prisma** como ORM con **PostgreSQL** para la base de datos. A continuación se detallan los pasos para colaborar correctamente en equipo.

---

## Requisitos previos

* Node.js v18 o superior
* PostgreSQL instalado y funcionando
* Archivo `.env` con la variable `DATABASE_URL`

Ejemplo de `.env`:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/mi_base_de_datos"
```

---

## Instalación del proyecto

```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo
npm install
```

---

## Uso de Prisma en equipo

### Si hiciste cambios en los modelos (`schema.prisma`)

1. Editá el archivo `prisma/schema.prisma` con los cambios necesarios.
2. Ejecutá la migración:

   ```bash
   npx prisma migrate dev --name nombre-de-la-migracion
   ```
3. Commit y push de los archivos:

   ```bash
   git add .
   git commit -m "Describe el cambio realizado"
   git push
   ```

   Asegurate de incluir:

   * `prisma/schema.prisma`
   * la nueva carpeta dentro de `prisma/migrations/`

---

### Si OTRA persona hizo cambios y querés actualizar tu base de datos local

1. Traé los últimos cambios:

   ```bash
   git pull origin main
   ```
2. Aplicá las migraciones pendientes:

   ```bash
   npx prisma migrate deploy
   ```

---

## Comandos útiles

| Acción                            | Comando                                |
| --------------------------------- | -------------------------------------- |
| Generar el cliente Prisma         | `npx prisma generate`                  |
| Ver el estado de las migraciones  | `npx prisma migrate status`            |
| Aplicar migraciones en producción | `npx prisma migrate deploy`            |
| Crear migración sin aplicarla     | `npx prisma migrate dev --create-only` |
| Acceder al cliente interactivo    | `npx prisma studio`                    |

---

## Buenas prácticas

* No modificar la base de datos directamente. Usar siempre Prisma.
* No eliminar migraciones ya aplicadas.
* No usar `migrate reset` si tenés datos importantes (borra toda la base).
* Siempre revisar que las migraciones funcionen antes de pushear.

---

Si tenés dudas, consultá con el equipo antes de realizar cambios en los modelos.

---

¡Gracias por colaborar! 💪
