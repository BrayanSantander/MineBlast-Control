import { NextRequest, NextResponse } from "next/server";

import {
  buscarUsuario,
  obtenerPermisos,
} from "@/lib/usuarios";


export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();


    const usuario =
      String(
        body.usuario ?? ""
      ).trim();


    const password =
      String(
        body.password ?? ""
      );


    if (
      !usuario ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Debe ingresar usuario y contraseña.",
        },
        {
          status: 400,
        }
      );
    }


    const encontrado =
      buscarUsuario(
        usuario,
        password
      );


    if (!encontrado) {
      return NextResponse.json(
        {
          error:
            "Usuario o contraseña incorrectos.",
        },
        {
          status: 401,
        }
      );
    }


    const permisos =
      obtenerPermisos(
        encontrado.rol
      );


    const sesion = {
      id:
        encontrado.id,

      nombre:
        encontrado.nombre,

      usuario:
        encontrado.usuario,

      rol:
        encontrado.rol,

      cargo:
        encontrado.cargo,

      permisos,
    };


    const response =
      NextResponse.json({
        mensaje:
          "Inicio de sesión correcto.",

        usuario:
          sesion,
      });


    /*
     * Cookie de sesión del prototipo.
     *
     * Importante:
     * esta solución sirve para validar
     * arquitectura y roles.
     *
     * Para producción debe reemplazarse
     * por autenticación segura real.
     */

    response.cookies.set(
      "mineblast_session",
      encodeURIComponent(
        JSON.stringify(
          sesion
        )
      ),
      {
        httpOnly: true,

        sameSite: "lax",

        secure:
          process.env.NODE_ENV ===
          "production",

        path: "/",

        maxAge:
          60 * 60 * 8,
      }
    );


    return response;

  } catch (error: any) {
    console.error(
      "Error POST /api/auth/login:",
      error
    );


    return NextResponse.json(
      {
        error:
          "No fue posible iniciar sesión.",

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