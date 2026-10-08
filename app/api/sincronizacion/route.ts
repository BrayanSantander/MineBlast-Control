import { NextResponse } from "next/server";

import db from "@/lib/database";

import { queryDatabricks } from "@/lib/databricks";

import { procesarDataWarehouse } from "@/lib/pipeline-dw";


function textoSQL(valor: unknown) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ""
  ) {
    return "NULL";
  }

  return `'${String(valor).replace(/'/g, "''")}'`;
}


function numeroSQL(valor: unknown) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "NULL";
  }

  return String(numero);
}


export async function GET() {
  try {
    const valesPendientes = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM vales
        WHERE sincronizado = 0
      `)
      .get() as { total: number };

    const valesSincronizados = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM vales
        WHERE sincronizado = 1
      `)
      .get() as { total: number };


    const movimientosPendientes = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM movimientos_inventario
        WHERE sincronizado = 0
      `)
      .get() as { total: number };

    const movimientosSincronizados = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM movimientos_inventario
        WHERE sincronizado = 1
      `)
      .get() as { total: number };


    const conciliacionesPendientes = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM conciliaciones
        WHERE sincronizado = 0
      `)
      .get() as { total: number };

    const conciliacionesSincronizadas = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM conciliaciones
        WHERE sincronizado = 1
      `)
      .get() as { total: number };


    return NextResponse.json({
      vales: {
        pendientes: valesPendientes.total,
        sincronizados: valesSincronizados.total,
      },

      movimientos: {
        pendientes: movimientosPendientes.total,
        sincronizados: movimientosSincronizados.total,
      },

      conciliaciones: {
        pendientes: conciliacionesPendientes.total,
        sincronizados:
          conciliacionesSincronizadas.total,
      },
    });
  } catch (error) {
    console.error(
      "Error GET /api/sincronizacion:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible consultar el estado de sincronización.",
      },
      {
        status: 500,
      }
    );
  }
}


export async function POST() {
  let valesProcesados = 0;

  let movimientosProcesados = 0;

  let conciliacionesProcesadas = 0;


  try {
    // =====================================================
    // 1. SINCRONIZAR VALES
    // =====================================================

    const vales = db
      .prepare(`
        SELECT *
        FROM vales
        WHERE sincronizado = 0
        ORDER BY id
      `)
      .all() as any[];


    for (const vale of vales) {
      try {
        await queryDatabricks(`
          MERGE INTO mineblast.bronze.vales_mineblast AS destino

          USING (
            SELECT
              ${textoSQL(
                vale.registro_uuid
              )} AS registro_uuid,

              ${textoSQL(
                vale.numero_vale
              )} AS numero_vale,

              CAST(
                ${textoSQL(
                  vale.fecha_vale
                )}
                AS DATE
              ) AS fecha_vale,

              CAST(
                ${textoSQL(
                  vale.fecha_disparo
                )}
                AS DATE
              ) AS fecha_disparo,

              ${textoSQL(
                vale.turno
              )} AS turno,

              ${textoSQL(
                vale.sector
              )} AS sector,

              ${textoSQL(
                vale.labor
              )} AS labor,

              ${textoSQL(
                vale.nivel
              )} AS nivel,

              ${textoSQL(
                vale.tipo
              )} AS tipo,

              ${textoSQL(
                vale.tipo_diagrama
              )} AS tipo_diagrama,

              ${textoSQL(
                vale.supervisor
              )} AS supervisor,

              ${textoSQL(
                vale.estado
              )} AS estado,

              ${textoSQL(
                vale.fuente_origen
              )} AS fuente_origen,

              CAST(
                ${textoSQL(
                  vale.creado_en
                )}
                AS TIMESTAMP
              ) AS creado_en,

              CAST(
                ${textoSQL(
                  vale.actualizado_en
                )}
                AS TIMESTAMP
              ) AS actualizado_en,

              CURRENT_TIMESTAMP()
                AS fecha_ingesta
          ) AS origen

          ON destino.registro_uuid =
             origen.registro_uuid

          WHEN MATCHED THEN
            UPDATE SET *

          WHEN NOT MATCHED THEN
            INSERT *
        `);


        const detalles = db
          .prepare(`
            SELECT *
            FROM vale_detalle
            WHERE vale_id = ?
              AND sincronizado = 0
          `)
          .all(vale.id) as any[];


        for (const detalle of detalles) {
          await queryDatabricks(`
            MERGE INTO mineblast.bronze.vale_detalle_mineblast AS destino

            USING (
              SELECT
                ${textoSQL(
                  detalle.registro_uuid
                )} AS registro_uuid,

                ${textoSQL(
                  vale.registro_uuid
                )} AS vale_uuid,

                ${textoSQL(
                  detalle.explosivo
                )} AS explosivo,

                ${numeroSQL(
                  detalle.cantidad
                )} AS cantidad,

                ${textoSQL(
                  detalle.unidad
                )} AS unidad,

                ${textoSQL(
                  detalle.lote
                )} AS lote,

                CAST(
                  ${textoSQL(
                    detalle.creado_en
                  )}
                  AS TIMESTAMP
                ) AS creado_en,

                CURRENT_TIMESTAMP()
                  AS fecha_ingesta
            ) AS origen

            ON destino.registro_uuid =
               origen.registro_uuid

            WHEN MATCHED THEN
              UPDATE SET *

            WHEN NOT MATCHED THEN
              INSERT *
          `);


          db.prepare(`
            UPDATE vale_detalle
            SET
              sincronizado = 1,
              fecha_sincronizacion =
                CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(detalle.id);
        }


        db.prepare(`
          UPDATE vales
          SET
            sincronizado = 1,
            fecha_sincronizacion =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(vale.id);


        db.prepare(`
          UPDATE sincronizacion
          SET
            estado = 'SINCRONIZADO',
            sincronizado_en =
              CURRENT_TIMESTAMP,
            ultimo_error = NULL
          WHERE entidad = 'VALE'
            AND registro_uuid = ?
        `).run(
          vale.registro_uuid
        );


        valesProcesados++;
      } catch (error: any) {
        console.error(
          `Error sincronizando vale ${vale.numero_vale}:`,
          error
        );


        db.prepare(`
          UPDATE sincronizacion
          SET
            estado = 'ERROR',
            intentos = intentos + 1,
            ultimo_error = ?
          WHERE entidad = 'VALE'
            AND registro_uuid = ?
        `).run(
          String(
            error?.message ??
              "Error desconocido"
          ),
          vale.registro_uuid
        );
      }
    }


    // =====================================================
    // 2. SINCRONIZAR MOVIMIENTOS DE INVENTARIO
    // =====================================================

    const movimientos = db
      .prepare(`
        SELECT *
        FROM movimientos_inventario
        WHERE sincronizado = 0
        ORDER BY id
      `)
      .all() as any[];


    for (const movimiento of movimientos) {
      try {
        await queryDatabricks(`
          MERGE INTO mineblast.bronze.movimientos_inventario_mineblast AS destino

          USING (
            SELECT
              ${textoSQL(
                movimiento.registro_uuid
              )} AS registro_uuid,

              CAST(
                ${textoSQL(
                  movimiento.fecha
                )}
                AS DATE
              ) AS fecha,

              ${textoSQL(
                movimiento.tipo_movimiento
              )} AS tipo_movimiento,

              ${textoSQL(
                movimiento.explosivo
              )} AS explosivo,

              ${numeroSQL(
                movimiento.cantidad
              )} AS cantidad,

              ${textoSQL(
                movimiento.unidad
              )} AS unidad,

              ${textoSQL(
                movimiento.lote
              )} AS lote,

              ${textoSQL(
                movimiento.vale_id
              )} AS vale_id,

              ${textoSQL(
                movimiento.observacion
              )} AS observacion,

              ${textoSQL(
                movimiento.proveedor
              )} AS proveedor,

              ${textoSQL(
                movimiento.documento_referencia
              )} AS documento_referencia,

              ${textoSQL(
                movimiento.responsable
              )} AS responsable,

              ${textoSQL(
                movimiento.fuente_origen
              )} AS fuente_origen,

              CAST(
                ${textoSQL(
                  movimiento.creado_en
                )}
                AS TIMESTAMP
              ) AS creado_en,

              CURRENT_TIMESTAMP()
                AS fecha_ingesta
          ) AS origen

          ON destino.registro_uuid =
             origen.registro_uuid

          WHEN MATCHED THEN
            UPDATE SET *

          WHEN NOT MATCHED THEN
            INSERT *
        `);


        db.prepare(`
          UPDATE movimientos_inventario
          SET
            sincronizado = 1,
            fecha_sincronizacion =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          movimiento.id
        );


        db.prepare(`
          UPDATE sincronizacion
          SET
            estado = 'SINCRONIZADO',
            sincronizado_en =
              CURRENT_TIMESTAMP,
            ultimo_error = NULL
          WHERE entidad =
            'MOVIMIENTO_INVENTARIO'
            AND registro_uuid = ?
        `).run(
          movimiento.registro_uuid
        );


        movimientosProcesados++;
      } catch (error: any) {
        console.error(
          `Error sincronizando movimiento ${movimiento.id}:`,
          error
        );


        db.prepare(`
          UPDATE sincronizacion
          SET
            estado = 'ERROR',
            intentos = intentos + 1,
            ultimo_error = ?
          WHERE entidad =
            'MOVIMIENTO_INVENTARIO'
            AND registro_uuid = ?
        `).run(
          String(
            error?.message ??
              "Error desconocido"
          ),
          movimiento.registro_uuid
        );
      }
    }


    // =====================================================
    // 3. SINCRONIZAR CONCILIACIONES
    // =====================================================

    const conciliaciones = db
      .prepare(`
        SELECT *
        FROM conciliaciones
        WHERE sincronizado = 0
        ORDER BY id
      `)
      .all() as any[];


    for (const conciliacion of conciliaciones) {
      try {
        await queryDatabricks(`
          MERGE INTO mineblast.bronze.conciliaciones_inventario AS destino

          USING (
            SELECT
              ${textoSQL(
                conciliacion.registro_uuid
              )} AS registro_uuid,

              CAST(
                ${textoSQL(
                  conciliacion.fecha
                )}
                AS DATE
              ) AS fecha,

              ${textoSQL(
                conciliacion.explosivo
              )} AS explosivo,

              ${textoSQL(
                conciliacion.lote
              )} AS lote,

              ${textoSQL(
                conciliacion.unidad
              )} AS unidad,

              ${numeroSQL(
                conciliacion.stock_sistema
              )} AS stock_sistema,

              ${numeroSQL(
                conciliacion.stock_fisico
              )} AS stock_fisico,

              ${numeroSQL(
                conciliacion.diferencia
              )} AS diferencia,

              ${textoSQL(
                conciliacion.responsable
              )} AS responsable,

              ${textoSQL(
                conciliacion.observacion
              )} AS observacion,

              ${textoSQL(
                conciliacion.estado
              )} AS estado,

              ${numeroSQL(
                conciliacion.ajuste_generado
              )} AS ajuste_generado,

              'MINEBLAST_APP'
                AS fuente_origen,

              CAST(
                ${textoSQL(
                  conciliacion.creado_en
                )}
                AS TIMESTAMP
              ) AS creado_en,

              CURRENT_TIMESTAMP()
                AS fecha_ingesta
          ) AS origen

          ON destino.registro_uuid =
             origen.registro_uuid

          WHEN MATCHED THEN
            UPDATE SET *

          WHEN NOT MATCHED THEN
            INSERT *
        `);


        const verificacion =
          await queryDatabricks(`
            SELECT registro_uuid
            FROM mineblast.bronze.conciliaciones_inventario
            WHERE registro_uuid =
              ${textoSQL(
                conciliacion.registro_uuid
              )}
            LIMIT 1
          `);


        if (
          !Array.isArray(verificacion) ||
          verificacion.length === 0
        ) {
          throw new Error(
            "Databricks no confirmó el registro de la conciliación en Bronze."
          );
        }


        db.prepare(`
          UPDATE conciliaciones
          SET
            sincronizado = 1,
            fecha_sincronizacion =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          conciliacion.id
        );


        db.prepare(`
          UPDATE sincronizacion
          SET
            estado = 'SINCRONIZADO',
            sincronizado_en =
              CURRENT_TIMESTAMP,
            ultimo_error = NULL
          WHERE entidad =
            'CONCILIACION'
            AND registro_uuid = ?
        `).run(
          conciliacion.registro_uuid
        );


        conciliacionesProcesadas++;
      } catch (error: any) {
        console.error(
          `Error sincronizando conciliación ${conciliacion.id}:`,
          error
        );


        db.prepare(`
          UPDATE sincronizacion
          SET
            estado = 'ERROR',
            intentos = intentos + 1,
            ultimo_error = ?
          WHERE entidad =
            'CONCILIACION'
            AND registro_uuid = ?
        `).run(
          String(
            error?.message ??
              "Error desconocido"
          ),
          conciliacion.registro_uuid
        );
      }
    }


    // =====================================================
    // 4. EJECUTAR PIPELINE DEL DATA WAREHOUSE
    // =====================================================

    let pipeline: any = {
      estado: "SIN_CAMBIOS",
      mensaje:
        "No había nuevos registros para procesar.",
    };


    /*
     * IMPORTANTE:
     *
     * El pipeline se ejecuta SIEMPRE.
     *
     * Esto permite recuperar registros que ya llegaron
     * a Bronze pero que todavía no fueron procesados
     * hacia Silver o Gold.
     */
    try {
      pipeline =
        await procesarDataWarehouse();
    } catch (error: any) {
      pipeline = {
        estado: "ERROR",
        mensaje:
          error?.message ??
          "Error procesando el Data Warehouse.",
      };

      console.error(
        "Error ejecutando pipeline DW:",
        error
      );
    }


    return NextResponse.json({
      mensaje:
        "Proceso de sincronización finalizado.",

      vales_procesados:
        valesProcesados,

      movimientos_procesados:
        movimientosProcesados,

      conciliaciones_procesadas:
        conciliacionesProcesadas,

      pipeline,
    });
  } catch (error: any) {
    console.error(
      "Error general de sincronización:",
      error
    );


    return NextResponse.json(
      {
        error:
          "No fue posible completar la sincronización.",

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