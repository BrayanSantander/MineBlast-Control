import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/database";

export async function GET() {
  try {
    const datos = db
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
          ajuste_generado,
          sincronizado,
          fecha_sincronizacion,
          creado_en
        FROM conciliaciones
        ORDER BY id DESC
      `)
      .all();

    return NextResponse.json({
      datos,
    });
  } catch (error) {
    console.error(
      "Error GET /api/conciliacion:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible obtener las conciliaciones.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    if (
      !body.fecha ||
      !body.explosivo ||
      !body.lote ||
      body.stock_fisico === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Fecha, explosivo, lote y stock físico son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    const stockFisico =
      Number(body.stock_fisico);

    if (
      !Number.isFinite(stockFisico) ||
      stockFisico < 0
    ) {
      return NextResponse.json(
        {
          error:
            "El stock físico debe ser un número igual o mayor a cero.",
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
        body.explosivo,
        body.lote
      ) as
      | {
          id: number;
          explosivo: string;
          lote: string;
          unidad: string | null;
          stock_actual: number;
        }
      | undefined;

    if (!inventario) {
      return NextResponse.json(
        {
          error:
            "No existe ese explosivo y lote en el inventario.",
        },
        {
          status: 404,
        }
      );
    }

    const stockSistema =
      Number(inventario.stock_actual);

    const diferencia =
      stockFisico - stockSistema;

    const registroUuid =
      randomUUID();

    const resultado = db
      .prepare(`
        INSERT INTO conciliaciones (
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
          ajuste_generado,
          sincronizado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        registroUuid,
        body.fecha,
        inventario.explosivo,
        inventario.lote,
        inventario.unidad,
        stockSistema,
        stockFisico,
        diferencia,
        body.responsable || null,
        body.observacion || null,
        diferencia === 0
          ? "CONCILIADO"
          : "DIFERENCIA",
        0,
        0
      );

    const conciliacionId = Number(
      resultado.lastInsertRowid
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
      "CONCILIACION",
      conciliacionId,
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
      body.responsable ||
        "USUARIO_PRUEBA",
      "CONCILIACION_INVENTARIO",
      "CONCILIACION",
      conciliacionId,
      `Conciliación ${inventario.explosivo} lote ${inventario.lote}: sistema ${stockSistema}, físico ${stockFisico}, diferencia ${diferencia}`
    );

    return NextResponse.json(
      {
        mensaje:
          "Conciliación registrada correctamente.",

        conciliacion_id:
          conciliacionId,

        registro_uuid:
          registroUuid,

        stock_sistema:
          stockSistema,

        stock_fisico:
          stockFisico,

        diferencia,

        estado:
          diferencia === 0
            ? "CONCILIADO"
            : "DIFERENCIA",

        sincronizacion:
          "PENDIENTE",
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "Error POST /api/conciliacion:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible registrar la conciliación.",

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