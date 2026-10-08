import { NextRequest, NextResponse } from "next/server";

import { queryDatabricks } from "@/lib/databricks";


function numeroSeguro(valor: unknown) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;
}


function textoSeguro(valor: unknown) {
  if (
    valor === null ||
    valor === undefined
  ) {
    return "";
  }

  return String(valor);
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
        : 2026;


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

    const filtroMesDashboard =
      mes !== null
        ? `AND numero_mes = ${mes}`
        : "";


    const filtroMesConciliacion =
      mes !== null
        ? `AND numero_mes = ${mes}`
        : "";


    /*
     * =====================================================
     * 1. KPI OPERACIONALES
     * =====================================================
     */

    const resumenResultado =
      await queryDatabricks(`
        SELECT

          COALESCE(
            SUM(avance_metros),
            0
          )
            AS metros_avance,

          COALESCE(
            SUM(toneladas),
            0
          )
            AS toneladas,

          COALESCE(
            SUM(disparos),
            0
          )
            AS disparos,

          COALESCE(
            SUM(consumo_total),
            0
          )
            AS consumo_total,

          COALESCE(
            SUM(costo_explosivos),
            0
          )
            AS costo_total_explosivos,

          CASE

            WHEN
              COALESCE(
                SUM(avance_metros),
                0
              ) > 0

            THEN

              COALESCE(
                SUM(costo_explosivos),
                0
              )
              /
              SUM(avance_metros)

            ELSE 0

          END
            AS costo_por_metro,

          CASE

            WHEN
              COALESCE(
                SUM(toneladas),
                0
              ) > 0

            THEN

              COALESCE(
                SUM(costo_explosivos),
                0
              )
              /
              SUM(toneladas)

            ELSE 0

          END
            AS costo_por_tonelada

        FROM mineblast.gold.vw_dashboard_mensual

        WHERE anio = ${anio}

        ${filtroMesDashboard}
      `);


    const resumenFila: any =
      Array.isArray(
        resumenResultado
      ) &&
      resumenResultado.length > 0
        ? resumenResultado[0]
        : {};


    /*
     * =====================================================
     * 2. CONSUMO EQUIVALENTE
     * =====================================================
     */

    const equivalenteResultado =
      await queryDatabricks(`
        SELECT

          COALESCE(
            SUM(
              consumo_equivalente
            ),
            0
          )
            AS consumo_equivalente_total

        FROM mineblast.gold.vw_consumo_equivalente

        WHERE fecha_key IN (

          SELECT fecha_key

          FROM mineblast.gold.dim_fecha

          WHERE anio = ${anio}

          ${
            mes !== null
              ? `AND numero_mes = ${mes}`
              : ""
          }

        )
      `);


    const equivalenteFila: any =
      Array.isArray(
        equivalenteResultado
      ) &&
      equivalenteResultado.length > 0
        ? equivalenteResultado[0]
        : {};


    const metrosAvance =
      numeroSeguro(
        resumenFila
          ?.metros_avance
      );


    const toneladas =
      numeroSeguro(
        resumenFila
          ?.toneladas
      );


    const consumoEquivalenteTotal =
      numeroSeguro(
        equivalenteFila
          ?.consumo_equivalente_total
      );


    const consumoEquivalentePorMetro =
      metrosAvance > 0
        ? consumoEquivalenteTotal /
          metrosAvance
        : 0;


    const consumoEquivalentePorTonelada =
      toneladas > 0
        ? consumoEquivalenteTotal /
          toneladas
        : 0;


    /*
     * =====================================================
     * 3. CONSUMO POR EXPLOSIVO
     * =====================================================
     */

    const consumoResultado =
      await queryDatabricks(`
        SELECT

          explosivo,

          COALESCE(
            SUM(cantidad_total),
            0
          )
            AS cantidad_total

        FROM mineblast.gold.vw_consumo_explosivo_mensual

        WHERE anio = ${anio}

        ${filtroMesDashboard}

        GROUP BY explosivo

        ORDER BY cantidad_total DESC
      `);


    const consumoPorExplosivo =
      Array.isArray(
        consumoResultado
      )
        ? consumoResultado.map(
            (fila: any) => ({
              explosivo:
                textoSeguro(
                  fila.explosivo
                ),

              cantidad_total:
                numeroSeguro(
                  fila.cantidad_total
                ),
            })
          )
        : [];


    /*
     * =====================================================
     * 4. KPI DE CONCILIACION
     * =====================================================
     */

    const conciliacionResultado =
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
            AS conciliaciones_correctas,

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

        WHERE anio = ${anio}

        ${filtroMesConciliacion}
      `);


    const conciliacionFila: any =
      Array.isArray(
        conciliacionResultado
      ) &&
      conciliacionResultado.length > 0
        ? conciliacionResultado[0]
        : {};


    /*
     * =====================================================
     * 5. DETALLE DE CONCILIACIONES
     * =====================================================
     */

    const detalleConciliacionResultado =
      await queryDatabricks(`
        SELECT

          fecha,

          explosivo,

          lote,

          unidad,

          stock_sistema,

          stock_fisico,

          diferencia,

          tipo_diferencia,

          estado,

          responsable

        FROM mineblast.gold.vw_conciliacion_inventario

        WHERE anio = ${anio}

        ${filtroMesConciliacion}

        ORDER BY fecha DESC
      `);


    const detalleConciliaciones =
      Array.isArray(
        detalleConciliacionResultado
      )
        ? detalleConciliacionResultado.map(
            (fila: any) => ({
              fecha:
                fila.fecha ?? null,

              explosivo:
                textoSeguro(
                  fila.explosivo
                ),

              lote:
                textoSeguro(
                  fila.lote
                ),

              unidad:
                textoSeguro(
                  fila.unidad
                ),

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

              tipo_diferencia:
                textoSeguro(
                  fila.tipo_diferencia
                ),

              estado:
                textoSeguro(
                  fila.estado
                ),

              responsable:
                textoSeguro(
                  fila.responsable
                ),
            })
          )
        : [];


    /*
     * =====================================================
     * 6. RESPUESTA FINAL
     * =====================================================
     */

    return NextResponse.json({
      metadata: {
        titulo:
          "Reporte Mensual de Gestión de Explosivos",

        sistema:
          "MineBlast Control",

        empresa:
          "Holesteck Ltda.",

        faena:
          "Mina Tránsito",

        anio,

        mes,

        generado_en:
          new Date().toISOString(),

        tipo_datos:
          "PROTOTIPO_VALIDACION",
      },


      kpi: {
        metros_avance:
          metrosAvance,

        toneladas:
          toneladas,

        disparos:
          numeroSeguro(
            resumenFila
              ?.disparos
          ),

        consumo_total:
          numeroSeguro(
            resumenFila
              ?.consumo_total
          ),

        costo_total_explosivos:
          numeroSeguro(
            resumenFila
              ?.costo_total_explosivos
          ),

        costo_por_metro:
          numeroSeguro(
            resumenFila
              ?.costo_por_metro
          ),

        costo_por_tonelada:
          numeroSeguro(
            resumenFila
              ?.costo_por_tonelada
          ),

        consumo_equivalente_total:
          consumoEquivalenteTotal,

        consumo_equivalente_por_metro:
          consumoEquivalentePorMetro,

        consumo_equivalente_por_tonelada:
          consumoEquivalentePorTonelada,
      },


      conciliacion: {
        conciliaciones_realizadas:
          numeroSeguro(
            conciliacionFila
              ?.conciliaciones_realizadas
          ),

        conciliaciones_correctas:
          numeroSeguro(
            conciliacionFila
              ?.conciliaciones_correctas
          ),

        conciliaciones_con_diferencia:
          numeroSeguro(
            conciliacionFila
              ?.conciliaciones_con_diferencia
          ),

        faltantes:
          numeroSeguro(
            conciliacionFila
              ?.faltantes
          ),

        sobrantes:
          numeroSeguro(
            conciliacionFila
              ?.sobrantes
          ),

        diferencia_absoluta_total:
          numeroSeguro(
            conciliacionFila
              ?.diferencia_absoluta_total
          ),

        porcentaje_conciliacion_correcta:
          numeroSeguro(
            conciliacionFila
              ?.porcentaje_conciliacion_correcta
          ),
      },


      consumo_por_explosivo:
        consumoPorExplosivo,


      detalle_conciliaciones:
        detalleConciliaciones,


      observaciones: [
        "Los costos unitarios utilizados corresponden a valores sintéticos definidos para validación del prototipo.",
        "Los factores de equivalencia corresponden a valores de validación analítica del prototipo.",
        "Los registros históricos sintéticos deben diferenciarse de los registros operacionales generados por MineBlast Control.",
      ],
    });

  } catch (error: any) {
    console.error(
      "Error GET /api/reportes/mensual:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible generar el reporte mensual.",

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