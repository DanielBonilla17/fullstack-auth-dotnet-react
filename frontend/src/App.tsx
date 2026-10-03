import { SolarBackground } from './components/SolarBackground';
import { LoginCard } from './components/LoginCard';
import { useState } from 'react';
import type { AuthResponse } from './types/auth';

export default function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(() => localStorage.getItem('username'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setCurrentUser(null);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center">
      {/* 1. Fundo Cósmico 3D */}
      <SolarBackground isModalOpen={showLogin} />

      {/* 2. Botão no Canto Superior Direito (Login ou Usuário Conectado) */}
      {currentUser ? (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-emerald-500/50 backdrop-blur-md text-emerald-300 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Olá, {currentUser}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 hover:text-white font-mono text-xs transition-all cursor-pointer"
            title="Sair da conta"
          >
            Sair
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowLogin(true)}
          className="absolute top-6 right-6 z-20 flex items-center gap-2 px-5 py-2.5 
                     rounded-xl bg-slate-900/70 hover:bg-slate-850/80 backdrop-blur-md 
                     border border-cyan-500/40 hover:border-cyan-400 
                     text-cyan-200 hover:text-white font-mono text-xs tracking-widest font-semibold uppercase 
                     shadow-[0_0_15px_rgba(8,145,178,0.25)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] 
                     transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Login</span>
        </button>
      )}

      {/* 3. Modal de Autenticação */}
      <LoginCard
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={(user: AuthResponse) => {
          setCurrentUser(user.username);
        }}
      />

      {/* 4. Mensagem central de teste */}
      <div className="relative z-10 text-center pointer-events-none select-none">
        <h1 className="text-4xl font-extrabold text-white tracking-wider drop-shadow-md">
          SISTEMA SOLAR 3D
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Arraste com o mouse para girar • Clique e segure um planeta para ver dados
        </p>
      </div>
    </div>
  );
}
