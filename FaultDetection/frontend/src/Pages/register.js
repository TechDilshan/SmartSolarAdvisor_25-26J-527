import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Register = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            toast.warning('Please fill all fields.');
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            toast.warning('Password must be at least 6 characters.');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:5001/api/auth/createUser',
                {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password
                },
                { headers: { 'Content-Type': 'application/json' } }
            );

            console.log(response.data);

            if (response.data.success) {
                // Auto-login after registration
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('userEmail', response.data.user.email);

                toast.success('Registration successful! Redirecting...');

                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 1500);
            } else {
                toast.error(response.data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error.response?.data?.message || 'Error connecting to server.';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-slate-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Create Account</h1>
                    <p className="text-slate-500 mt-2">Join Smart Solar Advisor today</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="block mb-1.5 font-medium text-slate-700 text-sm">Full Name</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full border border-slate-300 pl-10 pr-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block mb-1.5 font-medium text-slate-700 text-sm">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full border border-slate-300 pl-10 pr-3 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block mb-1.5 font-medium text-slate-700 text-sm">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full border border-slate-300 pl-10 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters</p>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block mb-1.5 font-medium text-slate-700 text-sm">Confirm Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="w-full border border-slate-300 pl-10 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors shadow-md mt-2"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Creating Account...
                            </span>
                        ) : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center pt-6 border-t border-slate-100">
                    <p className="text-slate-600 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
