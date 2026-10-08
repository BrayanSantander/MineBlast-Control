import {
  NextRequest,
  NextResponse,
} from "next/server";


export async function GET(
  request: NextRequest
) {
  try {
    const cookie =
      request.cookies.get(
        "mineblast_session"
      );


    if (!cookie?.value) {
      return NextResponse.json(
        {
          autenticado: false,
          usuario: null,
        }
      );
    }


    const usuario =
      JSON.parse(
        decodeURIComponent(
          cookie.value
        )
      );


    return NextResponse.json({
      autenticado: true,
      usuario,
    });

  } catch (error) {
    console.error(
      "Error leyendo sesión:",
      error
    );


    return NextResponse.json({
      autenticado: false,
      usuario: null,
    });
  }
}