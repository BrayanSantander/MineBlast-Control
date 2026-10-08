import { NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";

export async function GET() {
  try {
    const sectores = await queryDatabricks(`
      SELECT DISTINCT sector
      FROM mineblast.gold.dim_sector
      WHERE sector IS NOT NULL
        AND TRIM(sector) <> ''
      ORDER BY sector
    `);

    const labores = await queryDatabricks(`
      SELECT DISTINCT
        sector,
        labor,
        nivel
      FROM mineblast.gold.dim_labor
      WHERE labor IS NOT NULL
        AND TRIM(labor) <> ''
      ORDER BY sector, labor
    `);

    const turnos = await queryDatabricks(`
      SELECT DISTINCT turno
      FROM mineblast.gold.dim_turno
      WHERE turno IS NOT NULL
        AND TRIM(turno) <> ''
      ORDER BY turno
    `);

    return NextResponse.json({
      sectores,
      labores,
      turnos,
    });
  } catch (error) {
    console.error("Error cargando filtros:", error);

    return NextResponse.json(
      {
        error: "No fue posible cargar los filtros.",
        detalle:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}