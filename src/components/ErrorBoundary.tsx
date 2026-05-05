import * as React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-black/40 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] p-10 text-center relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-red/20 blur-[100px] rounded-full group-hover:bg-accent-red/30 transition-colors" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-accent-red/10 border border-accent-red/20 text-accent-red mb-8 animate-pulse">
                <AlertTriangle size={40} />
              </div>
              
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">
                System <span className="text-accent-red">Anomaly</span>
              </h1>
              
              <p className="text-text-dim text-sm font-medium mb-10 leading-relaxed italic">
                A critical rendering exception has been intercepted. The telemetry stream indicates a disruption in the matrix.
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={this.handleReset}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-accent-red hover:text-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl"
                >
                  <RefreshCcw size={16} />
                  Cold Reboot System
                </button>
                
                <a
                  href="/"
                  className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 text-white border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all transform hover:scale-[1.02] active:scale-95"
                >
                  <Home size={16} />
                  Return to Base
                </a>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 pt-6 border-t border-white/5 text-left">
                  <div className="text-[10px] font-black text-accent-red uppercase tracking-widest mb-2 italic">Error Trace:</div>
                  <pre className="text-[9px] font-mono text-text-dim bg-black/60 p-4 rounded-xl overflow-auto max-h-32 border border-white/5 scrollbar-hide">
                    {this.state.error?.message}
                    {this.state.error?.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
