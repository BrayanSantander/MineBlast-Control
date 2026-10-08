"use client";

import {
  LogOut,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  obtenerSesionCliente,
  UsuarioSesion,
} from "@/lib/sesion";


export default function UsuarioSesionPanel() {
  const router =
    useRouter();


  const [
    usuario,
    setUsuario,
  ] =
    useState<UsuarioSesion | null>(
      null
    );


  const [
    cargando,
    setCargando,
  ] =
    useState(true);


  const [
    cerrando,
    setCerrando,
  ] =
    useState(false);


  useEffect(() => {
    cargarSesion();
  }, []);


  async function cargarSesion() {
    try {
      setCargando(true);


      const sesion =
        await obtenerSesionCliente();


      if (
        !sesion.autenticado ||
        !sesion.usuario
      ) {
        window.location.href =
          "/login";

        return;
      }


      setUsuario(
        sesion.usuario
      );

    } catch (error) {
      console.error(
        "Error cargando sesión:",
        error
      );


      window.location.href =
        "/login";

    } finally {
      setCargando(false);
    }
  }


  async function cerrarSesion() {
    try {
      setCerrando(true);


      const response =
        await fetch(
          "/api/auth/logout",
          {
            method:
              "POST",

            cache:
              "no-store",
          }
        );


      const json =
        await response.json();


      if (!response.ok) {
        throw new Error(
          json.error ??
            "No fue posible cerrar sesión."
        );
      }


      setUsuario(null);


      /*
       * Usamos navegación completa
       * para asegurarnos de limpiar
       * cualquier estado del dashboard.
       */
      window.location.href =
        "/login";

    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );


      alert(
        error instanceof Error
          ? error.message
          : "No fue posible cerrar sesión."
      );


      setCerrando(false);
    }
  }


  if (cargando) {
    return (
      <div className="text-xs text-slate-500">
        Cargando sesión...
      </div>
    );
  }


  if (!usuario) {
    return null;
  }


  return (
    <div className="flex items-center gap-3">

      <div className="hidden text-right sm:block">

        <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-slate-200">

          <UserCircle2
            size={14}
          />

          {usuario.nombre}

        </div>


        <div className="mt-1 text-[11px] text-slate-500">

          {usuario.cargo}

        </div>

      </div>


      <div className="hidden rounded-full border border-amber-900/40 bg-amber-950/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300 md:flex md:items-center md:gap-1">

        <ShieldCheck
          size={12}
        />

        {usuario.rol}

      </div>


      <button
        type="button"
        onClick={
          cerrarSesion
        }
        disabled={
          cerrando
        }
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 transition hover:border-red-800 hover:bg-red-950/30 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
      >

        <LogOut
          size={14}
        />

        <span className="hidden sm:inline">

          {cerrando
            ? "Cerrando..."
            : "Cerrar sesión"}

        </span>

      </button>

    </div>
  );
}