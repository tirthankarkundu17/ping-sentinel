import { Link, useNavigate } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Create account"
      submitLabel="Sign up"
      onSubmit={async (email, password) => {
        await signup(email, password);
        navigate("/dashboard");
      }}
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-semibold text-brand-600 hover:text-brand-500 transition-colors" to="/login">
            Sign in here
          </Link>
        </>
      }
    />
  );
}
