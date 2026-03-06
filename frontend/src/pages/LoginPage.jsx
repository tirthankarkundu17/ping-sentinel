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
          Not a member?{" "}
          <Link className="font-semibold text-brand-600 hover:text-brand-500 transition-colors" to="/signup">
            Create an account
          </Link>
        </>
      }
    />
  );
}
