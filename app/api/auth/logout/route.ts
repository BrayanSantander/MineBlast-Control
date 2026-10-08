import { NextResponse } from "next/server";


export async function POST() {
  try {
    const response =
      NextResponse.json({
        mensaje:
          "Sesión finalizada correctamente.",
      });


    response.cookies.set({
      name: "mineblast_session",
      value: "",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      expires: new Date(0),
      maxAge: 0,
    });


    return response;

  } catch (error: any) {
    console.error(
      "Error cerrando sesión:",
      error
    );


    return NextResponse.json(
      {
        error:
          "No fue posible cerrar la sesión.",

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