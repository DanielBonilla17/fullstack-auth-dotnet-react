import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { AuthResponse } from '../types/auth';

interface LoginCardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthResponse) => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({ isOpen, onClose, onSuccess }) => {
  // 1. Estados do formulário
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 2. Estados de feedback da requisição
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado para garantir que o clique para fechar começou E terminou no backdrop
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);

  // Se o modal não estiver aberto, não renderiza nada no DOM
  if (!isOpen) return null;

  // 3. Função de envio (chama a API do backend C#)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isRegistering) {
        // Fluxo de Cadastro
        const res = await apiService.register({ username, password });
        setSuccessMessage(`Conta "${res.username}" criada com sucesso! Faça login.`);
        setIsRegistering(false);
      } else {
        // Fluxo de Login
        const res = await apiService.login({ username, password });
        localStorage.setItem('token', res.token);
        localStorage.setItem('username', res.username);
        setSuccessMessage(`Bem-vindo de volta, ${res.username}!`);

        if (onSuccess) {
          onSuccess(res);
        }

        // Fecha o modal após 1.2s para o usuário ver o feedback de sucesso
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setErrorMessage('Não foi possível conectar ao servidor backend (API offline ou porta 5000 inacessível).');
      } else {
        setErrorMessage(err.message || 'Falha na autenticação. Verifique os dados.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // CAMADA 1: Fundo escurecido (Overlay) com desfoque
    // Só fecha se o clique começou no backdrop E terminou nele (evita fechar ao arrastar seleção/colar)
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setMouseDownOnBackdrop(true);
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnBackdrop) {
          onClose();
        }
        setMouseDownOnBackdrop(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn"
    >
      {/* CAMADA 2: O Card Central (stopPropagation em todos os eventos impede interferência externa) */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-cyan-500/40 p-8 shadow-[0_0_50px_rgba(6,182,212,0.3)] transition-all"
      >
        {/* Botão de Fechar [X] no topo direito do card */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          title="Fechar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Cabeçalho do Card com Ícone e Título */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold font-mono tracking-wider text-white uppercase">
            {isRegistering ? 'Criar Conta' : 'Acesso ao Sistema'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegistering
              ? 'Cadastre suas credenciais para navegar no sistema'
              : 'Entre com usuário e senha para autenticar'}
          </p>
        </div>

        {/* Mensagens de Erro e Sucesso */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo E-mail / Usuário */}
          <div>
            <label className="block text-xs font-mono text-cyan-300 uppercase mb-1.5 tracking-wider">
              E-mail
            </label>
            <div className="relative">
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onPaste={(e) => e.stopPropagation()}
                placeholder="Ex: daniel@email.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>

          {/* Campo Senha com alternador de visibilidade */}
          <div>
            <label className="block text-xs font-mono text-cyan-300 uppercase mb-1.5 tracking-wider">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPaste={(e) => e.stopPropagation()}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 text-xs transition-colors cursor-pointer"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          {/* Botão de Envio (Submit) */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>{isRegistering ? 'Cadastrar Usuário' : 'Entrar no Sistema'}</span>
            )}
          </button>
        </form>

        {/* Rodapé: Alternador entre Login e Registro */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {isRegistering ? (
            <span>
              Já possui conta?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(false);
                  setErrorMessage(null);
                }}
                className="text-cyan-400 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Faça login
              </button>
            </span>
          ) : (
            <span>
              Ainda não tem cadastro?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setErrorMessage(null);
                }}
                className="text-cyan-400 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Criar conta
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
