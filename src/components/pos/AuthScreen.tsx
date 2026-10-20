import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { validatePhone } from "@/lib/mockApi";
import { Delete, Phone, Lock, UserPlus, LogIn, ShieldCheck } from "lucide-react";
import { requestOtp, resetPin } from "@/lib/authGuard";

type Mode = "login" | "register";
type Step = "phone" | "pin" | "name" | "otp" | "newpin";

const AuthScreen = () => {
  const { login, register } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState("");
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
    } else if (step === "otp" && otp.length < 6) {
      const next = otp + key;
      setOtp(next);
      if (next.length === 6) {
        if (resetting) {
          setStep("newpin");
          setError("");
        } else {
          handleLogin(pin, next);
        }
      }
    } else if (step === "newpin" && newPin.length < 4) {
      const next = newPin + key;
      setNewPin(next);
      if (next.length === 4) handleResetPin(next);
    }
  };

  const handleDelete = () => {
    if (step === "phone") setPhone((v) => v.slice(0, -1));
    else if (step === "pin") setPin((v) => v.slice(0, -1));
    else if (step === "otp") setOtp((v) => v.slice(0, -1));
    else if (step === "newpin") setNewPin((v) => v.slice(0, -1));
  };

  const handlePhoneConfirm = () => {
    if (!validatePhone(phone)) {
      setError("INVALID NUMBER FORMAT");
      return;
    }
    setError("");
    setStep("pin");
  };

  const sendCode = async () => {
    setNotice("");
    const res = await requestOtp(phone);
    if (!res.ok) setError((res.error ?? "Could not send code").toUpperCase());
    else setNotice("CODE SENT BY SMS");
  };

  const handleLogin = async (pinValue: string, otpValue?: string) => {
    setLoading(true);
    setError("");
    const result = await login(phone, pinValue, otpValue);
    if (result.error) {
      if (result.code === "otp_required") {
        setOtp("");
        setStep("otp");
        setResetting(false);
        if (!otpValue) await sendCode();
        else setError(result.error.toUpperCase());
      } else if (result.code === "otp_invalid") {
        setOtp("");
        setError(result.error.toUpperCase());
      } else {
        setError(result.error.toUpperCase());
        setPin("");
        if (step === "otp") { setOtp(""); setStep("pin"); }
      }
    }
    setLoading(false);
  };

  const startReset = async () => {
    setError("");
    setOtp("");
    setNewPin("");
    setResetting(true);
    setStep("otp");
    await sendCode();
  };

  const handleResetPin = async (pinValue: string) => {
    setLoading(true);
    setError("");
    const res = await resetPin(phone, otp, pinValue);
    if (!res.ok) {
      setError((res.error ?? "Could not reset PIN").toUpperCase());
      setOtp("");
      setNewPin("");
      if (res.code === "otp_invalid") setStep("otp");
    } else {
      setResetting(false);
      setOtp("");
      setNewPin("");
      setPin("");
      setStep("pin");
      setNotice("PIN RESET. SIGN IN WITH NEW PIN");
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
    setOtp("");
    setNewPin("");
    setResetting(false);
    setNotice("");
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
        <h1 className="font-display font-bold text-xl text-primary text-glow">GALAPESA POS</h1>
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em]">{t("auth.terminal")}</p>
      </div>

      {/* Mode toggle */}
      <div className="flex border border-border rounded-lg p-0.5 mb-4">
        <button
          onClick={() => { setMode("login"); resetFlow(); }}
          className={`flex-1 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
            mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <LogIn className="w-3.5 h-3.5" /> {t("auth.signIn")}
        </button>
        <button
          onClick={() => { setMode("register"); resetFlow(); }}
          className={`flex-1 py-2 rounded text-xs font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
            mode === "register" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" /> {t("auth.register")}
        </button>
      </div>

      {/* Phone step */}
      {step === "phone" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <Phone className="w-6 h-6 text-primary mb-2" />
            <p className="text-[10px] text-muted-foreground mb-2 font-mono uppercase tracking-wider">{t("auth.enterPhone")}</p>
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
            {t("auth.continue")}
          </button>
        </div>
      )}

      {/* PIN step */}
      {(step === "pin" || step === "otp" || step === "newpin") && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            {step === "otp" ? <ShieldCheck className="w-6 h-6 text-primary mb-2" /> : <Lock className="w-6 h-6 text-primary mb-2" />}
            <p className="text-[10px] text-muted-foreground mb-1 font-mono uppercase tracking-wider">
              {step === "otp" ? "Enter 6-Digit SMS Code" : step === "newpin" ? "Create New 4-Digit PIN" : mode === "login" ? t("auth.enterPin") : t("auth.createPin")}
            </p>
            <p className="text-[10px] text-muted-foreground mb-3 font-mono">{phone}</p>
            <div className="flex gap-4 mb-3">
              {Array.from({ length: step === "otp" ? 6 : 4 }, (_, i) => i).map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i < (step === "otp" ? otp : step === "newpin" ? newPin : pin).length ? "bg-primary border-primary shadow-[0_0_8px_hsl(160_100%_45%/0.5)]" : "border-border"
                  }`}
                />
              ))}
            </div>
          </div>

          {notice && !error && <p className="text-primary text-[10px] text-center mb-2 font-mono">{notice}</p>}
          {error && <p className="text-destructive text-[10px] text-center mb-2 font-mono">{error}</p>}
          {loading && <p className="text-primary text-[10px] text-center mb-2 animate-pulse font-mono">{t("auth.processing")}</p>}

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

          {step === "otp" && (
            <button
              onClick={() => { setError(""); sendCode(); }}
              className="text-[10px] text-primary text-center mb-2 hover:underline font-mono uppercase tracking-wider"
            >
              Resend Code
            </button>
          )}
          {step === "pin" && mode === "login" && (
            <button
              onClick={startReset}
              className="text-[10px] text-primary text-center mb-2 hover:underline font-mono uppercase tracking-wider"
            >
              {t("auth.forgotPin")}
            </button>
          )}
          <button
            onClick={() => { setStep("phone"); setPin(""); setOtp(""); setNewPin(""); setResetting(false); setNotice(""); setError(""); }}
            className="text-[10px] text-muted-foreground text-center hover:text-foreground transition-colors font-mono uppercase tracking-wider"
          >
            {t("auth.changeNumber")}
          </button>
        </div>
      )}

      {/* Name step (register only) */}
      {step === "name" && (
        <div className="flex flex-col flex-1">
          <div className="flex-1 flex flex-col items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary mb-2" />
            <p className="text-[10px] text-muted-foreground mb-3 font-mono uppercase tracking-wider">{t("auth.businessName")}</p>
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
