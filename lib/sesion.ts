export type UsuarioSesion = {
  id: string;
  nombre: string;
  usuario: string;
  rol: string;
  cargo: string;
  permisos: string[];
};


export async function obtenerSesionCliente(): Promise<{
  autenticado: boolean;
  usuario: UsuarioSesion | null;
}> {
  try {
    const response =
      await fetch(
        "/api/auth/session",
        {
          cache: "no-store",
        }
      );

    if (!response.ok) {
      return {
        autenticado: false,
        usuario: null,
      };
    }

    const json =
      await response.json();

    return {
      autenticado:
        Boolean(
          json.autenticado
        ),

      usuario:
        json.usuario ?? null,
    };

  } catch (error) {
    console.error(
      "Error obteniendo sesión:",
      error
    );

    return {
      autenticado: false,
      usuario: null,
    };
  }
}


export function tienePermiso(
  permisos: string[],
  permiso: string
) {
  return permisos.includes(
    permiso
  );
}