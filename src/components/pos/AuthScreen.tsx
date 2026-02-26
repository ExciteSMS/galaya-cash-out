import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { validatePhone } from "@/lib/mockApi";
import { Delete, Phone, Lock, UserPlus, LogIn } from "lucide-react";

type Mode = "login" | "register";
type Step = "phone" | "pin" | "name";

const AuthScreen = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNumPress = (key: string) => {
    if (step === "phone" && phone.length < 10) {
      setPhone((v) => v + key);
    } else if (step === "pin" && pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      if (newPin.length === 4) {
        if (mode === "login") {
          handleLogin(newPin);
        } else {
          setStep("name");
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === "phone") setPhone((v) => v.slice(0, -1));
    else if (step === "pin") setPin((v) => v.slice(0, -1));
  };

  const handlePhoneConfirm = () => {
    if (!validatePhone(phone)) {
      setError("INVALID NUMBER FORMAT");
      return;
    }
    setError("");
    setStep("pin");
  };

  const handleLogin = async (pinValue: string) => {
    setLoading(true);
    setError("");
    const result = await login(phone, pinValue);
    if (result.error) {
      setError(result.error.toUpperCase());
      setPin("");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError("ENTER BUSINESS NAME");
      return;
    }
    setLoading(true);
    setError("");
    const result = await register(phone, pin, name.trim());
    if (result.error) {
      setError(result.error.toUpperCase());
    }
    setLoading(false);
  };

  const resetFlow = () => {
    setPhone("");
    setPin("");
    setName("");
    setError("");
    setStep("phone");
  };

  return (
    <div className="flex flex-col p-4 min-h-[480px]">
      {/* Logo */}
      <div className="text-center pt-4 pb-4">
        <div className="w-14 h-14 border-2 border-primary rounded-lg mx-auto flex items-center justify-center mb-2">
          <span className="text-primary font-display font-bold text-xl text-glow">G</span>
        </div>
        <h1 className="font-display font-bold text-xl text-primary text-glow">GALAYA POS</h1>
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">Payment Terminal</p>
      </div>

      {/* Mode toggle */}
      <div className="flex border border-border rounded-lg p-0.5 mb-4">
        <button
          onClick={() => { setMode("login"); resetFlow(); }}
          className={`flex-1 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
            mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <LogIn className="w-3.5 h-3.5" /> Sign In
        </button>
        <button
          onClick={() => { setMode("register"); resetFlow(); }}
          className={`flex-1 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
            mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> Register
        </button>
      </div>

      {/* Phone step */}
      {step === "phone" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <Phone className="w-6 h-6 text-primary mb-2" />
            <p className="text-[10px] text-muted-foreground mb-2 font-mono uppercase tracking-wider">Enter Phone Number</p>
            <p className="text-2xl font-bold font-mono text-foreground tracking-widest mb-1">
              {phone || "0XX XXX XXXX"}
            </p>
          </div>

          {error && <p className="text-destructive text-[10px] text-center mb-2 font-mono">{error}</p>}

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
              key === "" ? <div key="empty" /> : (
                <button
                  key={key}
                  onClick={() => key === "⌫" ? handleDelete() : handleNumPress(key)}
                  className="h-12 rounded bg-secondary border border-border text-sm font-mono text-foreground hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all flex items-center justify-center"
                >
                  {key === "⌫" ? <Delete className="w-4 h-4" /> : key}
                </button>
              )
            )}
          </div>

          <button
            onClick={handlePhoneConfirm}
            disabled={phone.length < 10}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-display font-bold text-sm uppercase tracking-wider disabled:opacity-40 transition-all"
          >
            Continue →
          </button>
        </div>
      )}

      {/* PIN step */}
      {step === "pin" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <Lock className="w-6 h-6 text-primary mb-2" />
            <p className="text-[10px] text-muted-foreground mb-1 font-mono uppercase tracking-wider">
              {mode === "login" ? "Enter PIN" : "Create 4-Digit PIN"}
            </p>
            <p className="text-[10px] text-muted-foreground mb-3 font-mono">{phone}</p>
            <div className="flex gap-4 mb-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i < pin.length ? "bg-primary border-primary shadow-[0_0_8px_hsl(160_100%_45%/0.5)]" : "border-border"
                  }`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-destructive text-[10px] text-center mb-2 font-mono">{error}</p>}
          {loading && <p className="text-primary text-[10px] text-center mb-2 animate-pulse font-mono">PROCESSING...</p>}

          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
              key === "" ? <div key="empty" /> : (
                <button
                  key={key}
                  onClick={() => key === "⌫" ? handleDelete() : handleNumPress(key)}
                  disabled={loading}
                  className="h-12 rounded bg-secondary border border-border text-sm font-mono text-foreground hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  {key === "⌫" ? <Delete className="w-4 h-4" /> : key}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => { setStep("phone"); setPin(""); setError(""); }}
            className="text-[10px] text-muted-foreground text-center hover:text-foreground transition-colors font-mono uppercase tracking-wider"
          >
            ← Change Number
          </button>
        </div>
      )}

      {/* Name step (register only) */}
      {step === "name" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary mb-2" />
            <p className="text-[10px] text-muted-foreground mb-3 font-mono uppercase tracking-wider">Business Name</p>
            <input
              type="text"
              placeholder="e.g. John's Shop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-center text-base font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-destructive text-[10px] text-center mb-2 font-mono">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading || !name.trim()}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-display font-bold text-sm uppercase tracking-wider disabled:opacity-40 transition-all"
          >
            {loading ? "Creating..." : "Create Account →"}
          </button>

          <button
            onClick={() => { setStep("pin"); setPin(""); setError(""); }}
            className="text-[10px] text-muted-foreground text-center mt-2 hover:text-foreground transition-colors font-mono uppercase tracking-wider"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
