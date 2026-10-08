import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";

function sqlTexto(valor: string) {
  return `'${valor.replace(/'/g, "''")}'`;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const anio = Number(params.get("anio") ?? "2026");
    const mesParam = params.get("mes");
    const sector = params.get("sector");
    const labor = params.get("labor");
    const turno = params.get("turno");

    if (!Number.isInteger(anio) || anio < 2022 || anio > 2100) {
      return NextResponse.json(
        { error: "Año no válido." },
        { status: 400 }
      );
    }

    const mes =
      mesParam && mesParam !== "todos"
        ? Number(mesParam)
        : null;

    if (
      mes !== null &&
      (!Number.isInteger(mes) || mes < 1 || mes > 12)
    ) {
      return NextResponse.json(
        { error: "Mes no válido." },
        { status: 400 }
      );
    }

    const filtroFecha = [
      `df.anio = ${anio}`,
      mes !== null ? `df.numero_mes = ${mes}` : null,
    ]
      .filter(Boolean)
      .join(" AND ");

    const filtroSector = sector
      ? `AND UPPER(TRIM(ds.sector)) = UPPER(TRIM(${sqlTexto(
          sector
        )}))`
      : "";

    const filtroLabor = labor
      ? `AND UPPER(TRIM(dl.labor)) = UPPER(TRIM(${sqlTexto(
          labor
        )}))`
      : "";

    const filtroTurno = turno
      ? `AND UPPER(TRIM(dt.turno)) = UPPER(TRIM(${sqlTexto(
          turno
        )}))`
      : "";

    const resumen = await queryDatabricks(`
      WITH avance AS (
        SELECT
          COALESCE(SUM(fd.avance_topografico), 0) AS metros_avance,
          COALESCE(SUM(fd.cantidad_disparos), 0) AS disparos

        FROM mineblast.gold.fact_disparo fd

        JOIN mineblast.gold.dim_fecha df
          ON fd.fecha_key = df.fecha_key

        LEFT JOIN mineblast.gold.dim_sector ds
          ON fd.sector_key = ds.sector_key

        LEFT JOIN mineblast.gold.dim_labor dl
          ON fd.labor_key = dl.labor_key

        LEFT JOIN mineblast.gold.dim_turno dt
          ON fd.turno_key = dt.turno_key

        WHERE ${filtroFecha}
        ${filtroSector}
        ${filtroLabor}
        ${filtroTurno}
      ),

      produccion AS (
        SELECT
          COALESCE(SUM(fp.toneladas), 0) AS toneladas,
          COALESCE(SUM(fp.viajes), 0) AS viajes

        FROM mineblast.gold.fact_produccion fp

        JOIN mineblast.gold.dim_fecha df
          ON fp.fecha_key = df.fecha_key

        LEFT JOIN mineblast.gold.dim_sector ds
          ON fp.sector_key = ds.sector_key

        LEFT JOIN mineblast.gold.dim_labor dl
          ON fp.labor_key = dl.labor_key

        LEFT JOIN mineblast.gold.dim_turno dt
          ON fp.turno_key = dt.turno_key

        WHERE ${filtroFecha}
        ${filtroSector}
        ${filtroLabor}
        ${filtroTurno}
      ),

      consumo AS (
        SELECT
          COALESCE(SUM(fc.cantidad), 0) AS consumo_total,
          COUNT(*) AS registros_consumo

        FROM mineblast.gold.fact_consumo_explosivos fc

        JOIN mineblast.gold.dim_fecha df
          ON fc.fecha_key = df.fecha_key

        LEFT JOIN mineblast.gold.dim_sector ds
          ON fc.sector_key = ds.sector_key

        LEFT JOIN mineblast.gold.dim_labor dl
          ON fc.labor_key = dl.labor_key

        LEFT JOIN mineblast.gold.dim_turno dt
          ON fc.turno_key = dt.turno_key

        WHERE ${filtroFecha}
        ${filtroSector}
        ${filtroLabor}
        ${filtroTurno}
      )

      SELECT
        ${anio} AS anio,
        ${mes === null ? "NULL" : mes} AS numero_mes,

        avance.metros_avance,
        avance.disparos,

        produccion.toneladas,
        produccion.viajes,

        consumo.consumo_total,
        consumo.registros_consumo

      FROM avance
      CROSS JOIN produccion
      CROSS JOIN consumo
    `);

    const economico = await queryDatabricks(`
      SELECT
        ROUND(
          COALESCE(SUM(vc.costo_total_simulado), 0),
          0
        ) AS costo_total_explosivos

      FROM mineblast.gold.vw_consumo_costeado vc

      JOIN mineblast.gold.dim_fecha df
        ON vc.fecha_key = df.fecha_key

      LEFT JOIN mineblast.gold.dim_sector ds
        ON vc.sector_key = ds.sector_key

      LEFT JOIN mineblast.gold.dim_labor dl
        ON vc.labor_key = dl.labor_key

      LEFT JOIN mineblast.gold.dim_turno dt
        ON vc.turno_key = dt.turno_key

      WHERE ${filtroFecha}
      ${filtroSector}
      ${filtroLabor}
      ${filtroTurno}
    `);

    const equivalente = await queryDatabricks(`
      SELECT
        ROUND(
          COALESCE(SUM(ve.consumo_equivalente), 0),
          4
        ) AS consumo_equivalente_total

      FROM mineblast.gold.vw_consumo_equivalente ve

      JOIN mineblast.gold.dim_fecha df
        ON ve.fecha_key = df.fecha_key

      LEFT JOIN mineblast.gold.dim_sector ds
        ON ve.sector_key = ds.sector_key

      LEFT JOIN mineblast.gold.dim_labor dl
        ON ve.labor_key = dl.labor_key

      LEFT JOIN mineblast.gold.dim_turno dt
        ON ve.turno_key = dt.turno_key

      WHERE ${filtroFecha}
      ${filtroSector}
      ${filtroLabor}
      ${filtroTurno}
    `);

    const explosivos = await queryDatabricks(`
      SELECT
        de.explosivo,
        ROUND(SUM(fc.cantidad), 2) AS cantidad_total

      FROM mineblast.gold.fact_consumo_explosivos fc

      JOIN mineblast.gold.dim_fecha df
        ON fc.fecha_key = df.fecha_key

      LEFT JOIN mineblast.gold.dim_sector ds
        ON fc.sector_key = ds.sector_key

      LEFT JOIN mineblast.gold.dim_labor dl
        ON fc.labor_key = dl.labor_key

      LEFT JOIN mineblast.gold.dim_turno dt
        ON fc.turno_key = dt.turno_key

      JOIN mineblast.gold.dim_explosivo de
        ON fc.explosivo_key = de.explosivo_key

      WHERE ${filtroFecha}
      ${filtroSector}
      ${filtroLabor}
      ${filtroTurno}

      GROUP BY de.explosivo
      ORDER BY cantidad_total DESC
    `);

    const mensual = await queryDatabricks(`
      SELECT
        df.numero_mes,
        df.mes,
        ROUND(SUM(fd.avance_topografico), 2) AS avance_metros

      FROM mineblast.gold.fact_disparo fd

      JOIN mineblast.gold.dim_fecha df
        ON fd.fecha_key = df.fecha_key

      LEFT JOIN mineblast.gold.dim_sector ds
        ON fd.sector_key = ds.sector_key

      LEFT JOIN mineblast.gold.dim_labor dl
        ON fd.labor_key = dl.labor_key

      LEFT JOIN mineblast.gold.dim_turno dt
        ON fd.turno_key = dt.turno_key

      WHERE df.anio = ${anio}

      ${
        mes !== null
          ? `AND df.numero_mes = ${mes}`
          : ""
      }

      ${filtroSector}
      ${filtroLabor}
      ${filtroTurno}

      GROUP BY
        df.numero_mes,
        df.mes

      ORDER BY df.numero_mes
    `);

    const resumenBase = (resumen[0] ?? {}) as any;
    const economicoBase = (economico[0] ?? {}) as any;
    const equivalenteBase = (equivalente[0] ?? {}) as any;

    const metros = Number(
      resumenBase.metros_avance ?? 0
    );

    const toneladas = Number(
      resumenBase.toneladas ?? 0
    );

    const costoTotal = Number(
      economicoBase.costo_total_explosivos ?? 0
    );

    const consumoEquivalente = Number(
      equivalenteBase.consumo_equivalente_total ?? 0
    );

    const resumenCompleto = {
      ...resumenBase,

      costo_total_explosivos:
        costoTotal,

      costo_por_metro:
        metros > 0
          ? Math.round(costoTotal / metros)
          : 0,

      costo_por_tonelada:
        toneladas > 0
          ? Math.round(costoTotal / toneladas)
          : 0,

      consumo_equivalente_total:
        consumoEquivalente,

      consumo_equivalente_por_metro:
        metros > 0
          ? consumoEquivalente / metros
          : 0,

      consumo_equivalente_por_tonelada:
        toneladas > 0
          ? consumoEquivalente / toneladas
          : 0,
    };

    return NextResponse.json({
      filtros: {
        anio,
        mes,
        sector,
        labor,
        turno,
      },

      resumen: resumenCompleto,
      mensual,
      explosivos,
    });
  } catch (error) {
    console.error(
      "Error dashboard filtrado:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible obtener el dashboard filtrado.",

        detalle:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}