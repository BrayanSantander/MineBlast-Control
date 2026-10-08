import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/database";

export async function GET() {
  try {
    const vales = db
      .prepare(`
        SELECT
          id,
          registro_uuid,
          numero_vale,
          fecha_vale,
          fecha_disparo,
          turno,
          sector,
          labor,
          nivel,
          tipo,
          tipo_diagrama,
          supervisor,
          estado,
          fuente_origen,
          sincronizado,
          fecha_sincronizacion,
          creado_en
        FROM vales
        ORDER BY id DESC
      `)
      .all();

    return NextResponse.json({
      datos: vales,
    });
  } catch (error) {
    console.error("Error GET /api/vales:", error);

    return NextResponse.json(
      {
        error: "No fue posible obtener los vales.",
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
      !body.numero_vale ||
      !body.fecha_vale ||
      !body.turno ||
      !body.labor
    ) {
      return NextResponse.json(
        {
          error:
            "Número de vale, fecha, turno y labor son obligatorios.",
        },
        {
          status: 400,
        }
      );
    }

    const transaction = db.transaction(() => {
      const valeUuid = randomUUID();

      const resultado = db
        .prepare(`
          INSERT INTO vales (
            registro_uuid,
            numero_vale,
            fecha_vale,
            fecha_disparo,
            turno,
            sector,
            labor,
            nivel,
            tipo,
            tipo_diagrama,
            supervisor,
            estado,
            fuente_origen,
            sincronizado
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          valeUuid,
          body.numero_vale,
          body.fecha_vale,
          body.fecha_disparo || null,
          body.turno,
          body.sector || null,
          body.labor,
          body.nivel || null,
          body.tipo || null,
          body.tipo_diagrama || null,
          body.supervisor || null,
          "PENDIENTE",
          "MINEBLAST_APP",
          0
        );

      const valeId = Number(resultado.lastInsertRowid);

      if (Array.isArray(body.detalle)) {
        const insertarDetalle = db.prepare(`
          INSERT INTO vale_detalle (
            registro_uuid,
            vale_id,
            explosivo,
            cantidad,
            unidad,
            lote,
            sincronizado
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const producto of body.detalle) {
          const cantidad = Number(producto.cantidad);

          if (!producto.explosivo || cantidad <= 0) {
            continue;
          }

          insertarDetalle.run(
            randomUUID(),
            valeId,
            producto.explosivo,
            cantidad,
            producto.unidad || null,
            producto.lote || null,
            0
          );
        }
      }

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
        valeId,
        valeUuid,
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
        "CREAR",
        "VALE",
        valeId,
        `Creación del vale ${body.numero_vale}`
      );

      return {
        valeId,
        valeUuid,
      };
    });

    const resultado = transaction();

    return NextResponse.json(
      {
        mensaje: "Vale registrado correctamente.",
        vale_id: resultado.valeId,
        registro_uuid: resultado.valeUuid,
        sincronizacion: "PENDIENTE",
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error("Error POST /api/vales:", error);

    if (
      String(error?.message).includes(
        "UNIQUE constraint failed"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El número de vale o registro ya se encuentra registrado.",
        },
        {
          status: 409,
        }
      );
    }

    return NextResponse.json(
      {
        error: "No fue posible registrar el vale.",
      },
      {
        status: 500,
      }
    );
  }
}