import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/database";

type Vale = {
  id: number;
  registro_uuid: string;
  numero_vale: string;
  fecha_vale: string;
  labor: string;
  supervisor: string | null;
  estado: string;
};

type DetalleVale = {
  id: number;
  explosivo: string;
  cantidad: number;
  unidad: string | null;
  lote: string | null;
};

type Stock = {
  id: number;
  explosivo: string;
  lote: string;
  unidad: string | null;
  stock_actual: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const valeId = Number(body.vale_id);

    if (!Number.isInteger(valeId) || valeId <= 0) {
      return NextResponse.json(
        {
          error: "Debes seleccionar un vale válido.",
        },
        {
          status: 400,
        }
      );
    }

    const vale = db
      .prepare(`
        SELECT
          id,
          registro_uuid,
          numero_vale,
          fecha_vale,
          labor,
          supervisor,
          estado
        FROM vales
        WHERE id = ?
      `)
      .get(valeId) as Vale | undefined;

    if (!vale) {
      return NextResponse.json(
        {
          error: "El vale seleccionado no existe.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Evitar despachar el mismo vale dos veces.
     */
    const despachoExistente = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM movimientos_inventario
        WHERE vale_id = ?
          AND tipo_movimiento = 'DESPACHO'
      `)
      .get(vale.id) as { total: number };

    if (despachoExistente.total > 0) {
      return NextResponse.json(
        {
          error:
            "Este vale ya tiene un despacho registrado.",
        },
        {
          status: 409,
        }
      );
    }

    const detalles = db
      .prepare(`
        SELECT
          id,
          explosivo,
          cantidad,
          unidad,
          lote
        FROM vale_detalle
        WHERE vale_id = ?
        ORDER BY id
      `)
      .all(vale.id) as DetalleVale[];

    if (detalles.length === 0) {
      return NextResponse.json(
        {
          error:
            "El vale no contiene productos para despachar.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VALIDACIONES PREVIAS
     * =====================================================
     */

    for (const detalle of detalles) {
      if (!detalle.lote?.trim()) {
        return NextResponse.json(
          {
            error:
              `El producto ${detalle.explosivo} no tiene lote asociado.`,
            detalle:
              "Para realizar un despacho automático todos los productos del vale deben tener lote.",
          },
          {
            status: 400,
          }
        );
      }

      const stock = db
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
          detalle.explosivo,
          detalle.lote
        ) as Stock | undefined;

      if (!stock) {
        return NextResponse.json(
          {
            error:
              `No existe stock para ${detalle.explosivo}, lote ${detalle.lote}.`,
          },
          {
            status: 409,
          }
        );
      }

      if (
        Number(stock.stock_actual) <
        Number(detalle.cantidad)
      ) {
        return NextResponse.json(
          {
            error:
              `Stock insuficiente para ${detalle.explosivo}.`,
            detalle:
              `Lote ${detalle.lote}: disponible ${stock.stock_actual} ${stock.unidad ?? ""}, solicitado ${detalle.cantidad} ${detalle.unidad ?? ""}.`,
          },
          {
            status: 409,
          }
        );
      }
    }

    /*
     * =====================================================
     * TRANSACCIÓN
     * =====================================================
     */

    const ejecutarDespacho = db.transaction(() => {
      const movimientosCreados: {
        registro_uuid: string;
        explosivo: string;
        cantidad: number;
        lote: string;
        stock_restante: number;
      }[] = [];

      for (const detalle of detalles) {
        const stock = db
          .prepare(`
            SELECT
              id,
              stock_actual,
              unidad
            FROM inventario
            WHERE explosivo = ?
              AND lote = ?
            LIMIT 1
          `)
          .get(
            detalle.explosivo,
            detalle.lote
          ) as
          | {
              id: number;
              stock_actual: number;
              unidad: string | null;
            }
          | undefined;

        if (!stock) {
          throw new Error(
            `STOCK|No existe stock para ${detalle.explosivo}.`
          );
        }

        const stockActual =
          Number(stock.stock_actual);

        const cantidad =
          Number(detalle.cantidad);

        if (cantidad > stockActual) {
          throw new Error(
            `STOCK|Stock insuficiente para ${detalle.explosivo}.`
          );
        }

        const nuevoStock =
          stockActual - cantidad;

        const movimientoUuid =
          randomUUID();

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
            vale.fecha_vale,
            "DESPACHO",
            detalle.explosivo,
            cantidad,
            detalle.unidad || stock.unidad || null,
            detalle.lote,
            vale.id,
            `Despacho automático asociado al vale ${vale.numero_vale}`,
            null,
            vale.numero_vale,
            body.responsable ||
              vale.supervisor ||
              "SISTEMA",
            "MINEBLAST_APP",
            0
          );

        const movimientoId = Number(
          movimiento.lastInsertRowid
        );

        /*
         * Descontar stock.
         */
        db.prepare(`
          UPDATE inventario
          SET
            stock_actual = ?,
            actualizado_en = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          nuevoStock,
          stock.id
        );

        /*
         * Cola de sincronización.
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

        movimientosCreados.push({
          registro_uuid: movimientoUuid,
          explosivo: detalle.explosivo,
          cantidad,
          lote: detalle.lote!,
          stock_restante: nuevoStock,
        });
      }

      /*
       * Cambiar estado del vale.
       */
      db.prepare(`
        UPDATE vales
        SET
          estado = 'DESPACHADO',
          sincronizado = 0,
          fecha_sincronizacion = NULL,
          actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(vale.id);

      /*
       * Como el vale cambió de estado,
       * debe volver a sincronizarse.
       */
      const colaVale = db
        .prepare(`
          UPDATE sincronizacion
          SET
            estado = 'PENDIENTE',
            intentos = 0,
            ultimo_error = NULL,
            sincronizado_en = NULL
          WHERE entidad = 'VALE'
            AND registro_uuid = ?
        `)
        .run(vale.registro_uuid);

      if (colaVale.changes === 0) {
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
          "VALE",
          vale.id,
          vale.registro_uuid,
          "INSERT",
          "PENDIENTE"
        );
      }

      /*
       * Auditoría general del despacho.
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
          vale.supervisor ||
          "SISTEMA",
        "DESPACHO_VALE",
        "VALE",
        vale.id,
        `Despacho automático del vale ${vale.numero_vale}. Productos despachados: ${detalles.length}.`
      );

      return movimientosCreados;
    });

    const movimientos =
      ejecutarDespacho();

    return NextResponse.json(
      {
        mensaje:
          "Despacho realizado correctamente.",

        vale: {
          id: vale.id,
          numero_vale: vale.numero_vale,
          estado: "DESPACHADO",
          labor: vale.labor,
        },

        productos_despachados:
          movimientos.length,

        movimientos,

        sincronizacion:
          "PENDIENTE",
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "Error realizando despacho:",
      error
    );

    const mensaje = String(
      error?.message ?? ""
    );

    if (mensaje.startsWith("STOCK|")) {
      return NextResponse.json(
        {
          error:
            mensaje.split("|")[1] ??
            "Stock insuficiente.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "No fue posible realizar el despacho.",
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