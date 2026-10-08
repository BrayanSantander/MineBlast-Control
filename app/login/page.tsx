"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";


export default function LoginPage() {
  const router = useRouter();

  const [usuario, setUsuario] =
    useState("supervisor");

  const [password, setPassword] =
    useState("mineblast123");

  const [
    mostrarPassword,
    setMostrarPassword,
  ] =
    useState(false);

  const [cargando, setCargando] =
    useState(false);

  const [error, setError] =
    useState("");


  async function iniciarSesion(
    event: React.FormEvent
  ) {
    event.preventDefault();

    try {
      setCargando(true);
      setError("");


      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              usuario,
              password,
            }),
          }
        );


      const json =
        await response.json();


      if (!response.ok) {
        throw new Error(
          json.error ??
            "No fue posible iniciar sesión."
        );
      }


      /*
       * Después del login correcto
       * enviamos al dashboard.
       */
      router.push("/");

      router.refresh();

    } catch (e) {
      console.error(e);

      setError(
        e instanceof Error
          ? e.message
          : "Error iniciando sesión."
      );

    } finally {
      setCargando(false);
    }
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">

      <div className="w-full max-w-md">

        <div className="mb-8 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">

            <ShieldCheck
              size={28}
            />

          </div>


          <h1 className="mt-5 text-2xl font-semibold">
            MineBlast Control
          </h1>


          <p className="mt-2 text-sm text-slate-400">
            Sistema de gestión y análisis de explosivos
          </p>

        </div>


        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/20">

          <div className="mb-6">

            <p className="text-xs font-medium uppercase tracking-widest text-amber-400">
              Acceso al sistema
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Iniciar sesión
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ingresa tus credenciales para continuar.
            </p>

          </div>


          {error && (

            <div className="mb-5 rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">

              {error}

            </div>

          )}


          <form
            onSubmit={
              iniciarSesion
            }
            className="space-y-5"
          >

            <label className="block">

              <span className="mb-2 block text-xs font-medium text-slate-400">
                Usuario
              </span>


              <div className="relative">

                <User
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />


                <input
                  value={
                    usuario
                  }
                  onChange={(e) =>
                    setUsuario(
                      e.target.value
                    )
                  }
                  autoComplete="username"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-500"
                  placeholder="Ingresa tu usuario"
                />

              </div>

            </label>


            <label className="block">

              <span className="mb-2 block text-xs font-medium text-slate-400">
                Contraseña
              </span>


              <div className="relative">

                <LockKeyhole
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />


                <input
                  type={
                    mostrarPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    password
                  }
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-11 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-500"
                  placeholder="Ingresa tu contraseña"
                />


                <button
                  type="button"
                  onClick={() =>
                    setMostrarPassword(
                      (valor) =>
                        !valor
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                >

                  {mostrarPassword ? (

                    <EyeOff
                      size={17}
                    />

                  ) : (

                    <Eye
                      size={17}
                    />

                  )}

                </button>

              </div>

            </label>


            <button
              type="submit"
              disabled={
                cargando
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <LogIn
                size={17}
              />

              {cargando
                ? "Ingresando..."
                : "Ingresar"}

            </button>

          </form>


          <div className="mt-6 border-t border-slate-800 pt-5">

            <p className="text-xs font-medium text-slate-500">
              Cuentas de validación
            </p>


            <div className="mt-3 space-y-2 text-xs text-slate-500">

              <p>
                Supervisor:
                {" "}
                <span className="text-slate-300">
                  supervisor
                </span>
              </p>

              <p>
                Polvorín:
                {" "}
                <span className="text-slate-300">
                  polvorin
                </span>
              </p>

              <p>
                Jefe de Turno:
                {" "}
                <span className="text-slate-300">
                  jefeturno
                </span>
              </p>


              <p className="pt-1 text-slate-600">
                Contraseña prototipo:
                {" "}
                mineblast123
              </p>

            </div>

          </div>

        </section>


        <p className="mt-6 text-center text-xs text-slate-600">
          Prototipo académico · MineBlast Control
        </p>

      </div>

    </main>
  );
}