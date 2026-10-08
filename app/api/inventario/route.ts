import { NextResponse } from "next/server";
import db from "@/lib/database";

export async function GET() {
  try {
    const inventario = db
      .prepare(`
        SELECT
          id,
          explosivo,
          lote,
          unidad,
          stock_actual,
          actualizado_en
        FROM inventario
        ORDER BY explosivo, lote
      `)
      .all();

    return NextResponse.json({
      datos: inventario,
    });
  } catch (error) {
    console.error("Error GET /api/inventario:", error);

    return NextResponse.json(
      {
        error: "No fue posible obtener el inventario.",
      },
      {
        status: 500,
      }
    );
  }
}