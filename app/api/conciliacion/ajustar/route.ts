import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/database";

type Conciliacion = {
  id: number;
  registro_uuid: string;
  fecha: string;
  explosivo: string;
  lote: string;
  unidad: string | null;
  stock_sistema: number;
  stock_fisico: number;
  diferencia: number;
  responsable: string | null;
  observacion: string | null;
  estado: string;
  ajuste_generado: number;
};

type Inventario = {
  id: number;
  explosivo: string;
  lote: string;
  unidad: string | null;
  stock_actual: number;
};

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const conciliacionId = Number(
      body.conciliacion_id
    );

    if (
      !Number.isInteger(conciliacionId) ||
      conciliacionId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Debes indicar una conciliación válida.",
        },
        {
          status: 400,
        }
      );
    }

    const conciliacion = db
      .prepare(`
        SELECT
          id,
          registro_uuid,
          fecha,
          explosivo,
          lote,
          unidad,
          stock_sistema,
          stock_fisico,
          diferencia,
          responsable,
          observacion,
          estado,
          ajuste_generado
        FROM conciliaciones
        WHERE id = ?
      `)
      .get(conciliacionId) as
      | Conciliacion
      | undefined;

    if (!conciliacion) {
      return NextResponse.json(
        {
          error:
            "La conciliación no existe.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      Number(conciliacion.ajuste_generado) === 1
    ) {
      return NextResponse.json(
        {
          error:
            "Esta conciliación ya tiene un ajuste generado.",
        },
        {
          status: 409,
        }
      );
    }

    const diferencia = Number(
      conciliacion.diferencia
    );

    if (diferencia === 0) {
      return NextResponse.json(
        {
          error:
            "La conciliación no presenta diferencias y no requiere ajuste.",
        },
        {
          status: 400,
        }
      );
    }

    const inventario = db
      .prepare(`
        SELECT
          id,
          explosivo,
          lote,
          unidad,
          stock_actual
        FROM inventario
        WHERE explosivo = ?
          AND lote = ?
        LIMIT 1
      `)
      .get(
        conciliacion.explosivo,
        conciliacion.lote
      ) as
      | Inventario
      | undefined;

    if (!inventario) {
      return NextResponse.json(
        {
          error:
            "El producto y lote ya no existen en inventario.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Protección importante:
     * comprobamos que el stock no haya cambiado
     * después de realizar la conciliación.
     */
    const stockActual = Number(
      inventario.stock_actual
    );

    const stockConciliado = Number(
      conciliacion.stock_sistema
    );

    if (stockActual !== stockConciliado) {
      return NextResponse.json(
        {
          error:
            "El inventario cambió después de realizar la conciliación.",

          detalle:
            `La conciliación se realizó con ${stockConciliado} ${conciliacion.unidad ?? ""}, pero actualmente existen ${stockActual} ${inventario.unidad ?? ""}. Debes realizar una nueva conciliación.`,
        },
        {
          status: 409,
        }
      );
    }

    const tipoMovimiento =
      diferencia > 0
        ? "AJUSTE_ENTRADA"
        : "AJUSTE_SALIDA";

    const cantidadAjuste =
      Math.abs(diferencia);

    const nuevoStock = Number(
      conciliacion.stock_fisico
    );

    const ejecutarAjuste =
      db.transaction(() => {
        const movimientoUuid =
          randomUUID();

        /*
         * Crear movimiento de inventario.
         */
        const movimiento = db
          .prepare(`
            INSERT INTO movimientos_inventario (
              registro_uuid,
              fecha,
              tipo_movimiento,
              explosivo,
              cantidad,
              unidad,
              lote,
              vale_id,
              observacion,
              proveedor,
              documento_referencia,
              responsable,
              fuente_origen,
              sincronizado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .run(
            movimientoUuid,
            conciliacion.fecha,
            tipoMovimiento,
            conciliacion.explosivo,
            cantidadAjuste,
            conciliacion.unidad,
            conciliacion.lote,
            null,
            `Ajuste generado por conciliación de inventario #${conciliacion.id}`,
            null,
            `CONCILIACION-${conciliacion.id}`,
            body.responsable ||
              conciliacion.responsable ||
              "USUARIO_PRUEBA",
            "MINEBLAST_APP",
            0
          );

        const movimientoId = Number(
          movimiento.lastInsertRowid
        );

        /*
         * Actualizar stock al valor físico contado.
         */
        db.prepare(`
          UPDATE inventario
          SET
            stock_actual = ?,
            actualizado_en =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          nuevoStock,
          inventario.id
        );

        /*
         * Cola de sincronización del movimiento.
         */
        db.prepare(`
          INSERT INTO sincronizacion (
            entidad,
            registro_id,
            registro_uuid,
            operacion,
            estado
          )
          VALUES (?, ?, ?, ?, ?)
        `).run(
          "MOVIMIENTO_INVENTARIO",
          movimientoId,
          movimientoUuid,
          "INSERT",
          "PENDIENTE"
        );

        /*
         * Actualizar conciliación.
         */
        db.prepare(`
          UPDATE conciliaciones
          SET
            ajuste_generado = 1,
            estado = 'AJUSTADA',
            sincronizado = 0,
            fecha_sincronizacion = NULL
          WHERE id = ?
        `).run(
          conciliacion.id
        );

        /*
         * Auditoría.
         */
        db.prepare(`
          INSERT INTO auditoria (
            registro_uuid,
            usuario,
            accion,
            entidad,
            registro_id,
            detalle
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          randomUUID(),
          body.responsable ||
            conciliacion.responsable ||
            "USUARIO_PRUEBA",
          "AJUSTE_CONCILIACION",
          "CONCILIACION",
          conciliacion.id,
          `${tipoMovimiento}: ${cantidadAjuste} ${conciliacion.unidad ?? ""} de ${conciliacion.explosivo}, lote ${conciliacion.lote}. Stock anterior ${stockActual}, nuevo stock ${nuevoStock}.`
        );

        return {
          movimientoId,
          movimientoUuid,
        };
      });

    const resultado =
      ejecutarAjuste();

    return NextResponse.json(
      {
        mensaje:
          "Ajuste de inventario generado correctamente.",

        conciliacion_id:
          conciliacion.id,

        movimiento_id:
          resultado.movimientoId,

        movimiento_uuid:
          resultado.movimientoUuid,

        tipo_movimiento:
          tipoMovimiento,

        cantidad_ajuste:
          cantidadAjuste,

        stock_anterior:
          stockActual,

        stock_actual:
          nuevoStock,

        estado:
          "AJUSTADA",

        sincronizacion:
          "PENDIENTE",
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "Error generando ajuste de conciliación:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible generar el ajuste.",

        detalle:
          error?.message ??
          String(error),
      },
      {
        status: 500,
      }
    );
  }
}