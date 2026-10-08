import { queryDatabricks } from "@/lib/databricks";

export async function procesarDataWarehouse() {
  try {
    /*
     * =====================================================
     * 1. BRONZE -> SILVER VALES
     * =====================================================
     */

    await queryDatabricks(`
      MERGE INTO mineblast.silver.vales_mineblast AS destino

      USING (
        SELECT
          registro_uuid,
          numero_vale,
          fecha_vale,
          fecha_disparo,
          UPPER(TRIM(turno)) AS turno,
          UPPER(TRIM(sector)) AS sector,
          UPPER(TRIM(labor)) AS labor,
          TRIM(nivel) AS nivel,
          UPPER(TRIM(tipo)) AS tipo,
          UPPER(TRIM(tipo_diagrama)) AS tipo_diagrama,
          TRIM(supervisor) AS supervisor,
          UPPER(TRIM(estado)) AS estado,
          fuente_origen,
          creado_en,
          actualizado_en,
          fecha_ingesta

        FROM mineblast.bronze.vales_mineblast

        WHERE registro_uuid IS NOT NULL
      ) AS origen

      ON destino.registro_uuid =
         origen.registro_uuid

      WHEN MATCHED THEN
        UPDATE SET *

      WHEN NOT MATCHED THEN
        INSERT *
    `);


    /*
     * =====================================================
     * 2. BRONZE -> SILVER DETALLE VALES
     * =====================================================
     */

    await queryDatabricks(`
      MERGE INTO mineblast.silver.vale_detalle_mineblast AS destino

      USING (
        SELECT
          registro_uuid,
          vale_uuid,

          UPPER(TRIM(explosivo))
            AS explosivo,

          CAST(cantidad AS DOUBLE)
            AS cantidad,

          UPPER(TRIM(unidad))
            AS unidad,

          UPPER(TRIM(lote))
            AS lote,

          creado_en,
          fecha_ingesta

        FROM mineblast.bronze.vale_detalle_mineblast

        WHERE registro_uuid IS NOT NULL
          AND cantidad IS NOT NULL
          AND cantidad > 0
      ) AS origen

      ON destino.registro_uuid =
         origen.registro_uuid

      WHEN MATCHED THEN
        UPDATE SET *

      WHEN NOT MATCHED THEN
        INSERT *
    `);


    /*
     * =====================================================
     * 3. BRONZE -> SILVER MOVIMIENTOS INVENTARIO
     * =====================================================
     */

    await queryDatabricks(`
      MERGE INTO mineblast.silver.movimientos_inventario_mineblast AS destino

      USING (
        SELECT
          registro_uuid,
          fecha,

          UPPER(TRIM(tipo_movimiento))
            AS tipo_movimiento,

          UPPER(TRIM(explosivo))
            AS explosivo,

          CAST(cantidad AS DOUBLE)
            AS cantidad,

          UPPER(TRIM(unidad))
            AS unidad,

          UPPER(TRIM(lote))
            AS lote,

          vale_id,

          TRIM(observacion)
            AS observacion,

          TRIM(proveedor)
            AS proveedor,

          TRIM(documento_referencia)
            AS documento_referencia,

          TRIM(responsable)
            AS responsable,

          fuente_origen,
          creado_en,
          fecha_ingesta

        FROM mineblast.bronze.movimientos_inventario_mineblast

        WHERE registro_uuid IS NOT NULL
          AND cantidad IS NOT NULL
          AND cantidad > 0
      ) AS origen

      ON destino.registro_uuid =
         origen.registro_uuid

      WHEN MATCHED THEN
        UPDATE SET *

      WHEN NOT MATCHED THEN
        INSERT *
    `);


    /*
     * =====================================================
     * 4. BRONZE -> SILVER CONCILIACIONES
     * =====================================================
     */

    await queryDatabricks(`
      MERGE INTO mineblast.silver.conciliaciones_inventario AS destino

      USING (
        SELECT
          registro_uuid,

          fecha,

          UPPER(TRIM(explosivo))
            AS explosivo,

          UPPER(TRIM(lote))
            AS lote,

          UPPER(TRIM(unidad))
            AS unidad,

          CAST(stock_sistema AS DOUBLE)
            AS stock_sistema,

          CAST(stock_fisico AS DOUBLE)
            AS stock_fisico,

          CAST(diferencia AS DOUBLE)
            AS diferencia,

          TRIM(responsable)
            AS responsable,

          TRIM(observacion)
            AS observacion,

          UPPER(TRIM(estado))
            AS estado,

          CAST(ajuste_generado AS INT)
            AS ajuste_generado,

          fuente_origen,
          creado_en,
          fecha_ingesta

        FROM mineblast.bronze.conciliaciones_inventario

        WHERE registro_uuid IS NOT NULL
          AND fecha IS NOT NULL
          AND explosivo IS NOT NULL
          AND lote IS NOT NULL
          AND stock_sistema IS NOT NULL
          AND stock_fisico IS NOT NULL
          AND diferencia IS NOT NULL
      ) AS origen

      ON destino.registro_uuid =
         origen.registro_uuid

      WHEN MATCHED THEN
        UPDATE SET *

      WHEN NOT MATCHED THEN
        INSERT *
    `);


    /*
     * =====================================================
     * 5. DIMENSION SECTOR
     * =====================================================
     */

    await queryDatabricks(`
      INSERT INTO mineblast.gold.dim_sector

      SELECT
        (
          SELECT COALESCE(
            MAX(sector_key),
            0
          )
          FROM mineblast.gold.dim_sector
        )
        +
        ROW_NUMBER() OVER (
          ORDER BY nuevos.sector
        ) AS sector_key,

        nuevos.sector

      FROM (
        SELECT DISTINCT sector

        FROM mineblast.silver.vales_mineblast

        WHERE sector IS NOT NULL
          AND TRIM(sector) <> ''
      ) nuevos

      LEFT JOIN mineblast.gold.dim_sector existente
        ON UPPER(TRIM(existente.sector))
         = UPPER(TRIM(nuevos.sector))

      WHERE existente.sector_key IS NULL
    `);


    /*
     * =====================================================
     * 6. DIMENSION TURNO
     * =====================================================
     */

    await queryDatabricks(`
      INSERT INTO mineblast.gold.dim_turno

      SELECT
        (
          SELECT COALESCE(
            MAX(turno_key),
            0
          )
          FROM mineblast.gold.dim_turno
        )
        +
        ROW_NUMBER() OVER (
          ORDER BY nuevos.turno
        ) AS turno_key,

        nuevos.turno

      FROM (
        SELECT DISTINCT turno

        FROM mineblast.silver.vales_mineblast

        WHERE turno IS NOT NULL
          AND TRIM(turno) <> ''
      ) nuevos

      LEFT JOIN mineblast.gold.dim_turno existente
        ON UPPER(TRIM(existente.turno))
         = UPPER(TRIM(nuevos.turno))

      WHERE existente.turno_key IS NULL
    `);


    /*
     * =====================================================
     * 7. DIMENSION EXPLOSIVO
     *    VALES + MOVIMIENTOS + CONCILIACIONES
     * =====================================================
     */

    await queryDatabricks(`
      INSERT INTO mineblast.gold.dim_explosivo

      SELECT
        (
          SELECT COALESCE(
            MAX(explosivo_key),
            0
          )
          FROM mineblast.gold.dim_explosivo
        )
        +
        ROW_NUMBER() OVER (
          ORDER BY nuevos.explosivo
        ) AS explosivo_key,

        nuevos.explosivo

      FROM (
        SELECT DISTINCT explosivo

        FROM mineblast.silver.vale_detalle_mineblast

        WHERE explosivo IS NOT NULL
          AND TRIM(explosivo) <> ''


        UNION


        SELECT DISTINCT explosivo

        FROM mineblast.silver.movimientos_inventario_mineblast

        WHERE explosivo IS NOT NULL
          AND TRIM(explosivo) <> ''


        UNION


        SELECT DISTINCT explosivo

        FROM mineblast.silver.conciliaciones_inventario

        WHERE explosivo IS NOT NULL
          AND TRIM(explosivo) <> ''
      ) nuevos

      LEFT JOIN mineblast.gold.dim_explosivo existente
        ON UPPER(TRIM(existente.explosivo))
         = UPPER(TRIM(nuevos.explosivo))

      WHERE existente.explosivo_key IS NULL
    `);


    /*
     * =====================================================
     * 8. DIMENSION LABOR
     * =====================================================
     */

    await queryDatabricks(`
      INSERT INTO mineblast.gold.dim_labor

      SELECT
        (
          SELECT COALESCE(
            MAX(labor_key),
            0
          )
          FROM mineblast.gold.dim_labor
        )
        +
        ROW_NUMBER() OVER (
          ORDER BY
            nuevos.sector,
            nuevos.labor,
            nuevos.nivel
        ) AS labor_key,

        nuevos.sector,
        nuevos.labor,
        nuevos.nivel

      FROM (
        SELECT DISTINCT
          sector,
          labor,
          nivel

        FROM mineblast.silver.vales_mineblast

        WHERE labor IS NOT NULL
          AND TRIM(labor) <> ''
      ) nuevos

      LEFT JOIN mineblast.gold.dim_labor existente
        ON UPPER(
             TRIM(
               COALESCE(
                 existente.sector,
                 ''
               )
             )
           )
         =
           UPPER(
             TRIM(
               COALESCE(
                 nuevos.sector,
                 ''
               )
             )
           )

       AND UPPER(TRIM(existente.labor))
         =
           UPPER(TRIM(nuevos.labor))

       AND UPPER(
             TRIM(
               COALESCE(
                 existente.nivel,
                 ''
               )
             )
           )
         =
           UPPER(
             TRIM(
               COALESCE(
                 nuevos.nivel,
                 ''
               )
             )
           )

      WHERE existente.labor_key IS NULL
    `);


    /*
     * =====================================================
     * 9. DIMENSION FECHA
     *    VALES + MOVIMIENTOS + CONCILIACIONES
     * =====================================================
     */

    await queryDatabricks(`
      INSERT INTO mineblast.gold.dim_fecha

      SELECT
        CAST(
          date_format(
            nuevas.fecha,
            'yyyyMMdd'
          )
          AS INT
        ) AS fecha_key,

        nuevas.fecha,

        YEAR(nuevas.fecha)
          AS anio,

        QUARTER(nuevas.fecha)
          AS trimestre,

        MONTH(nuevas.fecha)
          AS numero_mes,

        date_format(
          nuevas.fecha,
          'MMMM'
        ) AS mes,

        DAY(nuevas.fecha)
          AS dia,

        WEEKOFYEAR(nuevas.fecha)
          AS semana,

        dayofweek(nuevas.fecha)
          AS dia_semana_numero,

        date_format(
          nuevas.fecha,
          'EEEE'
        ) AS dia_semana

      FROM (
        SELECT DISTINCT
          fecha_vale AS fecha

        FROM mineblast.silver.vales_mineblast

        WHERE fecha_vale IS NOT NULL


        UNION


        SELECT DISTINCT
          fecha

        FROM mineblast.silver.movimientos_inventario_mineblast

        WHERE fecha IS NOT NULL


        UNION


        SELECT DISTINCT
          fecha

        FROM mineblast.silver.conciliaciones_inventario

        WHERE fecha IS NOT NULL
      ) nuevas

      LEFT JOIN mineblast.gold.dim_fecha existente
        ON existente.fecha =
           nuevas.fecha

      WHERE existente.fecha_key IS NULL
    `);


    /*
     * =====================================================
     * 10. SILVER VALES -> FACT CONSUMO
     * =====================================================
     */

    await queryDatabricks(`
      INSERT INTO mineblast.gold.fact_consumo_explosivos

      SELECT
        (
          SELECT COALESCE(
            MAX(consumo_key),
            0
          )
          FROM mineblast.gold.fact_consumo_explosivos
        )
        +
        ROW_NUMBER() OVER (
          ORDER BY d.registro_uuid
        ) AS consumo_key,

        d.registro_uuid
          AS vale_id,

        v.numero_vale,

        CAST(NULL AS STRING)
          AS disparo_id,

        df.fecha_key,

        dl.labor_key,

        dt.turno_key,

        ds.sector_key,

        de.explosivo_key,

        v.tipo,

        v.tipo_diagrama,

        v.supervisor
          AS firma_supervisor,

        d.cantidad,

        'OPERACIONAL_MINEBLAST'
          AS tipo_dato

      FROM mineblast.silver.vale_detalle_mineblast d

      INNER JOIN mineblast.silver.vales_mineblast v
        ON d.vale_uuid =
           v.registro_uuid

      LEFT JOIN mineblast.gold.dim_fecha df
        ON df.fecha =
           v.fecha_vale

      LEFT JOIN mineblast.gold.dim_labor dl
        ON UPPER(TRIM(dl.labor))
         =
           UPPER(TRIM(v.labor))

       AND UPPER(
             TRIM(
               COALESCE(
                 dl.sector,
                 ''
               )
             )
           )
         =
           UPPER(
             TRIM(
               COALESCE(
                 v.sector,
                 ''
               )
             )
           )

       AND UPPER(
             TRIM(
               COALESCE(
                 dl.nivel,
                 ''
               )
             )
           )
         =
           UPPER(
             TRIM(
               COALESCE(
                 v.nivel,
                 ''
               )
             )
           )

      LEFT JOIN mineblast.gold.dim_turno dt
        ON UPPER(TRIM(dt.turno))
         =
           UPPER(TRIM(v.turno))

      LEFT JOIN mineblast.gold.dim_sector ds
        ON UPPER(TRIM(ds.sector))
         =
           UPPER(TRIM(v.sector))

      LEFT JOIN mineblast.gold.dim_explosivo de
        ON UPPER(TRIM(de.explosivo))
         =
           UPPER(TRIM(d.explosivo))

      LEFT JOIN mineblast.gold.fact_consumo_explosivos existente
        ON existente.vale_id =
           d.registro_uuid

      WHERE existente.consumo_key IS NULL
    `);


    /*
     * =====================================================
     * 11. SILVER MOVIMIENTOS -> GOLD
     * =====================================================
     */

    await queryDatabricks(`
      INSERT INTO mineblast.gold.fact_movimientos_inventario

      SELECT
        (
          SELECT COALESCE(
            MAX(movimiento_key),
            0
          )
          FROM mineblast.gold.fact_movimientos_inventario
        )
        +
        ROW_NUMBER() OVER (
          ORDER BY m.registro_uuid
        ) AS movimiento_key,

        m.registro_uuid,

        df.fecha_key,

        de.explosivo_key,

        m.tipo_movimiento,

        m.cantidad,

        m.unidad,

        m.lote,

        m.vale_id,

        m.proveedor,

        m.documento_referencia,

        m.responsable,

        m.observacion,

        m.fuente_origen,

        'OPERACIONAL_MINEBLAST'
          AS tipo_dato

      FROM mineblast.silver.movimientos_inventario_mineblast m

      LEFT JOIN mineblast.gold.dim_fecha df
        ON df.fecha =
           m.fecha

      LEFT JOIN mineblast.gold.dim_explosivo de
        ON UPPER(TRIM(de.explosivo))
         =
           UPPER(TRIM(m.explosivo))

      LEFT JOIN mineblast.gold.fact_movimientos_inventario existente
        ON existente.registro_uuid =
           m.registro_uuid

      WHERE existente.movimiento_key IS NULL
    `);


    /*
     * =====================================================
     * 12. SILVER CONCILIACIONES -> GOLD
     *
     * Usamos MERGE porque una conciliación puede pasar:
     *
     * DIFERENCIA -> AJUSTADA
     *
     * y Gold debe reflejar ese cambio.
     * =====================================================
     */

    await queryDatabricks(`
      MERGE INTO
        mineblast.gold.fact_conciliaciones_inventario
        AS destino

      USING (
        SELECT
          (
            SELECT COALESCE(
              MAX(conciliacion_key),
              0
            )
            FROM mineblast.gold.fact_conciliaciones_inventario
          )
          +
          ROW_NUMBER() OVER (
            ORDER BY c.registro_uuid
          ) AS nueva_conciliacion_key,

          c.registro_uuid,

          df.fecha_key,

          de.explosivo_key,

          c.lote,

          c.unidad,

          c.stock_sistema,

          c.stock_fisico,

          c.diferencia,

          c.responsable,

          c.observacion,

          c.estado,

          c.ajuste_generado,

          c.fuente_origen,

          'OPERACIONAL_MINEBLAST'
            AS tipo_dato

        FROM mineblast.silver.conciliaciones_inventario c

        LEFT JOIN mineblast.gold.dim_fecha df
          ON df.fecha =
             c.fecha

        LEFT JOIN mineblast.gold.dim_explosivo de
          ON UPPER(TRIM(de.explosivo))
           =
             UPPER(TRIM(c.explosivo))
      ) AS origen

      ON destino.registro_uuid =
         origen.registro_uuid


      WHEN MATCHED THEN

        UPDATE SET
          destino.fecha_key =
            origen.fecha_key,

          destino.explosivo_key =
            origen.explosivo_key,

          destino.lote =
            origen.lote,

          destino.unidad =
            origen.unidad,

          destino.stock_sistema =
            origen.stock_sistema,

          destino.stock_fisico =
            origen.stock_fisico,

          destino.diferencia =
            origen.diferencia,

          destino.responsable =
            origen.responsable,

          destino.observacion =
            origen.observacion,

          destino.estado =
            origen.estado,

          destino.ajuste_generado =
            origen.ajuste_generado,

          destino.fuente_origen =
            origen.fuente_origen,

          destino.tipo_dato =
            origen.tipo_dato


      WHEN NOT MATCHED THEN

        INSERT (
          conciliacion_key,
          registro_uuid,
          fecha_key,
          explosivo_key,
          lote,
          unidad,
          stock_sistema,
          stock_fisico,
          diferencia,
          responsable,
          observacion,
          estado,
          ajuste_generado,
          fuente_origen,
          tipo_dato
        )

        VALUES (
          origen.nueva_conciliacion_key,
          origen.registro_uuid,
          origen.fecha_key,
          origen.explosivo_key,
          origen.lote,
          origen.unidad,
          origen.stock_sistema,
          origen.stock_fisico,
          origen.diferencia,
          origen.responsable,
          origen.observacion,
          origen.estado,
          origen.ajuste_generado,
          origen.fuente_origen,
          origen.tipo_dato
        )
    `);


    /*
     * =====================================================
     * 13. VISTA ANALITICA CONCILIACION
     * =====================================================
     */

    await queryDatabricks(`
      CREATE OR REPLACE VIEW
        mineblast.gold.vw_conciliacion_inventario
      AS

      SELECT
        c.conciliacion_key,

        c.registro_uuid,

        f.fecha,

        f.anio,

        f.numero_mes,

        f.mes,

        e.explosivo,

        c.lote,

        c.unidad,

        c.stock_sistema,

        c.stock_fisico,

        c.diferencia,

        ABS(c.diferencia)
          AS diferencia_absoluta,

        CASE
          WHEN c.diferencia = 0
            THEN 'SIN_DIFERENCIA'

          WHEN c.diferencia > 0
            THEN 'SOBRANTE'

          ELSE 'FALTANTE'
        END AS tipo_diferencia,

        c.responsable,

        c.observacion,

        c.estado,

        c.ajuste_generado,

        c.tipo_dato

      FROM mineblast.gold.fact_conciliaciones_inventario c

      LEFT JOIN mineblast.gold.dim_fecha f
        ON c.fecha_key =
           f.fecha_key

      LEFT JOIN mineblast.gold.dim_explosivo e
        ON c.explosivo_key =
           e.explosivo_key
    `);


    /*
     * =====================================================
     * 14. KPI MENSUAL CONCILIACION
     * =====================================================
     */

    await queryDatabricks(`
      CREATE OR REPLACE VIEW
        mineblast.gold.vw_kpi_conciliacion_mensual
      AS

      SELECT
        f.anio,

        f.numero_mes,

        f.mes,

        COUNT(*)
          AS conciliaciones_realizadas,

        SUM(
          CASE
            WHEN c.diferencia = 0
              THEN 1
            ELSE 0
          END
        )
          AS conciliaciones_sin_diferencia,

        SUM(
          CASE
            WHEN c.diferencia <> 0
              THEN 1
            ELSE 0
          END
        )
          AS conciliaciones_con_diferencia,

        SUM(
          CASE
            WHEN c.diferencia < 0
              THEN 1
            ELSE 0
          END
        )
          AS conciliaciones_con_faltante,

        SUM(
          CASE
            WHEN c.diferencia > 0
              THEN 1
            ELSE 0
          END
        )
          AS conciliaciones_con_sobrante,

        SUM(
          ABS(c.diferencia)
        )
          AS diferencia_absoluta_total,

        ROUND(
          100.0
          *
          SUM(
            CASE
              WHEN c.diferencia = 0
                THEN 1
              ELSE 0
            END
          )
          /
          NULLIF(
            COUNT(*),
            0
          ),
          2
        )
          AS porcentaje_conciliacion_correcta

      FROM mineblast.gold.fact_conciliaciones_inventario c

      INNER JOIN mineblast.gold.dim_fecha f
        ON c.fecha_key =
           f.fecha_key

      GROUP BY
        f.anio,
        f.numero_mes,
        f.mes
    `);


    return {
      estado: "OK",

      mensaje:
        "Data Warehouse actualizado correctamente.",
    };
  } catch (error) {
    console.error(
      "Error procesando Data Warehouse:",
      error
    );

    throw error;
  }
}