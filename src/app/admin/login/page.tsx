import { Mark, Sun } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="login">
      <Sun className="field-sun" />
      <div className="login-card glass-light">
        <Mark size={72} animated />
        <h1>داشبۆردی کوریەن</h1>
        <p>تەنها بۆ پەسەندکردنی هەواڵەکان.</p>
        <LoginForm />
      </div>
    </main>
  );
}
