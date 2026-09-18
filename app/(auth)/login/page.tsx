import { LoginForm } from "./LoginForm";

export default function LoginPagina() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-extrabold text-tekst-primair">Saldo</h1>
          <p className="text-tekst-secundair mt-1">Jullie gezinsfinanciën, overzichtelijk.</p>
        </div>

        <div className="kaart">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
