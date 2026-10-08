import { NextResponse } from "next/server";
import { procesarDataWarehouse } from "@/lib/pipeline-dw";

export async function POST() {
  try {
    const resultado = await procesarDataWarehouse();

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error pipeline DW:", error);

    return NextResponse.json(
      {
        estado: "ERROR",
        error: "No fue posible procesar el Data Warehouse.",
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
