import { useState } from "react";
import { registerUser, loginUser, getAllUsers } from "./auth";

function SignupPage({ onSignupSuccess, onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isFirstUser = getAllUsers().length === 0;

  function handleSubmit(e) {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError("Please fill in both fields.");
      return;
    }

    const registerResult = registerUser(username, password);

    if (!registerResult.success) {
      setError(registerResult.message);
      return;
    }

    const loginResult = loginUser(username, password);

    if (loginResult.success) {
      setError("");
      onSignupSuccess();
    } else {
      onSwitchToLogin();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <span className="text-xs font-bold tracking-widest text-blue-600">
          TASK MANAGER
        </span>
        <h1 className="text-2xl font-bold mt-2 mb-1 text-slate-900">
          Create Account
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          Sign up to start managing your tasks.
        </p>

        {isFirstUser && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold leading-relaxed">
            You'll be the first account — you'll automatically become the
            Admin.
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password"
              className="w-full h-11 px-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 font-semibold underline"
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;