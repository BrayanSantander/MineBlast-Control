import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";

export async function GET(request: NextRequest) {
  try {
    const anio = Number(
      request.nextUrl.searchParams.get("anio") ?? "2026"
    );

    if (!Number.isInteger(anio) || anio < 2022 || anio > 2026) {
      return NextResponse.json(
        { error: "Año no válido" },
        { status: 400 }
      );
    }

    const rows = await queryDatabricks(`
      SELECT
        explosivo,
        cantidad_total
      FROM mineblast.gold.vw_consumo_por_explosivo
      WHERE anio = ${anio}
      ORDER BY cantidad_total DESC
    `);

    return NextResponse.json({ datos: rows });

  } catch (error) {
    return NextResponse.json(
      {
        error: "No fue posible obtener consumo por explosivo",
        detalle:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}