import { Link, useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Sign in"
      submitLabel="Login"
      onSubmit={async (email, password) => {
        await login(email, password);
        navigate("/dashboard");
      }}
      footer={
        <>
          No account?{" "}
          <Link className="text-brand-700" to="/signup">
            Create one
          </Link>
        </>
      }
    />
  );
}
