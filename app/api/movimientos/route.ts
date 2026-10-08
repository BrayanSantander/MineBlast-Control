import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/database";

export async function GET() {
  try {
    const movimientos = db
      .prepare(`
        SELECT
          id,
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
          sincronizado,
          fecha_sincronizacion,
          creado_en
        FROM movimientos_inventario
        ORDER BY id DESC
      `)
      .all();

    return NextResponse.json({
      datos: movimientos,
    });
  } catch (error) {
    console.error("Error GET /api/movimientos:", error);

    return NextResponse.json(
      {
        error: "No fue posible obtener los movimientos.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      !body.fecha ||
      !body.tipo_movimiento ||
      !body.explosivo ||
      !body.cantidad
    ) {
      return NextResponse.json(
        {
          error:
            "Fecha, tipo de movimiento, explosivo y cantidad son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    const cantidad = Number(body.cantidad);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return NextResponse.json(
        {
          error: "La cantidad debe ser mayor a cero.",
        },
        {
          status: 400,
        }
      );
    }

    const tipo = String(
      body.tipo_movimiento
    ).toUpperCase();

    const tiposPermitidos = [
      "REABASTECIMIENTO",
      "DESPACHO",
      "DEVOLUCION",
      "AJUSTE_ENTRADA",
      "AJUSTE_SALIDA",
    ];

    if (!tiposPermitidos.includes(tipo)) {
      return NextResponse.json(
        {
          error: "Tipo de movimiento no válido.",
        },
        {
          status: 400,
        }
      );
    }

    const explosivo = String(body.explosivo).trim();
    const lote = String(body.lote ?? "").trim();
    const unidad = String(body.unidad ?? "").trim();

    if (!lote) {
      return NextResponse.json(
        {
          error:
            "El lote es obligatorio para mantener la trazabilidad del inventario.",
        },
        {
          status: 400,
        }
      );
    }

    const transaction = db.transaction(() => {
      const registroUuid = randomUUID();

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
          explosivo,
          lote
        ) as
        | {
            id: number;
            stock_actual: number;
            unidad: string | null;
          }
        | undefined;

      const stockActual = Number(
        stock?.stock_actual ?? 0
      );

      let nuevoStock = stockActual;

      if (
        tipo === "REABASTECIMIENTO" ||
        tipo === "DEVOLUCION" ||
        tipo === "AJUSTE_ENTRADA"
      ) {
        nuevoStock = stockActual + cantidad;
      }

      if (
        tipo === "DESPACHO" ||
        tipo === "AJUSTE_SALIDA"
      ) {
        if (!stock) {
          throw new Error(
            "STOCK_INSUFICIENTE|No existe stock para ese explosivo y lote."
          );
        }

        if (cantidad > stockActual) {
          throw new Error(
            `STOCK_INSUFICIENTE|Stock disponible: ${stockActual} ${stock.unidad ?? unidad}`
          );
        }

        nuevoStock = stockActual - cantidad;
      }

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
          registroUuid,
          body.fecha,
          tipo,
          explosivo,
          cantidad,
          unidad || null,
          lote,
          body.vale_id || null,
          body.observacion || null,
          body.proveedor || null,
          body.documento_referencia || null,
          body.responsable || null,
          "MINEBLAST_APP",
          0
        );

      if (stock) {
        db.prepare(`
          UPDATE inventario
          SET
            stock_actual = ?,
            unidad = COALESCE(?, unidad),
            actualizado_en = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          nuevoStock,
          unidad || null,
          stock.id
        );
      } else {
        db.prepare(`
          INSERT INTO inventario (
            explosivo,
            lote,
            unidad,
            stock_actual
          )
          VALUES (?, ?, ?, ?)
        `).run(
          explosivo,
          lote,
          unidad || null,
          nuevoStock
        );
      }

      const movimientoId = Number(
        movimiento.lastInsertRowid
      );

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
        registroUuid,
        "INSERT",
        "PENDIENTE"
      );

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
        body.usuario || "SISTEMA",
        tipo,
        "INVENTARIO",
        movimientoId,
        `${tipo}: ${cantidad} ${unidad} de ${explosivo}, lote ${lote}`
      );

      return {
        movimientoId,
        registroUuid,
        nuevoStock,
      };
    });

    const resultado = transaction();

    return NextResponse.json(
      {
        mensaje:
          "Movimiento registrado correctamente.",
        movimiento_id:
          resultado.movimientoId,
        registro_uuid:
          resultado.registroUuid,
        stock_actual:
          resultado.nuevoStock,
        sincronizacion:
          "PENDIENTE",
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    const mensaje = String(
      error?.message ?? ""
    );

    if (
      mensaje.startsWith(
        "STOCK_INSUFICIENTE|"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Stock insuficiente para realizar el movimiento.",
          detalle:
            mensaje.split("|")[1] ??
            "",
        },
        {
          status: 409,
        }
      );
    }

    console.error(
      "Error POST /api/movimientos:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible registrar el movimiento.",
        detalle:
          mensaje,
      },
      {
        status: 500,
      }
    );
  }
}