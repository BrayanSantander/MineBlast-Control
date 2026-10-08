import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";

export async function GET(request: NextRequest) {
  try {
    const anioParam = request.nextUrl.searchParams.get("anio") ?? "2026";
    const anio = Number(anioParam);

    if (!Number.isInteger(anio) || anio < 2022 || anio > 2026) {
      return NextResponse.json(
        { error: "Año no válido" },
        { status: 400 }
      );
    }

    const rows = await queryDatabricks(`
      SELECT *
      FROM mineblast.gold.vw_dashboard_kpi_anual
      WHERE anio = ${anio}
    `);

    return NextResponse.json({
      anio,
      datos: rows,
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "No fue posible consultar Databricks",
        detalle: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}