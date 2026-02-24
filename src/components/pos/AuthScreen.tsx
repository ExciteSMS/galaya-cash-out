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
      setError("Enter a valid Zambian number (e.g. 0961234567)");
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
      setError(result.error);
      setPin("");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError("Enter your business name");
      return;
    }
    setLoading(true);
    setError("");
    const result = await register(phone, pin, name.trim());
    if (result.error) {
      setError(result.error);
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
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col p-6">
      {/* Logo */}
      <div className="text-center pt-8 pb-6">
        <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-3">
          <span className="text-primary-foreground font-display font-bold text-2xl">G</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground">Galaya POS</h1>
        <p className="text-sm text-muted-foreground mt-1">Mobile Payment Solution</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-card border border-border rounded-xl p-1 mb-6">
        <button
          onClick={() => { setMode("login"); resetFlow(); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <LogIn className="w-4 h-4" /> Sign In
        </button>
        <button
          onClick={() => { setMode("register"); resetFlow(); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <UserPlus className="w-4 h-4" /> Register
        </button>
      </div>

      {/* Phone step */}
      {step === "phone" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <Phone className="w-8 h-8 text-primary mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Enter your phone number</p>
            <p className="text-3xl font-bold font-display text-foreground tracking-wider mb-1">
              {phone || "0XX XXX XXXX"}
            </p>
          </div>

          {error && <p className="text-destructive text-xs text-center mb-2">{error}</p>}

          <div className="grid grid-cols-3 gap-2 mb-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
              key === "" ? <div key="empty" /> : (
                <button
                  key={key}
                  onClick={() => key === "⌫" ? handleDelete() : handleNumPress(key)}
                  className="h-14 rounded-xl bg-card border border-border text-lg font-medium text-foreground hover:bg-muted active:scale-95 transition-all flex items-center justify-center"
                >
                  {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
                </button>
              )
            )}
          </div>

          <button
            onClick={handlePhoneConfirm}
            disabled={phone.length < 10}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base disabled:opacity-40 transition-all"
          >
            Continue
          </button>
        </div>
      )}

      {/* PIN step */}
      {step === "pin" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <Lock className="w-8 h-8 text-primary mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              {mode === "login" ? "Enter your PIN" : "Create a 4-digit PIN"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">{phone}</p>
            <div className="flex gap-4 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i < pin.length ? "bg-primary border-primary" : "border-border"
                  }`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-destructive text-xs text-center mb-2">{error}</p>}
          {loading && <p className="text-primary text-xs text-center mb-2 animate-pulse">Please wait...</p>}

          <div className="grid grid-cols-3 gap-2 mb-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key) =>
              key === "" ? <div key="empty" /> : (
                <button
                  key={key}
                  onClick={() => key === "⌫" ? handleDelete() : handleNumPress(key)}
                  disabled={loading}
                  className="h-14 rounded-xl bg-card border border-border text-lg font-medium text-foreground hover:bg-muted active:scale-95 transition-all flex items-center justify-center disabled:opacity-40"
                >
                  {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => { setStep("phone"); setPin(""); setError(""); }}
            className="text-sm text-muted-foreground text-center hover:text-foreground transition-colors"
          >
            ← Change number
          </button>
        </div>
      )}

      {/* Name step (register only) */}
      {step === "name" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <UserPlus className="w-8 h-8 text-primary mb-2" />
            <p className="text-sm text-muted-foreground mb-4">What's your business name?</p>
            <input
              type="text"
              placeholder="e.g. John's Shop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-center text-lg font-display text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-destructive text-xs text-center mb-2">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading || !name.trim()}
            className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-display font-bold text-base disabled:opacity-40 transition-all"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <button
            onClick={() => { setStep("pin"); setPin(""); setError(""); }}
            className="text-sm text-muted-foreground text-center mt-3 hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthScreen;
