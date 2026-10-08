import { NextRequest, NextResponse } from "next/server";

import { queryDatabricks } from "@/lib/databricks";


function numeroSeguro(valor: unknown) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}


export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);


    const anioParametro =
      searchParams.get("anio");


    const mesParametro =
      searchParams.get("mes");


    const anio =
      anioParametro &&
      Number.isFinite(
        Number(anioParametro)
      )
        ? Number(anioParametro)
        : null;


    const mes =
      mesParametro &&
      Number.isFinite(
        Number(mesParametro)
      )
        ? Number(mesParametro)
        : null;


    /*
     * =====================================================
     * FILTROS
     * =====================================================
     */

    const filtros: string[] = [];


    if (anio !== null) {
      filtros.push(
        `anio = ${anio}`
      );
    }


    if (mes !== null) {
      filtros.push(
        `numero_mes = ${mes}`
      );
    }


    const where =
      filtros.length > 0
        ? `WHERE ${filtros.join(
            " AND "
          )}`
        : "";


    /*
     * =====================================================
     * 1. RESUMEN KPI DE CONCILIACION
     * =====================================================
     */

    const resumenResultado =
      await queryDatabricks(`
        SELECT

          COUNT(*)
            AS conciliaciones_realizadas,

          SUM(
            CASE
              WHEN diferencia = 0
                THEN 1
              ELSE 0
            END
          )
            AS conciliaciones_sin_diferencia,

          SUM(
            CASE
              WHEN diferencia <> 0
                THEN 1
              ELSE 0
            END
          )
            AS conciliaciones_con_diferencia,

          SUM(
            CASE
              WHEN diferencia < 0
                THEN 1
              ELSE 0
            END
          )
            AS faltantes,

          SUM(
            CASE
              WHEN diferencia > 0
                THEN 1
              ELSE 0
            END
          )
            AS sobrantes,

          COALESCE(
            SUM(
              ABS(diferencia)
            ),
            0
          )
            AS diferencia_absoluta_total,

          CASE

            WHEN COUNT(*) > 0

            THEN ROUND(
              100.0
              *
              SUM(
                CASE
                  WHEN diferencia = 0
                    THEN 1
                  ELSE 0
                END
              )
              /
              COUNT(*),
              2
            )

            ELSE 0

          END
            AS porcentaje_conciliacion_correcta

        FROM mineblast.gold.vw_conciliacion_inventario

        ${where}
      `);


    /*
     * IMPORTANTE:
     *
     * Se tipa como any para evitar errores TypeScript como:
     *
     * Property 'conciliaciones_con_diferencia'
     * does not exist on type 'object'
     */

    const resumenFila: any =
      Array.isArray(
        resumenResultado
      ) &&
      resumenResultado.length > 0
        ? resumenResultado[0]
        : {};


    const resumen = {
      conciliaciones_realizadas:
        numeroSeguro(
          resumenFila
            ?.conciliaciones_realizadas
        ),


      conciliaciones_sin_diferencia:
        numeroSeguro(
          resumenFila
            ?.conciliaciones_sin_diferencia
        ),


      conciliaciones_con_diferencia:
        numeroSeguro(
          resumenFila
            ?.conciliaciones_con_diferencia
        ),


      faltantes:
        numeroSeguro(
          resumenFila
            ?.faltantes
        ),


      sobrantes:
        numeroSeguro(
          resumenFila
            ?.sobrantes
        ),


      diferencia_absoluta_total:
        numeroSeguro(
          resumenFila
            ?.diferencia_absoluta_total
        ),


      porcentaje_conciliacion_correcta:
        numeroSeguro(
          resumenFila
            ?.porcentaje_conciliacion_correcta
        ),
    };


    /*
     * =====================================================
     * 2. EVOLUCION MENSUAL
     * =====================================================
     */

    const filtrosMensuales: string[] = [];


    if (anio !== null) {
      filtrosMensuales.push(
        `anio = ${anio}`
      );
    }


    if (mes !== null) {
      filtrosMensuales.push(
        `numero_mes = ${mes}`
      );
    }


    const whereMensual =
      filtrosMensuales.length > 0
        ? `WHERE ${filtrosMensuales.join(
            " AND "
          )}`
        : "";


    const mensualResultado =
      await queryDatabricks(`
        SELECT

          anio,

          numero_mes,

          mes,

          conciliaciones_realizadas,

          conciliaciones_sin_diferencia,

          conciliaciones_con_diferencia,

          conciliaciones_con_faltante,

          conciliaciones_con_sobrante,

          diferencia_absoluta_total,

          porcentaje_conciliacion_correcta

        FROM mineblast.gold.vw_kpi_conciliacion_mensual

        ${whereMensual}

        ORDER BY
          anio,
          numero_mes
      `);


    const mensual =
      Array.isArray(
        mensualResultado
      )
        ? mensualResultado.map(
            (fila: any) => ({
              anio:
                numeroSeguro(
                  fila.anio
                ),


              numero_mes:
                numeroSeguro(
                  fila.numero_mes
                ),


              mes:
                fila.mes ?? "",


              conciliaciones_realizadas:
                numeroSeguro(
                  fila
                    .conciliaciones_realizadas
                ),


              conciliaciones_sin_diferencia:
                numeroSeguro(
                  fila
                    .conciliaciones_sin_diferencia
                ),


              conciliaciones_con_diferencia:
                numeroSeguro(
                  fila
                    .conciliaciones_con_diferencia
                ),


              conciliaciones_con_faltante:
                numeroSeguro(
                  fila
                    .conciliaciones_con_faltante
                ),


              conciliaciones_con_sobrante:
                numeroSeguro(
                  fila
                    .conciliaciones_con_sobrante
                ),


              diferencia_absoluta_total:
                numeroSeguro(
                  fila
                    .diferencia_absoluta_total
                ),


              porcentaje_conciliacion_correcta:
                numeroSeguro(
                  fila
                    .porcentaje_conciliacion_correcta
                ),
            })
          )
        : [];


    /*
     * =====================================================
     * 3. ULTIMAS CONCILIACIONES
     * =====================================================
     */

    const ultimasResultado =
      await queryDatabricks(`
        SELECT

          fecha,

          explosivo,

          lote,

          unidad,

          stock_sistema,

          stock_fisico,

          diferencia,

          diferencia_absoluta,

          tipo_diferencia,

          responsable,

          estado,

          ajuste_generado

        FROM mineblast.gold.vw_conciliacion_inventario

        ${where}

        ORDER BY
          fecha DESC

        LIMIT 20
      `);


    const ultimas =
      Array.isArray(
        ultimasResultado
      )
        ? ultimasResultado.map(
            (fila: any) => ({
              fecha:
                fila.fecha ?? null,


              explosivo:
                fila.explosivo ?? "",


              lote:
                fila.lote ?? "",


              unidad:
                fila.unidad ?? "",


              stock_sistema:
                numeroSeguro(
                  fila.stock_sistema
                ),


              stock_fisico:
                numeroSeguro(
                  fila.stock_fisico
                ),


              diferencia:
                numeroSeguro(
                  fila.diferencia
                ),


              diferencia_absoluta:
                numeroSeguro(
                  fila
                    .diferencia_absoluta
                ),


              tipo_diferencia:
                fila.tipo_diferencia ??
                "",


              responsable:
                fila.responsable ??
                "",


              estado:
                fila.estado ?? "",


              ajuste_generado:
                numeroSeguro(
                  fila.ajuste_generado
                ),
            })
          )
        : [];


    /*
     * =====================================================
     * 4. RESPUESTA FINAL
     * =====================================================
     */

    return NextResponse.json({
      filtros: {
        anio,
        mes,
      },


      resumen,


      mensual,


      ultimas,
    });

  } catch (error: any) {
    console.error(
      "Error GET /api/dashboard/conciliacion:",
      error
    );


    return NextResponse.json(
      {
        error:
          "No fue posible cargar los indicadores de conciliación.",

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