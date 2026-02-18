import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.email || !formData.password) {
      toast.warning('Please fill all fields.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5001/api/auth/login',
        formData,
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log(response.data); // Debug log

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userEmail', response.data.user.email);
        toast.success('Login successful! Redirecting...');
        navigate('/', { replace: true });
      } else {
        toast.error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Error connecting to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100">
      <ToastContainer position="top-center" autoClose={3000} />
      <div className="w-full max-w-md bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="text"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 font-medium">Password</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center mt-4">
          Don’t have an account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;


// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import Axios from "axios";
// import Lottie from "lottie-react";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // import loginAnimation from "../Assests/Animation 4.json";

// const Login = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const navigate = useNavigate();

//   const handleSubmit = (e) => {
//     e.preventDefault();

//     Axios.post('http://localhost:5000/api/auth/login', { email, password })
//       .then((response) => {
//         const { data } = response;
//         console.log(data);

//         if (data.status === "success") {
//           const user = data.user;
//           console.log("Login successful!");

//           sessionStorage.setItem("userID", user._id);
//           sessionStorage.setItem("userEmail", user.email);
//           sessionStorage.setItem("token", data.token);

//           toast.success("Login successful!", {
//             position: "top-right",
//             autoClose: 3000,
//           });

//           setTimeout(() => {
//             navigate("/");
//           }, 3000); // delay navigation to allow user to see toast
//         } else {
//           toast.error(data.message || "Incorrect email or password", {
//             position: "top-right",
//             autoClose: 3000,
//           });
//         }
//       })
//       .catch((error) => {
//         console.error("Failed to log in:", error);
//         toast.error("Failed to log in. Please try again.", {
//           position: "top-right",
//           autoClose: 3000,
//         });
//       });
//   };

//   return (
//     <div className="min-h-screen flex">
//       <ToastContainer />

//       {/* Left side animation and tagline */}
//       <div className="hidden md:flex w-1/2 items-center justify-center bg-white-100">
//         <div className="w-full max-w-xl p-4 text-center">
//           {/* <Lottie animationData={loginAnimation} loop={true} /> */}
//           <div className="text-center mt-6 text-sm text-gray-600">
//             <p>
//               <strong>Discover the World, One Country at a Time.</strong>
//               <br />
//               Explore cultures, facts, and stories from every nation,
//               <br />
//               all in one place.
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Right side form */}
//       <div className="flex w-full md:w-1/2 items-center justify-center px-6 py-10">
//         <form
//           onSubmit={handleSubmit}
//           className="w-full max-w-xl bg-white p-10 shadow-2xl rounded-2xl"
//         >
//           <div className="text-center mb-6">
//             <h2 className="text-3xl font-bold mb-2 text-gray-800">
//               Welcome Back to Worldora
//             </h2>
//             <p className="text-gray-600">Log in to your account</p>
//           </div>

//           <div className="mb-6">
//             <label className="block text-gray-700 mb-2 text-sm">
//               Email Address
//             </label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="you@example.com"
//               required
//               className="w-full px-5 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-400 text-base"
//             />
//           </div>

//           <div className="mb-6">
//             <div className="flex justify-between items-center mb-2">
//               <label className="text-gray-700 text-sm">Password</label>
//             </div>
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               placeholder="Enter 6 characters or more"
//               required
//               className="w-full px-5 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-400 text-base"
//             />
//           </div>

//           <div className="mb-6">
//             <label className="flex items-center text-sm">
//               <input type="checkbox" className="mr-2" />
//               Remember me
//             </label>
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-3 text-base rounded-lg hover:bg-blue-700 transition duration-300"
//           >
//             LOGIN
//           </button>
//           <p className="mb-6 text-base text-gray-600">
//             Doesn’t have an account yet?{" "}
//             <a href="/signUp" className="text-blue-500 hover:underline">
//               Sign Up
//             </a>
//           </p>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default Login;