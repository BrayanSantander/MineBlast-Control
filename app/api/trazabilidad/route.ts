import { NextRequest, NextResponse } from "next/server";
import { queryDatabricks } from "@/lib/databricks";

function sqlTexto(valor: string) {
  return `'${valor.replace(/'/g, "''")}'`;
}

export async function GET(request: NextRequest) {
  try {
    const numeroVale =
      request.nextUrl.searchParams.get("numero_vale");

    let where = "";

    if (numeroVale) {
      where = `
        WHERE numero_vale = ${sqlTexto(numeroVale)}
      `;
    }

    const rows = await queryDatabricks(`
      SELECT *
      FROM mineblast.gold.vw_trazabilidad_vales
      ${where}
      ORDER BY fecha_vale DESC
    `);

    return NextResponse.json({
      datos: rows,
    });

  } catch (error) {
    console.error(
      "Error consultando trazabilidad:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No fue posible consultar la trazabilidad.",

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